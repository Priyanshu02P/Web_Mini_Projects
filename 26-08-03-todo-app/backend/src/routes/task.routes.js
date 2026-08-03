const express = require('express');
const taskController = require('../controllers/task.controller');
const requireAuth = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', taskController.list);
router.post('/', taskController.create);
router.get('/:id', taskController.getOne);
router.put('/:id', taskController.replace);
router.patch('/:id', taskController.patch);
router.delete('/:id', taskController.remove);

module.exports = router;
