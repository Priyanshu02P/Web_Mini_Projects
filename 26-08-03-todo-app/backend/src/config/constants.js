require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'learning-project-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // MongoDB connection string. In Docker Compose this points at the `mongo`
  // service; locally it defaults to a MongoDB instance on localhost.
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todo-app',

  // --- AI features (Groq, OpenAI-compatible API) ---------------------------
  // Leave GROQ_API_KEY empty to disable AI features; the rest of the app works.
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  GROQ_TIMEOUT_MS: parseInt(process.env.GROQ_TIMEOUT_MS, 10) || 15000,
  AI_RATE_LIMIT_PER_MIN: parseInt(process.env.AI_RATE_LIMIT_PER_MIN, 10) || 15,

  // Fixed roster: this learning project supports exactly 5 users.
  MAX_USERS: 5,

  // Longest single setTimeout the reminder scheduler will arm (Node's limit is
  // ~24.8 days); longer waits are re-armed in chunks.
  MAX_TIMER_MS: 24 * 60 * 60 * 1000,

  TASK_STATUSES: ['pending', 'in-progress', 'completed'],
  TASK_PRIORITIES: ['low', 'medium', 'high'],
};
