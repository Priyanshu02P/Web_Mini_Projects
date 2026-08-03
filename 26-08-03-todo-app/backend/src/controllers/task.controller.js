const taskService = require('../services/task.service');

/**
 * Attaches a small set of hypermedia links to a task representation.
 * This is NOT required for Level 2, but it's a deliberate, minimal step
 * toward Level 3 (HATEOAS) - see MATURITY.md for why this alone doesn't
 * make the whole API Level 3.
 */
function withLinks(req, task) {
  const base = `${req.protocol}://${req.get('host')}/api/tasks/${task.id}`;
  return {
    ...task,
    _links: {
      self: { href: base, method: 'GET' },
      update: { href: base, method: 'PUT' },
      patch: { href: base, method: 'PATCH' },
      delete: { href: base, method: 'DELETE' },
    },
  };
}

function list(req, res, next) {
  try {
    const { data, meta } = taskService.listTasks(req.user.id, req.query);
    res.status(200).json({
      data: data.map((t) => withLinks(req, t)),
      meta,
      _links: {
        self: { href: `${req.protocol}://${req.get('host')}/api/tasks`, method: 'GET' },
        create: { href: `${req.protocol}://${req.get('host')}/api/tasks`, method: 'POST' },
      },
    });
  } catch (err) {
    next(err);
  }
}

function getOne(req, res, next) {
  try {
    const task = taskService.getTask(req.user.id, req.params.id);
    res.status(200).json({ data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const task = taskService.createTask(req.user.id, req.body);
    res
      .status(201)
      .location(`/api/tasks/${task.id}`)
      .json({ data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
}

function replace(req, res, next) {
  try {
    const task = taskService.replaceTask(req.user.id, req.params.id, req.body);
    res.status(200).json({ data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
}

function patch(req, res, next) {
  try {
    const task = taskService.patchTask(req.user.id, req.params.id, req.body);
    res.status(200).json({ data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    taskService.deleteTask(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, replace, patch, remove };
