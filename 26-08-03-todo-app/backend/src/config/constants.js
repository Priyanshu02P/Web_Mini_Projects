require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'learning-project-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // MongoDB connection string. In Docker Compose this points at the `mongo`
  // service; locally it defaults to a MongoDB instance on localhost.
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todo-app',

  // Fixed roster: this learning project supports exactly 5 users.
  MAX_USERS: 5,

  // Longest single setTimeout the reminder scheduler will arm (Node's limit is
  // ~24.8 days); longer waits are re-armed in chunks.
  MAX_TIMER_MS: 24 * 60 * 60 * 1000,

  TASK_STATUSES: ['pending', 'in-progress', 'completed'],
  TASK_PRIORITIES: ['low', 'medium', 'high'],
};
