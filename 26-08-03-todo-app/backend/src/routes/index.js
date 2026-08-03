const express = require('express');
const authRoutes = require('./auth.routes');
const taskRoutes = require('./task.routes');

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;
