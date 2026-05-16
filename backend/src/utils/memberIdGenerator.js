/**
 * MemberId Generator.
 * Generates unique IDs in format MBR-XXXXXXXX (8 uppercase alphanumeric chars).
 * Uses UUID v4, takes first 8 alphanumeric characters, checks for collision.
 */
const { v4: uuidv4 } = require('uuid');
const Member = require('../models/Member');

/**
 * Generate a unique memberId with collision check.
 * Format: MBR-[A-Z0-9]{8}
 */
const generateMemberId = async () => {
  let memberId;
  let exists = true;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while (exists && attempts < MAX_ATTEMPTS) {
    // Generate UUID, remove hyphens, take first 8 chars, uppercase
    const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    memberId = `MBR-${uuid}`;

    // Check for collision (extremely unlikely but required for correctness)
    const existing = await Member.findOne({ memberId }).lean();
    exists = !!existing;
    attempts++;
  }

  if (exists) {
    throw new Error('Failed to generate unique memberId after maximum attempts');
  }

  return memberId;
};

module.exports = { generateMemberId };
