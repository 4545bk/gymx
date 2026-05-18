/**
 * Check-In Service — The most latency-critical piece of the entire system.
 * 
 * Implements the 12-step QR check-in flow from the specification.
 * Target: < 200ms on cache hit, < 1 second total including network.
 * 
 * Flow:
 *   1. Scanner sends memberId → 2. Validate API key (middleware) →
 *   3. Validate format → 4. Redis lookup → 5. MongoDB fallback →
 *   6. Check status → 7. Check expiry (timezone-aware) →
 *   8. Check allowed days → 9. Optimistic attendance insert →
 *   10. Post-grant expiry warning (async) → 11. SSE emit → 12. Return
 */
const Member = require('../../models/Member');
const Attendance = require('../../models/Attendance');
const Alert = require('../../models/Alert');
const { safeGet, safeSet, safeDel } = require('../../config/redis');
const { getTodayDateString, getTodayWeekday, getDaysUntilExpiry, isExpired, getNextAllowedDay } = require('../../utils/dateHelpers');
const { broadcast } = require('../../utils/sseManager');
const { buildCachePayload } = require('../members/members.service');

// Regex for memberId format validation (Step 3)
const MEMBER_ID_REGEX = /^MBR-[A-Z0-9]{8}$/;

/**
 * Main check-in function — the 12-step flow.
 * Steps 1 and 2 are handled by the route and scannerAuth middleware.
 */
const processCheckin = async (memberId) => {
  const todayDate = getTodayDateString();

  // ─── Step 3: Validate memberId format ─────────────────────
  if (!MEMBER_ID_REGEX.test(memberId)) {
    return {
      httpStatus: 400,
      result: 'denied',
      denyReason: 'invalid-format',
      message: 'Invalid QR code format',
    };
  }

  // ─── Step 4: Redis cache lookup ───────────────────────────
  let member = null;
  const cached = await safeGet(`member:${memberId}`);

  if (cached) {
    // Cache hit
    try {
      member = JSON.parse(cached);
    } catch (e) {
      member = null; // Corrupted cache — fall through to MongoDB
    }
  }

  // ─── Step 5: MongoDB fallback (cache miss) ────────────────
  if (!member) {
    const dbMember = await Member.findOne({ memberId }).lean();

    if (!dbMember) {
      // Unknown member — write denied attendance and return
      // Don't write attendance for unknown IDs (no memberRef available)
      return {
        httpStatus: 200,
        result: 'denied',
        denyReason: 'unknown-id',
        message: 'Unknown QR code — member not found',
      };
    }

    // Build cache payload and store in Redis
    member = {
      _id: dbMember._id,
      memberId: dbMember.memberId,
      fullName: dbMember.fullName,
      photoUrl: dbMember.photoUrl || null,
      status: dbMember.status,
      plan: {
        type: dbMember.plan.type,
        allowedDays: dbMember.plan.allowedDays,
        expiryDate: dbMember.plan.expiryDate,
      },
    };

    // Seed cache for next time (24h TTL)
    await safeSet(`member:${memberId}`, JSON.stringify(member), 86400);
  }

  // ─── Step 6: Check membership status ──────────────────────
  if (member.status !== 'active') {
    // Write denied attendance record
    await writeDeniedAttendance(member, todayDate, member.status);

    return {
      httpStatus: 200,
      result: 'denied',
      denyReason: member.status, // 'expired', 'suspended', or 'frozen'
      message: `Membership is ${member.status}`,
      member: { fullName: member.fullName, photoUrl: member.photoUrl || null },
    };
  }

  // ─── Step 7: Check expiry date (timezone-aware) ───────────
  if (isExpired(member.plan.expiryDate)) {
    // Write denied attendance
    await writeDeniedAttendance(member, todayDate, 'expired');

    // Update member status to expired in MongoDB (async — don't delay response)
    setImmediate(async () => {
      try {
        await Member.findByIdAndUpdate(member._id, { status: 'expired' });
        await safeDel(`member:${memberId}`);
        // Queue membership-expired alert
        await Alert.create({
          type: 'membership-expired',
          severity: 'critical',
          subjectType: 'member',
          subjectRef: member._id,
          subjectName: member.fullName,
          message: `${member.fullName}'s membership has expired`,
          visibleTo: ['owner', 'receptionist'],
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        });
      } catch (err) {
        console.error('Post-expiry update error:', err.message);
      }
    });

    return {
      httpStatus: 200,
      result: 'denied',
      denyReason: 'expired',
      message: `Membership expired on ${new Date(member.plan.expiryDate).toISOString().split('T')[0]}`,
      member: { fullName: member.fullName, photoUrl: member.photoUrl || null },
    };
  }

  // ─── Step 8: Check allowed days (3-day plan only) ─────────
  if (member.plan.type === '3-day') {
    const todayWeekday = getTodayWeekday();
    if (!member.plan.allowedDays || !member.plan.allowedDays.includes(todayWeekday)) {
      // Write denied attendance
      await writeDeniedAttendance(member, todayDate, 'wrong-day');

      const nextDay = getNextAllowedDay(member.plan.allowedDays || []);
      return {
        httpStatus: 200,
        result: 'denied',
        denyReason: 'wrong-day',
        message: `3-day plan. Next allowed day: ${nextDay}`,
        member: { fullName: member.fullName, photoUrl: member.photoUrl || null },
      };
    }
  }

  // ─── Step 9: Optimistic attendance insert ─────────────────
  // Attempt direct insert. If duplicate key error (11000), member already checked in.
  try {
    const attendance = await Attendance.create({
      memberId: member.memberId,
      memberRef: member._id,
      checkedInAt: new Date(),
      date: todayDate,
      status: 'granted',
      denyReason: null,
      planSnapshot: {
        type: member.plan.type,
        expiryDate: member.plan.expiryDate,
      },
    });

    // ─── Step 10: Post-grant expiry warning (async) ───────
    const daysUntilExpiry = getDaysUntilExpiry(member.plan.expiryDate);
    if (daysUntilExpiry <= 5 && daysUntilExpiry >= 0) {
      setImmediate(async () => {
        try {
          // Check if alert already exists this week
          const existingAlert = await Alert.findOne({
            type: 'membership-expiring',
            subjectRef: member._id,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          });
          if (!existingAlert) {
            await Alert.create({
              type: 'membership-expiring',
              severity: 'warning',
              subjectType: 'member',
              subjectRef: member._id,
              subjectName: member.fullName,
              message: `${member.fullName}'s membership expires in ${daysUntilExpiry} days`,
              visibleTo: ['owner', 'receptionist'],
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            });
          }
        } catch (err) {
          console.error('Expiry warning alert error:', err.message);
        }
      });
    }

    // ─── Step 11: Emit SSE event ──────────────────────────
    broadcast({
      result: 'granted',
      fullName: member.fullName,
      memberId: member.memberId,
      planType: member.plan.type,
      checkedInAt: attendance.checkedInAt.toISOString(),
      expiringSoon: daysUntilExpiry <= 5,
    });

    // ─── Step 12: Return granted response ─────────────────
    return {
      httpStatus: 200,
      result: 'granted',
      member: {
        fullName: member.fullName,
        photoUrl: member.photoUrl || null,
        planType: member.plan.type,
        expiryDate: new Date(member.plan.expiryDate).toISOString().split('T')[0],
        expiringSoon: daysUntilExpiry <= 5,
      },
      checkedInAt: attendance.checkedInAt.toISOString(),
    };

  } catch (err) {
    // Duplicate key error (11000) — already checked in today
    if (err.code === 11000) {
      const existing = await Attendance.findOne({
        memberId: member.memberId,
        date: todayDate,
        status: 'granted',
      }).lean();

      // Emit SSE for duplicate attempt
      broadcast({
        result: 'denied',
        fullName: member.fullName,
        memberId: member.memberId,
        denyReason: 'duplicate',
        checkedInAt: new Date().toISOString(),
      });

      return {
        httpStatus: 200,
        result: 'denied',
        denyReason: 'duplicate',
        message: `Already checked in today at ${existing ? existing.checkedInAt.toISOString() : 'earlier'}`,
        member: { fullName: member.fullName, photoUrl: member.photoUrl || null },
      };
    }
    throw err; // Re-throw unexpected errors
  }
};

