/**
 * Background Job Scheduler — node-cron running in-process.
 * All jobs run in Africa/Addis_Ababa timezone.
 */
const cron = require('node-cron');
const { GYM_TIMEZONE } = require('../config/env');
const cachePreWarm = require('./cachePreWarm');
const maintenanceAlerts = require('./maintenanceAlerts');
const expirySync = require('./expirySync');

const initJobs = () => {
  console.log('⏰ Initializing background jobs...');

  // 04:00 daily — Cache pre-warm
  cron.schedule('0 4 * * *', () => {
    console.log('─── Running Cache Pre-Warm ───');
    cachePreWarm.run();
  }, { timezone: GYM_TIMEZONE });

  // 04:05 daily — Maintenance alerts
  cron.schedule('5 4 * * *', () => {
    console.log('─── Running Maintenance Alerts ───');
    maintenanceAlerts.run();
  }, { timezone: GYM_TIMEZONE });

  // 04:10 daily — Expiry status sync
  cron.schedule('10 4 * * *', () => {
    console.log('─── Running Expiry Sync ───');
    expirySync.run();
  }, { timezone: GYM_TIMEZONE });

  // 04:15 daily — Overdue dues detection
  cron.schedule('15 4 * * *', async () => {
    console.log('─── Running Overdue Dues Detection ───');
    try {
      const { markOverdueMembers } = require('../modules/dues/dues.service');
      await markOverdueMembers();
    } catch (err) { console.error('Overdue detection error:', err.message); }
  }, { timezone: GYM_TIMEZONE });

  console.log('✅ Background jobs scheduled (04:00–04:15 ' + GYM_TIMEZONE + ')');
};

module.exports = { initJobs };
