/**
 * Expiry Status Sync Job — Runs daily at 04:10.
 * Queries members where status='active' AND plan.expiryDate < today.
 * Bulk updates status to 'expired', invalidates Redis keys, inserts alerts.
 */
const Member = require('../models/Member');
const Alert = require('../models/Alert');
const { safeDel } = require('../config/redis');
const { nowLocal } = require('../utils/dateHelpers');

const run = async () => {
  console.log('[ExpirySync] Starting...');

  try {
    const now = nowLocal();

    // Find active members with expired plans
    const expiredMembers = await Member.find({
      status: 'active',
      'plan.expiryDate': { $lt: now },
    }).lean();

    if (expiredMembers.length === 0) {
      console.log('[ExpirySync] No expired members found');
      return;
    }

    // Bulk update status
    const memberIds = expiredMembers.map((m) => m._id);
    await Member.updateMany(
      { _id: { $in: memberIds } },
      { status: 'expired' }
    );

    // Invalidate Redis keys and create alerts
    let alertsCreated = 0;
    for (const member of expiredMembers) {
      await safeDel(`member:${member.memberId}`);

      // Check for existing alert
      const existing = await Alert.findOne({
        type: 'membership-expired',
        subjectRef: member._id,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      });

      if (!existing) {
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
        alertsCreated++;
      }
    }

    console.log(`[ExpirySync] Updated ${expiredMembers.length} members to expired, created ${alertsCreated} alerts`);
  } catch (err) {
    console.error('[ExpirySync] Error:', err.message);
  }
};

module.exports = { run };
