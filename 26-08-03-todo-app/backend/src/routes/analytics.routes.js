const express = require('express');
const ctrl = require('../controllers/analytics.controller');
const requireAuth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/productivity', requireAuth, ctrl.productivity);

module.exports = router;
