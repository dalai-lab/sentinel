const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');

// POST /api/metrics
router.post('/', metricsController.getMetrics);

// POST /api/metrics/ai-summary
router.post('/ai-summary', metricsController.getAiSummary);

module.exports = router;
