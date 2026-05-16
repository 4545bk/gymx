/**
 * Check-In Controller.
 */
const checkinService = require('./checkin.service');
const sseManager = require('../../utils/sseManager');

/**
 * POST /api/v1/checkin — Scanner calls this.
 * No JWT middleware — only scanner API key (handled by scannerAuth middleware).
 */
const checkin = async (req, res, next) => {
  try {
    const { memberId } = req.body;
    const result = await checkinService.processCheckin(memberId);

    res.status(result.httpStatus).json({
      success: true,
      data: {
        result: result.result,
        denyReason: result.denyReason || null,
        message: result.message || null,
        member: result.member || null,
        checkedInAt: result.checkedInAt || null,
      },
    });
  } catch (err) {
    // On DB/service error, return 503 instead of 500
    if (err.name === 'MongoServerError' || err.name === 'MongooseError') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'System temporarily unavailable',
        },
      });
    }
    next(err);
  }
};

/**
 * GET /api/v1/checkin/stream — SSE endpoint for live check-in feed.
 */
const stream = (req, res) => {
  sseManager.addClient(req, res);
};

/**
 * GET /api/v1/checkin/today — Today's check-in log.
 */
const today = async (req, res, next) => {
  try {
    const result = await checkinService.getTodayLog(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = { checkin, stream, today };
