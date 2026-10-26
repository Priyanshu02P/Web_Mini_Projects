const aiService = require('../services/ai.service');
const { isConfigured } = require('../services/groq.client');

function status(req, res) {
  res.status(200).json({ data: { enabled: isConfigured() } });
}

async function parseTask(req, res, next) {
  try {
    const data = await aiService.parseTask(req.body?.text, { timezone: req.body?.timezone });
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

async function plan(req, res, next) {
  try {
    const data = await aiService.planDay(req.user.id, { timezone: req.query.timezone });
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { status, parseTask, plan };
