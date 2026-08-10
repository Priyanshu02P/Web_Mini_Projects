const mongoose = require('mongoose');
const User = require('../models/user.model');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');

/**
 * Plain email/password check - NO hashing, NO salting.
 * This is a deliberate, documented simplification for a learning project
 * (see MATURITY.md / README "Auth" section). Never do this in production.
 */
async function login(email, password) {
  if (!email || !password) {
    throw ApiError.badRequest('email and password are required');
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');

  if (!user || user.password !== password) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken({ sub: user.id, email: user.email });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

async function getUserById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.notFound('User not found');
  }
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return { id: user.id, name: user.name, email: user.email };
}

module.exports = { login, getUserById };
