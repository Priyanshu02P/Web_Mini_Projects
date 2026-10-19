/**
 * Reminder handlers
 *  - Task lifecycle events  -> keep the scheduler's timers in sync.
 *  - REMINDER_DUE           -> persist a Reminder, mark the task, push via SSE.
 */
const Task = require('../../models/task.model');
const Reminder = require('../../models/reminder.model');
const scheduler = require('../../services/reminderScheduler');
const sseHub = require('../sseHub');
const EVENTS = require('../eventTypes');

async function onTaskChanged(event) {
  scheduler.sync(event.payload.task);
}

async function onTaskDeleted(event) {
  scheduler.cancel(event.payload.task.id);
}

async function onReminderDue(event) {
  const { taskId, userId } = event.payload;

  // Atomic claim: only one delivery per reminder, even if this handler is
  // retried or the event is delivered twice.
  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      reminderFiredAt: null,
      remindAt: { $ne: null, $lte: new Date(Date.now() + 1000) },
      status: { $ne: 'completed' },
    },
    { $set: { reminderFiredAt: new Date() } },
    { new: true }
  );
  if (!task) return; // completed, deleted, rescheduled or already fired

  const reminder = await Reminder.create({
    userId,
    taskId,
    title: task.title,
    message: `Reminder: “${task.title}”${task.dueDate ? ' is coming up' : ''}`,
    remindAt: task.remindAt,
  });

  sseHub.sendTo(userId, 'reminder', reminder.toJSON());
}

function register(bus) {
  bus.subscribe(EVENTS.TASK_CREATED, 'reminder.sync', onTaskChanged);
  bus.subscribe(EVENTS.TASK_UPDATED, 'reminder.sync', onTaskChanged);
  bus.subscribe(EVENTS.TASK_COMPLETED, 'reminder.sync', onTaskChanged);
  bus.subscribe(EVENTS.TASK_REOPENED, 'reminder.sync', onTaskChanged);
  bus.subscribe(EVENTS.TASK_DELETED, 'reminder.cancel', onTaskDeleted);
  bus.subscribe(EVENTS.REMINDER_DUE, 'reminder.deliver', onReminderDue);
}

module.exports = { register };
