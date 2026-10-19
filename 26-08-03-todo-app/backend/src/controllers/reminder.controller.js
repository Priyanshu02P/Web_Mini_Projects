const mongoose = require('mongoose');
const Reminder = require('../models/reminder.model');
const ApiError = require('../utils/apiError');
const sseHub = require('../events/sseHub');
const { verifyToken } = require('../utils/jwt');

async function list(req, res, next) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const filter = { userId: req.user.id };
    if (req.query.unread === 'true') filter.read = false;
    const [items, unread] = await Promise.all([
      Reminder.find(filter).sort({ createdAt: -1 }).limit(limit),
      Reminder.countDocuments({ userId: req.user.id, read: false }),
    ]);
    res.status(200).json({ data: items.map((r) => r.toJSON()), meta: { unread } });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw ApiError.notFound('Reminder not found');
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } },
      { new: true }
    );
    if (!reminder) throw ApiError.notFound('Reminder not found');
    res.status(200).json({ data: reminder.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await Reminder.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
    res.status(200).json({ data: { updated: result.modifiedCount } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/events/stream?token=<jwt>
 * Server-Sent Events. Browsers' EventSource can't set an Authorization
 * header, so the JWT is accepted as a query parameter on this route only.
 */
function stream(req, res) {
  let user;
  try {
    const decoded = verifyToken(String(req.query.token || ''));
    user = { id: String(decoded.sub) };
  } catch {
    return res.status(401).json({ error: { status: 401, message: 'Invalid or expired token' } });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: ready\ndata: {}\n\n`);

  sseHub.addClient(user.id, res);
  req.on('close', () => sseHub.removeClient(user.id, res));
}

module.exports = { list, markRead, markAllRead, stream };
