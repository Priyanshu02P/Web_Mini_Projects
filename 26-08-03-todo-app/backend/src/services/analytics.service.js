const mongoose = require('mongoose');
const Task = require('../models/task.model');
const Reminder = require('../models/reminder.model');
const DailyStat = require('../models/dailyStat.model');
const reminderScheduler = require('./reminderScheduler');
const { eventBus } = require('../events');

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const HISTORY_DAYS = 90; // enough to compute streaks beyond the visible window

/**
 * Reads the rollups produced by the analytics event handlers, plus a few
 * live counts from the tasks collection (overdue / upcoming reminders).
 */
async function getProductivity(userId, daysParam) {
  const days = Math.min(Math.max(parseInt(daysParam, 10) || 7, 1), 30);
  const uid = new mongoose.Types.ObjectId(userId);
  const today = new Date();
  const todayStart = new Date(dayKey(today));

  const firstKey = dayKey(new Date(today.getTime() - (HISTORY_DAYS - 1) * DAY_MS));
  const [stats, byStatus, overdue, upcomingReminders, unreadReminders] = await Promise.all([
    DailyStat.find({ userId: uid, date: { $gte: firstKey } }).lean(),
    Task.aggregate([{ $match: { userId: uid } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Task.countDocuments({ userId: uid, status: { $ne: 'completed' }, dueDate: { $ne: null, $lt: todayStart } }),
    Task.countDocuments({ userId: uid, status: { $ne: 'completed' }, remindAt: { $gt: today }, reminderFiredAt: null }),
    Reminder.countDocuments({ userId: uid, read: false }),
  ]);

  const byDate = new Map(stats.map((s) => [s.date, s]));
  const series = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i -= 1) {
    const key = dayKey(new Date(today.getTime() - i * DAY_MS));
    const s = byDate.get(key) || {};
    series.push({
      date: key,
      created: s.created || 0,
      completed: Math.max(s.completed || 0, 0),
      remindersFired: s.remindersFired || 0,
      completionMsTotal: Math.max(s.completionMsTotal || 0, 0),
    });
  }

  // Streak: consecutive days with >=1 completion, ending today (or yesterday
  // if nothing has been completed yet today).
  let streak = 0;
  let idx = series.length - 1;
  if (series[idx].completed === 0) idx -= 1;
  while (idx >= 0 && series[idx].completed > 0) {
    streak += 1;
    idx -= 1;
  }

  const window = series.slice(-days);
  const completedInWindow = window.reduce((n, d) => n + d.completed, 0);
  const createdInWindow = window.reduce((n, d) => n + d.created, 0);
  const msInWindow = window.reduce((n, d) => n + d.completionMsTotal, 0);

  const counts = Object.fromEntries(byStatus.map((r) => [r._id, r.n]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const completedNow = counts.completed || 0;

  return {
    windowDays: days,
    totals: {
      tasks: total,
      pending: counts.pending || 0,
      inProgress: counts['in-progress'] || 0,
      completed: completedNow,
      overdue,
    },
    window: {
      created: createdInWindow,
      completed: completedInWindow,
      avgCompletionHours: completedInWindow
        ? Math.round((msInWindow / completedInWindow / 3600000) * 10) / 10
        : null,
      remindersFired: window.reduce((n, d) => n + d.remindersFired, 0),
    },
    completionRate: total ? Math.round((completedNow / total) * 100) : 0,
    streakDays: streak,
    reminders: { upcoming: upcomingReminders, unread: unreadReminders },
    daily: window.map(({ date, created, completed }) => ({ date, created, completed })),
    pipeline: {
      ...eventBus.stats(),
      activeReminderTimers: reminderScheduler.activeCount(),
    },
  };
}

module.exports = { getProductivity };
