const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');
const signozService = require('../services/signoz.service');

// POST /api/metrics
router.post('/', metricsController.getMetrics);

// POST /api/metrics/ai-summary
router.post('/ai-summary', metricsController.getAiSummary);

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await signozService.fetchActiveAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Error in /alerts route:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    const logs = await signozService.fetchLogs(
      startTime ? parseInt(startTime) : null,
      endTime ? parseInt(endTime) : null
    );
    res.json(logs);
  } catch (error) {
    console.error('Error in /logs route:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
