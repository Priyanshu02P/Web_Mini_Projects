/**
 * Run with `npm run seed` to (re)create the database from scratch:
 * restores the 5 default users and clears all tasks.
 */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const { MAX_USERS } = require('../config/constants');

const DEFAULT_USERS = Array.from({ length: MAX_USERS }, (_, i) => ({
  name: `User ${i + 1}`,
  email: `user${i + 1}@todo.local`,
  password: `password${i + 1}`,
}));

async function seed() {
  await connectDB();

  await Task.deleteMany({});
  await User.deleteMany({});
  const created = await User.insertMany(DEFAULT_USERS);

  console.log(`Seeded ${created.length} users (tasks cleared):`);
  DEFAULT_USERS.forEach((u) => console.log(`  - ${u.email} / ${u.password}`));

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
