/**
 * Central list of domain events. Producers (services) publish these;
 * consumers (handlers) subscribe. Neither side imports the other.
 */
module.exports = {
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_COMPLETED: 'task.completed',
  TASK_REOPENED: 'task.reopened',
  TASK_DELETED: 'task.deleted',

  REMINDER_SCHEDULED: 'reminder.scheduled',
  REMINDER_DUE: 'reminder.due',

  ANALYTICS_UPDATED: 'analytics.updated',
};
