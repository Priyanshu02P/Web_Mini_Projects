const authService = require('../services/auth.service');

function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function me(req, res, next) {
  try {
    const user = authService.getUserById(req.user.id);
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
