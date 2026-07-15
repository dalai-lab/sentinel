const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');

// POST /api/metrics
router.post('/', metricsController.getMetrics);

module.exports = router;
