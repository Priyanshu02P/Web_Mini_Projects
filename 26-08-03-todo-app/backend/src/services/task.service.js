const crypto = require('crypto');
const store = require('../data/store');
const ApiError = require('../utils/apiError');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../config/constants');

const { appendLog }= require("./log.service");

function newId() {
  return crypto.randomBytes(8).toString('hex');
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
 * List tasks belonging to a single user, with optional filtering/sorting/pagination
 * via query params. Supporting these query params (rather than separate endpoints
 * like /tasks/completed) is itself a Level 2 best practice: one resource URI,
 * behavior varies through standard query parameters, not the path.
 */
function listTasks(userId, query = {}) {
  let tasks = store.getTasks().filter((t) => t.userId === userId);

  if (query.status) {
    validateStatus(query.status);
    tasks = tasks.filter((t) => t.status === query.status);
  }
  if (query.priority) {
    validatePriority(query.priority);
    tasks = tasks.filter((t) => t.priority === query.priority);
  }
  if (query.q) {
    const needle = String(query.q).toLowerCase();
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        (t.description || '').toLowerCase().includes(needle)
    );
  }

  const sortBy = query.sortBy || 'createdAt';
  const order = query.order === 'asc' ? 1 : -1;
  tasks = [...tasks].sort((a, b) => {
    if (a[sortBy] < b[sortBy]) return -1 * order;
    if (a[sortBy] > b[sortBy]) return 1 * order;
    return 0;
  });

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const start = (page - 1) * limit;
  const paged = tasks.slice(start, start + limit);

  return {
    data: paged,
    meta: {
      total: tasks.length,
      page,
      limit,
      totalPages: Math.max(Math.ceil(tasks.length / limit), 1),
    },
  };
}

function getTask(userId, taskId) {
  const task = store.getTasks().find((t) => t.id === taskId);
  if (!task) throw ApiError.notFound('Task not found');
  if (task.userId !== userId) throw ApiError.forbidden('This task belongs to another user');
  return task;
}

function createTask(userId, payload) {
  const { title, description = '', status = 'pending', priority = 'medium', dueDate = null } =
    payload;

  if (!title || !title.trim()) {
    throw ApiError.badRequest('title is required');
  }
  validateStatus(status);
  validatePriority(priority);

  const now = new Date().toISOString();
  const task = {
    id: newId(),
    userId,
    title: title.trim(),
    description,
    status,
    priority,
    dueDate,
    createdAt: now,
    updatedAt: now,
  };

  const tasks = store.getTasks();
  tasks.push(task);
  store.saveTasks(tasks);
  return task;
}

function replaceTask(userId, taskId, payload) {
  // PUT = full replacement of the editable fields.
  const { title, description = '', status = 'pending', priority = 'medium', dueDate = null } =
    payload;

  if (!title || !title.trim()) {
    throw ApiError.badRequest('title is required');
  }
  validateStatus(status);
  validatePriority(priority);

  const tasks = store.getTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw ApiError.notFound('Task not found');
  if (tasks[idx].userId !== userId) throw ApiError.forbidden('This task belongs to another user');

  const updated = {
    ...tasks[idx],
    title: title.trim(),
    description,
    status,
    priority,
    dueDate,
    updatedAt: new Date().toISOString(),
  };
  tasks[idx] = updated;
  store.saveTasks(tasks);
  return updated;
}

function patchTask(userId, taskId, changes) {
  // PATCH = partial update, e.g. { "status": "completed" }.
  if ('status' in changes) validateStatus(changes.status);
  if ('priority' in changes) validatePriority(changes.priority);
  if ('title' in changes && !String(changes.title).trim()) {
    throw ApiError.badRequest('title cannot be empty');
  }

  const tasks = store.getTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw ApiError.notFound('Task not found');
  if (tasks[idx].userId !== userId) throw ApiError.forbidden('This task belongs to another user');

  const allowed = ['title', 'description', 'status', 'priority', 'dueDate'];
  const safeChanges = Object.fromEntries(
    Object.entries(changes).filter(([k]) => allowed.includes(k))
  );

  const updated = {
    ...tasks[idx],
    ...safeChanges,
    updatedAt: new Date().toISOString(),
  };
  tasks[idx] = updated;
  store.saveTasks(tasks);
  return updated;
}

function deleteTask(userId, taskId) {
  const tasks = store.getTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw ApiError.notFound('Task not found');
  if (tasks[idx].userId !== userId) throw ApiError.forbidden('This task belongs to another user');

  tasks.splice(idx, 1);
  store.saveTasks(tasks);
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  replaceTask,
  patchTask,
  deleteTask,
};
