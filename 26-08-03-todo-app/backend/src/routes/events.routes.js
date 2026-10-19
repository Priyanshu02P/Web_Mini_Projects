const express = require('express');
const { stream } = require('../controllers/reminder.controller');

const router = express.Router();

// Auth is checked inside the handler (token in query string, see controller).
router.get('/stream', stream);

module.exports = router;
