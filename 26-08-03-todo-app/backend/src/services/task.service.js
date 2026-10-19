const mongoose = require('mongoose');
const Task = require('../models/task.model');
const ApiError = require('../utils/apiError');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../config/constants');
const eventBus = require('../events/eventBus');
const EVENTS = require('../events/eventTypes');

/**
 * Keeps completedAt in step with status, and clears reminderFiredAt whenever
 * remindAt is changed so a rescheduled reminder can fire again.
 */
function applyDerivedFields(doc, { previousStatus, previousRemindAt } = {}) {
  if (doc.status === 'completed' && previousStatus !== 'completed') {
    doc.completedAt = new Date();
  } else if (doc.status !== 'completed' && doc.completedAt) {
    doc.completedAt = null;
  }

  const prev = previousRemindAt ? new Date(previousRemindAt).getTime() : null;
  const next = doc.remindAt ? new Date(doc.remindAt).getTime() : null;
  if (prev !== next) doc.reminderFiredAt = null;
}

/** Publishes the right lifecycle events. Never awaited: this is async by design. */
function publishChange(task, { previousStatus, previousCompletedAt, changes }) {
  eventBus.publish(EVENTS.TASK_UPDATED, { task, changes });
  if (task.status === 'completed' && previousStatus !== 'completed') {
    eventBus.publish(EVENTS.TASK_COMPLETED, { task });
  } else if (task.status !== 'completed' && previousStatus === 'completed') {
    eventBus.publish(EVENTS.TASK_REOPENED, { task, previousCompletedAt });
  }
}

function validateStatus(status) {
  if (status !== undefined && !TASK_STATUSES.includes(status)) {
    throw ApiError.badRequest(`status must be one of: ${TASK_STATUSES.join(', ')}`);
  }
}

function validatePriority(priority) {
  if (priority !== undefined && !TASK_PRIORITIES.includes(priority)) {
    throw ApiError.badRequest(`priority must be one of: ${TASK_PRIORITIES.join(', ')}`);
  }
}

/**
 * A malformed ID (not a 24-char hex string) isn't technically "not found",
 * it's a bad request shape - but per the spec we want a clean 404 JSON body
 * for any /tasks/:id lookup that can't resolve to a task, so we treat it
 * the same way here rather than letting Mongoose's raw CastError leak out.
 */
function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.notFound('Task not found');
  }
}

/**
 * List tasks belonging to a single user, with optional filtering/sorting/pagination
 * via query params. Supporting these query params (rather than separate endpoints
 * like /tasks/completed) is itself a Level 2 best practice: one resource URI,
 * behavior varies through standard query parameters, not the path.
 */
async function listTasks(userId, query = {}) {
  const filter = { userId };

  if (query.status) {
    validateStatus(query.status);
    filter.status = query.status;
  }
  if (query.priority) {
    validatePriority(query.priority);
    filter.priority = query.priority;
  }
  if (query.q) {
    const needle = String(query.q).trim();
    if (needle) {
      const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: pattern }, { description: pattern }];
    }
  }

  const sortableFields = ['createdAt', 'updatedAt', 'title', 'status', 'priority', 'dueDate'];
  const sortBy = sortableFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const order = query.order === 'asc' ? 1 : -1;

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  return {
    data: tasks.map((t) => t.toJSON()),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

async function getTask(userId, taskId) {
  assertValidId(taskId);
  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  if (task.userId.toString() !== userId) throw ApiError.forbidden('This task belongs to another user');
  return task.toJSON();
}

async function createTask(userId, payload) {
  const {
    title,
    description = '',
    status = 'pending',
    priority = 'medium',
    dueDate = null,
    remindAt = null,
  } = payload || {};

  const task = new Task({ userId, title, description, status, priority, dueDate, remindAt });
  applyDerivedFields(task);
  await task.save(); // triggers schema validation + the title-trim pre-save hook

  const json = task.toJSON();
  eventBus.publish(EVENTS.TASK_CREATED, { task: json });
  if (json.status === 'completed') eventBus.publish(EVENTS.TASK_COMPLETED, { task: json });
  return json;
}

async function replaceTask(userId, taskId, payload) {
  // PUT = full replacement of the editable fields.
  assertValidId(taskId);
  const {
    title,
    description = '',
    status = 'pending',
    priority = 'medium',
    dueDate = null,
    remindAt = null,
  } = payload || {};

  const existing = await Task.findById(taskId);
  if (!existing) throw ApiError.notFound('Task not found');
  if (existing.userId.toString() !== userId) throw ApiError.forbidden('This task belongs to another user');

  const before = {
    previousStatus: existing.status,
    previousCompletedAt: existing.completedAt,
    previousRemindAt: existing.remindAt,
  };

  existing.title = title;
  existing.description = description;
  existing.status = status;
  existing.priority = priority;
  existing.dueDate = dueDate;
  existing.remindAt = remindAt;
  applyDerivedFields(existing, before);

  await existing.save();

  const json = existing.toJSON();
  publishChange(json, { ...before, changes: { replaced: true } });
  return json;
}

async function patchTask(userId, taskId, changes = {}) {
  // PATCH = partial update, e.g. { "status": "completed" }.
  assertValidId(taskId);

  const existing = await Task.findById(taskId);
  if (!existing) throw ApiError.notFound('Task not found');
  if (existing.userId.toString() !== userId) throw ApiError.forbidden('This task belongs to another user');

  const before = {
    previousStatus: existing.status,
    previousCompletedAt: existing.completedAt,
    previousRemindAt: existing.remindAt,
  };

  const allowed = ['title', 'description', 'status', 'priority', 'dueDate', 'remindAt'];
  const applied = {};
  for (const key of allowed) {
    if (key in changes) {
      existing[key] = changes[key];
      applied[key] = changes[key];
    }
  }
  applyDerivedFields(existing, before);

  await existing.save();

  const json = existing.toJSON();
  publishChange(json, { ...before, changes: applied });
  return json;
}

async function deleteTask(userId, taskId) {
  assertValidId(taskId);

  const existing = await Task.findById(taskId);

  if (!existing) {
    throw ApiError.notFound('Task not found');
  }

  if (existing.userId.toString() !== userId) {
    throw ApiError.forbidden('This task belongs to another user');
  }

  const snapshot = existing.toJSON();
  await Task.deleteOne({ _id: taskId });
  eventBus.publish(EVENTS.TASK_DELETED, { task: snapshot });
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  replaceTask,
  patchTask,
  deleteTask,
};
