/**
 * Maintenance Alerts Job — Runs daily at 04:05.
 * Queries inventory where nextServiceDate <= today + 7 days AND condition != 'retired'.
 * Creates maintenance-due alerts if one doesn't already exist this week.
 */
const Inventory = require('../models/Inventory');
const Alert = require('../models/Alert');
const { addDays } = require('date-fns');
const { nowLocal } = require('../utils/dateHelpers');

const run = async () => {
  console.log('[MaintenanceAlerts] Starting...');

  try {
    const now = nowLocal();
    const sevenDaysFromNow = addDays(now, 7);

    const dueSoon = await Inventory.find({
      'maintenance.nextServiceDate': { $lte: sevenDaysFromNow },
      condition: { $ne: 'retired' },
    }).lean();

    let created = 0;
    for (const item of dueSoon) {
      // Check if alert already exists this week
      const oneWeekAgo = addDays(now, -7);
      const existing = await Alert.findOne({
        type: 'maintenance-due',
        subjectRef: item._id,
        createdAt: { $gte: oneWeekAgo },
      });

      if (!existing) {
        const daysUntil = Math.ceil(
          (new Date(item.maintenance.nextServiceDate) - now) / (1000 * 60 * 60 * 24)
        );
        await Alert.create({
          type: 'maintenance-due',
          severity: daysUntil <= 0 ? 'critical' : 'warning',
          subjectType: 'equipment',
          subjectRef: item._id,
          subjectName: item.name,
          message: daysUntil <= 0
            ? `${item.name} is overdue for service`
            : `${item.name} is due for service in ${daysUntil} days`,
          visibleTo: ['owner', 'receptionist'],
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day TTL
        });
        created++;
      }
    }

    console.log(`[MaintenanceAlerts] Found ${dueSoon.length} items due, created ${created} new alerts`);
  } catch (err) {
    console.error('[MaintenanceAlerts] Error:', err.message);
  }
};

module.exports = { run };
