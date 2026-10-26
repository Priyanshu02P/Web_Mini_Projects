const express = require('express');
const authRoutes = require('./auth.routes');
const taskRoutes = require('./task.routes');
const reminderRoutes = require('./reminder.routes');
const analyticsRoutes = require('./analytics.routes');
const eventsRoutes = require('./events.routes');
const aiRoutes = require('./ai.routes');

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/reminders', reminderRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/events', eventsRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
