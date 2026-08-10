const mongoose = require('mongoose');
const Task = require('../models/task.model');
const ApiError = require('../utils/apiError');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../config/constants');

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
  const { title, description = '', status = 'pending', priority = 'medium', dueDate = null } =
    payload || {};

  const task = new Task({ userId, title, description, status, priority, dueDate });
  await task.save(); // triggers schema validation + the title-trim pre-save hook
  return task.toJSON();
}

async function replaceTask(userId, taskId, payload) {
  // PUT = full replacement of the editable fields.
  assertValidId(taskId);
  const { title, description = '', status = 'pending', priority = 'medium', dueDate = null } =
    payload || {};

  const existing = await Task.findById(taskId);
  if (!existing) throw ApiError.notFound('Task not found');
  if (existing.userId.toString() !== userId) throw ApiError.forbidden('This task belongs to another user');

  existing.title = title;
  existing.description = description;
  existing.status = status;
  existing.priority = priority;
  existing.dueDate = dueDate;

  await existing.save();
  return existing.toJSON();
}

async function patchTask(userId, taskId, changes = {}) {
  // PATCH = partial update, e.g. { "status": "completed" }.
  assertValidId(taskId);

  const existing = await Task.findById(taskId);
  if (!existing) throw ApiError.notFound('Task not found');
  if (existing.userId.toString() !== userId) throw ApiError.forbidden('This task belongs to another user');

  const allowed = ['title', 'description', 'status', 'priority', 'dueDate'];
  for (const key of allowed) {
    if (key in changes) existing[key] = changes[key];
  }

  await existing.save();
  return existing.toJSON();
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

  await Task.deleteOne({ _id: taskId });
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  replaceTask,
  patchTask,
  deleteTask,
};
