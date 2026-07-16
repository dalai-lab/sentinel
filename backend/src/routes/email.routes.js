const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// GET mailer settings & recipients
router.get('/settings', (req, res) => {
  try {
    const settings = emailService.getSettings();
    res.json({ status: 'success', data: settings });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Save mailer settings
router.post('/settings', (req, res) => {
  try {
    const newSettings = req.body;
    if (!newSettings) {
      return res.status(400).json({ status: 'error', message: 'Missing settings payload' });
    }
    const updated = emailService.saveSettings(newSettings);
    res.json({ status: 'success', data: updated });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Add recipient
router.post('/recipients', (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ status: 'error', message: 'Invalid email address' });
    }

    const settings = emailService.getSettings();
    const newRecipient = {
      id: `rcp_${Date.now()}`,
      name: name || email.split('@')[0],
      email: email.trim(),
      active: true
    };

    settings.recipients = settings.recipients || [];
    // Deduplicate
    if (!settings.recipients.some(r => r.email.toLowerCase() === email.toLowerCase())) {
      settings.recipients.push(newRecipient);
    }
    
    emailService.saveSettings(settings);
    res.json({ status: 'success', data: settings.recipients });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Remove recipient
router.delete('/recipients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const settings = emailService.getSettings();
    settings.recipients = (settings.recipients || []).filter(r => r.id !== id);
    emailService.saveSettings(settings);
    res.json({ status: 'success', data: settings.recipients });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Toggle recipient active status
router.patch('/recipients/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const settings = emailService.getSettings();
    const recipient = (settings.recipients || []).find(r => r.id === id);
    if (recipient) {
      recipient.active = !recipient.active;
      emailService.saveSettings(settings);
    }
    res.json({ status: 'success', data: settings.recipients });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Dispatch test email
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body || {};
    const result = await emailService.sendTestEmail(email);
    res.json({ status: 'success', message: 'Test email dispatched successfully', data: result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Dispatch all current active alerts to configured recipients (manual trigger)
router.post('/send-active-alerts', async (req, res) => {
  try {
    const alertService = require('../services/alert.service');
    const allAlerts = alertService.getAlerts();
    const activeAlerts = allAlerts.filter(a => a.status === 'active');

    if (activeAlerts.length === 0) {
      return res.json({ status: 'success', message: 'No active alerts to send.', data: { sent: 0, skipped: 0 } });
    }

    let sent = 0;
    let skipped = 0;
    const results = [];

    for (const alert of activeAlerts) {
      // Force-clear the email cooldown for this alert so manual dispatch always goes through
      const dedupKey = `${alert.host}-${alert.type}-${alert.severity}`;
      delete emailService.lastEmailed[dedupKey];

      const result = await emailService.sendAlertNotification(alert);
      if (result && result.success) {
        sent++;
        results.push({ alert: alert.title, host: alert.host, status: 'sent' });
      } else {
        skipped++;
        results.push({ alert: alert.title, host: alert.host, status: 'skipped', reason: result?.reason });
      }
    }

    console.log(`[EMAIL SERVICE] 📬 Manual dispatch: ${sent} sent, ${skipped} skipped out of ${activeAlerts.length} active alerts`);
    res.json({
      status: 'success',
      message: `Dispatched ${sent} of ${activeAlerts.length} active alerts.`,
      data: { sent, skipped, total: activeAlerts.length, results }
    });
  } catch (err) {
    console.error('[EMAIL ROUTES] send-active-alerts error:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;