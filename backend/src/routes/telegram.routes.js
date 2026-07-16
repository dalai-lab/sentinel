const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');

// Get Settings
router.get('/settings', (req, res) => {
  try {
    const settings = telegramService.getSettings();
    res.json({ status: 'success', data: settings });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Update Settings
router.post('/settings', (req, res) => {
  try {
    const newSettings = req.body;
    const updated = telegramService.saveSettings(newSettings);
    res.json({ status: 'success', data: updated });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Add Recipient
router.post('/recipients', async (req, res) => {
  try {
    const { name, chatId } = req.body;
    if (!chatId) return res.status(400).json({ status: 'error', message: 'Chat ID required' });
    
    const settings = telegramService.getSettings();
    if (!settings.recipients.some(r => r.chatId === chatId)) {
      settings.recipients.push({
        id: `tg_${Date.now()}`,
        name: name || 'Unnamed Chat',
        chatId: chatId,
        active: true
      });
      
      // Remove from pendingQueue if they were there
      const newPendingQueue = (settings.pendingQueue || []).filter(p => p.chatId !== chatId);
      
      telegramService.saveSettings({ 
        recipients: settings.recipients,
        pendingQueue: newPendingQueue
      });

      // Send approval notification asynchronously
      if (settings.botToken) {
        const msg = `✅ *Access Granted*\n\nYour request has been approved by the administrator. You are now subscribed to receive real-time Sentinel alerts.`;
        telegramService.sendTelegramMessage(settings.botToken, chatId, msg).catch(() => {});
      }
    }
    res.json({ status: 'success', data: settings.recipients });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Remove Recipient
router.delete('/recipients/:id', (req, res) => {
  try {
    const settings = telegramService.getSettings();
    settings.recipients = settings.recipients.filter(r => r.id !== req.params.id);
    telegramService.saveSettings({ recipients: settings.recipients });
    res.json({ status: 'success', data: settings.recipients });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Toggle Recipient
router.put('/recipients/:id/toggle', (req, res) => {
  try {
    const settings = telegramService.getSettings();
    const recipient = settings.recipients.find(r => r.id === req.params.id);
    if (recipient) {
      recipient.active = !recipient.active;
      telegramService.saveSettings({ recipients: settings.recipients });
    }
    res.json({ status: 'success', data: settings.recipients });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get Pending Chats
router.post('/pending', async (req, res) => {
  try {
    // If frontend sent a botToken, save it first before polling
    if (req.body.botToken) {
      telegramService.saveSettings({ botToken: req.body.botToken });
    }

    const result = await telegramService.getPendingChats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test Message
router.post('/test', async (req, res) => {
  try {
    const result = await telegramService.sendTestMessage();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
