/**
 * API Router — mounts all module route groups under /api/v1.
 */
const express = require('express');
const router = express.Router();

// Module routes
const authRoutes = require('./modules/auth/auth.routes');
const memberRoutes = require('./modules/members/members.routes');
const checkinRoutes = require('./modules/checkin/checkin.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const staffRoutes = require('./modules/staff/staff.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const alertRoutes = require('./modules/alerts/alerts.routes');
const reportRoutes = require('./modules/reports/reports.routes');
const productRoutes = require('./modules/products/products.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const duesRoutes = require('./modules/dues/dues.routes');

router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/checkin', checkinRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/staff', staffRoutes);
router.use('/payments', financeRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/alerts', alertRoutes);
router.use('/reports', reportRoutes);
router.use('/products', productRoutes);
router.use('/sales', salesRoutes);
router.use('/audit', auditRoutes);
router.use('/settings', settingsRoutes);
router.use('/dues', duesRoutes);

module.exports = router;
