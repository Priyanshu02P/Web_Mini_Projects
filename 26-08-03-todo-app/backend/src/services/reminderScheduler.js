/**
 * reminderScheduler.js — event-driven reminder timers.
 *
 * No polling loop: each task with a future `remindAt` gets exactly one
 * in-memory timer. When it elapses, a REMINDER_DUE event is published and the
 * handlers do the rest. Timers are (re)built from MongoDB on startup, so a
 * server restart never loses a reminder.
 */
const Task = require('../models/task.model');
const eventBus = require('../events/eventBus');
const EVENTS = require('../events/eventTypes');
const { MAX_TIMER_MS } = require('../config/constants');

const timers = new Map(); // taskId -> Timeout

function cancel(taskId) {
  const key = String(taskId);
  const t = timers.get(key);
  if (t) {
    clearTimeout(t);
    timers.delete(key);
  }
}

function arm(taskId, userId, remindAt) {
  const key = String(taskId);
  cancel(key);

  const wait = new Date(remindAt).getTime() - Date.now();
  const delay = Math.min(Math.max(wait, 0), MAX_TIMER_MS);

  const timer = setTimeout(() => {
    timers.delete(key);
    if (wait > MAX_TIMER_MS) {
      // Still far away: re-arm for the remainder.
      arm(taskId, userId, remindAt);
      return;
    }
    eventBus.publish(EVENTS.REMINDER_DUE, {
      taskId: key,
      userId: String(userId),
      remindAt: new Date(remindAt).toISOString(),
    });
  }, delay);
  timer.unref?.();
  timers.set(key, timer);
}

/** Make the timer for a task match its current state. */
function sync(task) {
  const needsReminder =
    task.remindAt && !task.reminderFiredAt && task.status !== 'completed';

  if (!needsReminder) {
    cancel(task.id);
    return false;
  }
  arm(task.id, task.userId, task.remindAt);
  eventBus.publish(EVENTS.REMINDER_SCHEDULED, { taskId: task.id, userId: task.userId });
  return true;
}

/** Called once after the DB connects: re-arm every pending reminder. */
async function rehydrate() {
  const pending = await Task.find({
    remindAt: { $ne: null },
    reminderFiredAt: null,
    status: { $ne: 'completed' },
  });
  pending.forEach((t) => arm(t.id, t.userId, t.remindAt));
  console.log(`[reminders] re-armed ${pending.length} pending reminder(s)`);
  return pending.length;
}

function activeCount() {
  return timers.size;
}

module.exports = { sync, cancel, rehydrate, activeCount };
