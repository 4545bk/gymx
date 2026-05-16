/**
 * Cache Pre-Warm Job — Runs daily at 04:00.
 * Loads ALL active members into Redis pipeline to eliminate cold-start misses.
 * Ensures the first QR scan of the day is a cache hit.
 */
const Member = require('../models/Member');
const { getClient, isAvailable } = require('../config/redis');
const { buildCachePayload } = require('../modules/members/members.service');

const run = async () => {
  if (!isAvailable()) {
    console.warn('[CachePreWarm] Redis unavailable — skipping');
    return;
  }

  console.log('[CachePreWarm] Starting...');
  const startTime = Date.now();

  try {
    const members = await Member.find({ status: 'active' }).lean();
    const client = getClient();
    const pipeline = client.pipeline();

    members.forEach((member) => {
      const payload = buildCachePayload(member);
      pipeline.set(`member:${member.memberId}`, payload, 'EX', 86400); // 24h TTL
    });

    await pipeline.exec();
    const elapsed = Date.now() - startTime;
    console.log(`[CachePreWarm] Cached ${members.length} active members in ${elapsed}ms`);
  } catch (err) {
    console.error('[CachePreWarm] Error:', err.message);
  }
};

module.exports = { run };
