/**
 * Seed the five documented demo accounts, representative tasks, and matching
 * daily analytics rollups. Run with `npm run seed` (also works via Docker:
 * `docker compose exec backend npm run seed`).
 *
 * WARNING: this is a reset-style demo seed. It deletes existing users, tasks,
 * reminders, and daily analytics before rebuilding the demo dataset.
 */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const Reminder = require('../models/reminder.model');
const DailyStat = require('../models/dailyStat.model');
const { MAX_USERS } = require('../config/constants');

const DEFAULT_USERS = Array.from({ length: MAX_USERS }, (_, i) => ({
  name: `User ${i + 1}`,
  email: `user${i + 1}@todo.local`,
  password: `password${i + 1}`,
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

function makeDemoTasks(userId, userIndex, now) {
  const examples = [
    { title: 'Plan the week', status: 'completed', priority: 'high', daysAgo: 6, completedDaysAgo: 5 },
    { title: 'Review project notes', status: 'completed', priority: 'medium', daysAgo: 5, completedDaysAgo: 4 },
    { title: 'Reply to important emails', status: 'completed', priority: 'low', daysAgo: 3, completedDaysAgo: 2 },
    { title: 'Prepare next milestone', status: 'in-progress', priority: 'high', daysAgo: 1 },
    { title: 'Organize workspace', status: 'pending', priority: 'medium', daysAgo: 1 },
    { title: 'Read documentation', status: 'pending', priority: 'low', daysAgo: 0 },
    { title: 'Check upcoming deadlines', status: 'pending', priority: 'high', daysAgo: 0 },
  ];

  return examples.map((example, index) => {
    const createdAt = new Date(now.getTime() - example.daysAgo * DAY_MS - (userIndex * 17 + index) * 60_000);
    const completedAt = example.completedDaysAgo == null
      ? null
      : new Date(now.getTime() - example.completedDaysAgo * DAY_MS - (userIndex * 11 + index) * 60_000);

    return {
      userId,
      title: `${example.title}${userIndex ? '' : ''}`,
      description: 'Sample task seeded for the demo dashboard.',
      status: example.status,
      priority: example.priority,
      dueDate: example.daysAgo === 0 && example.status === 'pending'
        ? new Date(now.getTime() + DAY_MS)
        : null,
      remindAt: null,
      reminderFiredAt: null,
      completedAt,
      createdAt,
      updatedAt: completedAt || createdAt,
    };
  });
}

async function seed() {
  try {
    await connectDB();

    // Clear related collections together so old analytics can't skew the demo.
    await Promise.all([
      Task.deleteMany({}),
      User.deleteMany({}),
      Reminder.deleteMany({}),
      DailyStat.deleteMany({}),
    ]);

    const createdUsers = await User.insertMany(DEFAULT_USERS);
    const now = new Date();
    const allTasks = createdUsers.flatMap((user, index) => makeDemoTasks(user._id, index, now));
    const createdTasks = await Task.insertMany(allTasks);

    // Build the same per-user/per-UTC-day counters maintained by the async event
    // handlers, so the homepage analytics are populated immediately after seed.
    const stats = new Map();
    for (const task of createdTasks) {
      const add = (date, values) => {
        const key = `${task.userId.toString()}:${dayKey(date)}`;
        if (!stats.has(key)) {
          stats.set(key, {
            userId: task.userId,
            date: dayKey(date),
            created: 0,
            completed: 0,
            reopened: 0,
            deleted: 0,
            remindersFired: 0,
            completionMsTotal: 0,
          });
        }
        const row = stats.get(key);
        Object.entries(values).forEach(([field, amount]) => { row[field] += amount; });
      };

      add(task.createdAt, { created: 1 });
      if (task.status === 'completed' && task.completedAt) {
        add(task.completedAt, {
          completed: 1,
          completionMsTotal: Math.max(new Date(task.completedAt) - new Date(task.createdAt), 0),
        });
      }
    }

    await DailyStat.insertMany([...stats.values()]);

    console.log(`Seeded ${createdUsers.length} users, ${createdTasks.length} tasks, and ${stats.size} daily analytics rows:`);
    DEFAULT_USERS.forEach((user) => console.log(`  - ${user.email} / ${user.password}`));
    console.log('Demo tasks and homepage productivity metrics are ready.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

seed();
