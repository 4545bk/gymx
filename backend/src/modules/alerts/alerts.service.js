/**
 * Alerts Service — Internal notification system.
 */
const Alert = require('../../models/Alert');

const listAlerts = async (query, staffRole) => {
  const { isRead, type, severity, page = 1, limit = 20 } = query;
  const filter = { visibleTo: staffRole };

  if (isRead !== undefined) filter.isRead = isRead === 'true';
  if (type) filter.type = type;
  if (severity) filter.severity = severity;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [alerts, total] = await Promise.all([
    Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Alert.countDocuments(filter),
  ]);

  const data = alerts.map((a) => ({
    id: a._id,
    type: a.type,
    severity: a.severity,
    message: a.message,
    subjectType: a.subjectType,
    subjectRef: a.subjectRef,
    subjectName: a.subjectName,
    isRead: a.isRead,
    createdAt: a.createdAt,
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

const getUnreadCount = async (staffRole) => {
  const count = await Alert.countDocuments({ visibleTo: staffRole, isRead: false });
  return { unread: count };
};

const markAsRead = async (alertId, staffId) => {
  const alert = await Alert.findByIdAndUpdate(
    alertId,
    { isRead: true, $addToSet: { readBy: staffId } },
    { new: true }
  );
  if (!alert) {
    const err = new Error('Alert not found');
    err.statusCode = 404;
    err.code = 'ALERT_NOT_FOUND';
    throw err;
  }
  return { id: alert._id, isRead: true };
};

const dismissAlert = async (alertId) => {
  const alert = await Alert.findByIdAndDelete(alertId);
  if (!alert) {
    const err = new Error('Alert not found');
    err.statusCode = 404;
    err.code = 'ALERT_NOT_FOUND';
    throw err;
  }
  return { id: alertId, dismissed: true };
};

module.exports = { listAlerts, getUnreadCount, markAsRead, dismissAlert };
