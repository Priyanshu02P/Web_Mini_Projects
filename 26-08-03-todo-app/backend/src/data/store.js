/**
 * store.js
 *
 * Extremely small "database": two JSON files on disk (users.json, tasks.json).
 * This is intentionally simple for a learning project - no ORM, no real DB engine.
 * Swap this module out for a real database layer later without touching
 * controllers/services, since they only ever call the functions exported here.
 */
const fs = require('fs');
const path = require('path');
const { DATA_DIR, MAX_USERS } = require('../config/constants');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

function ensureFile(filePath, defaultContent) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
  }
}

// The 5 supported users. Plain-text passwords ON PURPOSE:
// this project explicitly de-scopes password hashing/security ("just a learning project").
// Do not reuse this pattern anywhere real.
const DEFAULT_USERS = Array.from({ length: MAX_USERS }, (_, i) => ({
  id: `u${i + 1}`,
  name: `User ${i + 1}`,
  email: `user${i + 1}@todo.local`,
  password: `password${i + 1}`,
}));

function init() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  ensureFile(USERS_FILE, DEFAULT_USERS);
  ensureFile(TASKS_FILE, []);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw || '[]');
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  init,
  getUsers: () => readJson(USERS_FILE),
  saveUsers: (users) => writeJson(USERS_FILE, users),
  getTasks: () => readJson(TASKS_FILE),
  saveTasks: (tasks) => writeJson(TASKS_FILE, tasks),
  DEFAULT_USERS,
};
