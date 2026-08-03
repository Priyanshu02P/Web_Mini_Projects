const path = require('path');

require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'learning-project-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Where runtime data (users + tasks) is persisted as JSON files.
  // Mount this path as a volume in Docker to keep data between restarts.
  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data-volume'),

  // Fixed roster: this learning project supports exactly 5 users.
  MAX_USERS: 5,

  TASK_STATUSES: ['pending', 'in-progress', 'completed'],
  TASK_PRIORITIES: ['low', 'medium', 'high'],
};
