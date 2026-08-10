const taskService = require('../services/task.service');
const { appendLog } = require('../services/log.service');

function getIP(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    req.ip;

  return ip;
}

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

async function list(req, res, next) {
  try {
    const { data, meta } = await taskService.listTasks(req.user.id, req.query);
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

async function getOne(req, res, next) {
  try {
    const task = await taskService.getTask(req.user.id, req.params.id);
    res.status(200).json({ data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const task = await taskService.createTask(req.user.id, req.body);
    res
      .status(201)
      .location(`/api/tasks/${task.id}`)
      .json({ data: withLinks(req, task) });

    appendLog('POST', 'TASK CREATED', getIP(req));
  } catch (err) {
    next(err);
  }
}

async function replace(req, res, next) {
  try {
    const task = await taskService.replaceTask(req.user.id, req.params.id, req.body);
    res.status(200).json({ data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
}

async function patch(req, res, next) {
  try {
    const task = await taskService.patchTask(req.user.id, req.params.id, req.body);
    appendLog('PATCH', 'TASK UPDATED', getIP(req));
    res.status(200).json({ data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await taskService.deleteTask(req.user.id, req.params.id);
    appendLog('DELETE', 'TASK DELETED', getIP(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, replace, patch, remove };
