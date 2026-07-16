const express = require('express');
const router = express.Router();
const alertService = require('../services/alert.service');

// Get all alerts (active and historical)
router.get('/', (req, res) => {
  res.json({ status: 'success', data: alertService.getAlerts() });
});

// Acknowledge an alert
router.post('/:id/acknowledge', (req, res) => {
  const success = alertService.acknowledgeAlert(req.params.id);
  if (success) {
    res.json({ status: 'success', message: 'Alert acknowledged' });
  } else {
    res.status(404).json({ status: 'error', message: 'Alert not found' });
  }
});

// Get alert settings
router.get('/settings', (req, res) => {
  res.json({ status: 'success', data: alertService.getSettings() });
});

// Update alert settings
router.post('/settings', (req, res) => {
  const newSettings = req.body;
  if (!newSettings) {
    return res.status(400).json({ status: 'error', message: 'Missing settings payload' });
  }
  alertService.saveSettings(newSettings);
  res.json({ status: 'success', data: alertService.getSettings() });
});

module.exports = router;
