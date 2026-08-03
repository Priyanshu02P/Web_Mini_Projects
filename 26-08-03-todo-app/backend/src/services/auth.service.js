const store = require('../data/store');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');

/**
 * Plain email/password check - NO hashing, NO salting.
 * This is a deliberate, documented simplification for a learning project
 * (see MATURITY.md / README "Auth" section). Never do this in production.
 */
function login(email, password) {
  if (!email || !password) {
    throw ApiError.badRequest('email and password are required');
  }

  const users = store.getUsers();
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

  if (!user || user.password !== password) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken({ sub: user.id, email: user.email });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

function getUserById(id) {
  const user = store.getUsers().find((u) => u.id === id);
  if (!user) throw ApiError.notFound('User not found');
  return { id: user.id, name: user.name, email: user.email };
}

module.exports = { login, getUserById };
