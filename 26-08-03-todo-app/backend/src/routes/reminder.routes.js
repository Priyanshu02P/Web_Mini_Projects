const express = require('express');
const ctrl = require('../controllers/reminder.controller');
const requireAuth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, ctrl.list);
router.post('/read-all', requireAuth, ctrl.markAllRead);
router.patch('/:id', requireAuth, ctrl.markRead);

module.exports = router;
