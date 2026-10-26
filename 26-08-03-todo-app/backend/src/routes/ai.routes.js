const express = require('express');
const ctrl = require('../controllers/ai.controller');
const requireAuth = require('../middleware/auth.middleware');
const ApiError = require('../utils/apiError');
const { AI_RATE_LIMIT_PER_MIN } = require('../config/constants');

const router = express.Router();

// Tiny per-user sliding-window limiter: LLM calls cost money and quota.
const hits = new Map(); // userId -> [timestamps]
function aiRateLimit(req, res, next) {
  const now = Date.now();
  const recent = (hits.get(req.user.id) || []).filter((t) => now - t < 60_000);
  if (recent.length >= AI_RATE_LIMIT_PER_MIN) {
    return next(ApiError.tooManyRequests('Too many AI requests - wait a minute and try again'));
  }
  recent.push(now);
  hits.set(req.user.id, recent);
  return next();
}

router.use(requireAuth);

router.get('/status', ctrl.status);
router.post('/parse-task', aiRateLimit, ctrl.parseTask);
router.get('/plan', aiRateLimit, ctrl.plan);

module.exports = router;
