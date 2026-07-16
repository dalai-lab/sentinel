const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');
const signozService = require('../services/signoz.service');
const ipGeoService = require('../services/ipGeo.service');

// POST /api/metrics
router.post('/', metricsController.getMetrics);

// GET /api/metrics/ai-summary/latest
router.get('/ai-summary/latest', metricsController.getLatestAiSummary);

// POST /api/metrics/ai-summary/force
router.post('/ai-summary/force', metricsController.forceAiSummary);

// GET /api/metrics/incidents
router.get('/incidents', metricsController.getIncidents);

// DELETE /api/metrics/incidents
router.delete('/incidents', metricsController.clearIncidents);

// POST /api/metrics/ai-summary
router.post('/ai-summary', metricsController.getAiSummary);

// POST /api/metrics/ask
router.post('/ask', metricsController.askAi);

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
    const { startTime, endTime, type, search } = req.query;
    const logs = await signozService.fetchLogs(
      startTime ? parseInt(startTime) : null,
      endTime ? parseInt(endTime) : null,
      type,
      search
    );
    res.json(logs);
  } catch (error) {
    console.error('Error in /logs route:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ip-info', async (req, res) => {
  try {
    const { ips } = req.body;
    if (!Array.isArray(ips)) return res.status(400).json({ error: 'ips must be an array' });
    const geoMap = await ipGeoService.lookupIps(ips);
    res.json(geoMap);
  } catch (error) {
    console.error('Error in /ip-info route:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/scans', async (req, res) => {
  try {
    const scans = await signozService.fetchLatestScans();
    res.json(scans);
  } catch (error) {
    console.error('Error in /scans route:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
