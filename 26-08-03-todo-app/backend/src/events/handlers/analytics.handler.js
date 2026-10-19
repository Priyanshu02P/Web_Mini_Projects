/**
 * Analytics handlers — turn task/reminder events into per-day counters.
 * Runs asynchronously, off the request path. Each handler is a single atomic
 * $inc upsert, then announces ANALYTICS_UPDATED so open dashboards refresh.
 */
const DailyStat = require('../../models/dailyStat.model');
const EVENTS = require('../eventTypes');

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

async function bump(userId, date, inc) {
  await DailyStat.updateOne(
    { userId, date: dayKey(date) },
    { $inc: inc },
    { upsert: true }
  );
}

function done(bus, userId) {
  bus.publish(EVENTS.ANALYTICS_UPDATED, { userId: String(userId) });
}

function register(bus) {
  bus.subscribe(EVENTS.TASK_CREATED, 'analytics.created', async ({ payload }) => {
    const { task } = payload;
    await bump(task.userId, task.createdAt, { created: 1 });
    done(bus, task.userId);
  });

  bus.subscribe(EVENTS.TASK_COMPLETED, 'analytics.completed', async ({ payload }) => {
    const { task } = payload;
    const ms = new Date(task.completedAt) - new Date(task.createdAt);
    await bump(task.userId, task.completedAt, { completed: 1, completionMsTotal: Math.max(ms, 0) });
    done(bus, task.userId);
  });

  bus.subscribe(EVENTS.TASK_REOPENED, 'analytics.reopened', async ({ payload }) => {
    const { task, previousCompletedAt } = payload;
    if (previousCompletedAt) {
      // Undo the earlier completion so the numbers stay honest.
      const ms = new Date(previousCompletedAt) - new Date(task.createdAt);
      await bump(task.userId, previousCompletedAt, { completed: -1, completionMsTotal: -Math.max(ms, 0) });
    }
    await bump(task.userId, new Date(), { reopened: 1 });
    done(bus, task.userId);
  });

  bus.subscribe(EVENTS.TASK_DELETED, 'analytics.deleted', async ({ payload }) => {
    const { task } = payload;
    await bump(task.userId, new Date(), { deleted: 1 });
    done(bus, task.userId);
  });

  bus.subscribe(EVENTS.REMINDER_DUE, 'analytics.reminders', async ({ payload }) => {
    await bump(payload.userId, new Date(), { remindersFired: 1 });
    done(bus, payload.userId);
  });
}

module.exports = { register };