/**
 * Write a denied attendance record.
 * All denied scans are recorded for audit trail.
 */
const writeDeniedAttendance = async (member, todayDate, denyReason) => {
  try {
    await Attendance.create({
      memberId: member.memberId,
      memberRef: member._id,
      checkedInAt: new Date(),
      date: todayDate,
      status: 'denied',
      denyReason,
      planSnapshot: member.plan ? {
        type: member.plan.type,
        expiryDate: member.plan.expiryDate,
      } : null,
    });
  } catch (err) {
    // If duplicate key error, a record already exists for today — that's fine
    if (err.code !== 11000) {
      console.error('Failed to write denied attendance:', err.message);
    }
  }
};

/**
 * Get today's check-in log.
 */
const getTodayLog = async (query) => {
  const todayDate = getTodayDateString();
  const { page = 1, limit = 20, result } = query;

  const filter = { date: todayDate };
  if (result) filter.status = result;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .sort({ checkedInAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  // Enrich with member names
  const Member = require('../../models/Member');
  const memberIds = [...new Set(records.map((r) => r.memberId))];
  const members = await Member.find({ memberId: { $in: memberIds } })
    .select('memberId fullName plan.type')
    .lean();
  const memberMap = {};
  members.forEach((m) => { memberMap[m.memberId] = m; });

  const data = records.map((r) => ({
    memberId: r.memberId,
    fullName: memberMap[r.memberId]?.fullName || 'Unknown',
    result: r.status,
    denyReason: r.denyReason,
    checkedInAt: r.checkedInAt,
    planType: memberMap[r.memberId]?.plan?.type || null,
  }));

  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

module.exports = { processCheckin, getTodayLog };
