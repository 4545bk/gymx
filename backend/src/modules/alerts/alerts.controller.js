const alertsService = require('./alerts.service');

const list = async (req, res, next) => {
  try {
    const result = await alertsService.listAlerts(req.query, req.staff.role);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const count = async (req, res, next) => {
  try {
    const result = await alertsService.getUnreadCount(req.staff.role);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    const result = await alertsService.markAsRead(req.params.alertId, req.staff.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const dismiss = async (req, res, next) => {
  try {
    const result = await alertsService.dismissAlert(req.params.alertId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = { list, count, markRead, dismiss };
