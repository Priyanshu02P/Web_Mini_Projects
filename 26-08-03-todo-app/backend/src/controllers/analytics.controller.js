const analyticsService = require('../services/analytics.service');

async function productivity(req, res, next) {
  try {
    const data = await analyticsService.getProductivity(req.user.id, req.query.days);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { productivity };
