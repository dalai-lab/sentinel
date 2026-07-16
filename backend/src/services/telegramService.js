const fs = require('fs');
const path = require('path');
const axios = require('axios');

class TelegramService {
  constructor() {
    this.settingsPath = path.join(__dirname, '..', '..', 'telegramSettings.json');
    this.lastEmailed = {}; // Reusing naming for deduplication caching
    this.ensureSettingsFile();
  }

  // Minimum cooldown between alerts for the same host+alertType
  getAlertCooldownMs(severity) {
    switch (severity?.toLowerCase()) {
      case 'critical': return 60 * 1000; // 1 min
      case 'high': return 5 * 60 * 1000; // 5 mins
      case 'warning': return 15 * 60 * 1000; // 15 mins
      default: return 60 * 60 * 1000; // 60 mins
    }
  }

  ensureSettingsFile() {
    if (!fs.existsSync(this.settingsPath)) {
      const defaultSettings = {
        active: false,
        lastUpdateId: 0,
        pendingQueue: [], // Array of { chatId, username, timestamp }
        recipients: [] // Array of { id, name, chatId, active }
      };
      fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
    }
  }

  getSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.recipients) parsed.recipients = [];
        if (!parsed.pendingQueue) parsed.pendingQueue = [];
        if (!parsed.lastUpdateId) parsed.lastUpdateId = 0;
        
        // Migration from old single chatId
        if (parsed.chatId && parsed.recipients.length === 0) {
          parsed.recipients.push({ id: 'tg_1', name: 'Primary Chat', chatId: parsed.chatId, active: true });
          delete parsed.chatId;
        }

        // Remove plain botToken from object and inject configured flag
        if (parsed.botToken) delete parsed.botToken;
        parsed.botTokenConfigured = !!process.env.TELEGRAM_BOT_TOKEN;

        return parsed;
      }
    } catch (e) {
      console.error('[TELEGRAM SERVICE] Error loading telegramSettings.json:', e.message);
    }
    return { active: false, lastUpdateId: 0, pendingQueue: [], recipients: [], botTokenConfigured: !!process.env.TELEGRAM_BOT_TOKEN };
  }

  saveSettings(newSettings) {
    try {
      const current = this.getSettings();
      const cleanedUpdates = { ...newSettings };
      delete cleanedUpdates.botToken;
      delete cleanedUpdates.botTokenConfigured;

      const updated = { ...current, ...cleanedUpdates };
      delete updated.botToken;
      delete updated.botTokenConfigured;

      fs.writeFileSync(this.settingsPath, JSON.stringify(updated, null, 2), 'utf8');
      
      updated.botTokenConfigured = !!process.env.TELEGRAM_BOT_TOKEN;
      return updated;
    } catch (e) {
      console.error('[TELEGRAM SERVICE] Failed to save telegramSettings.json:', e.message);
      return null;
    }
  }

  formatAlertMessage(alert) {
    let icon = '🔴';
    if (alert.severity === 'high' || alert.severity === 'warning') icon = '🟠';
    if (alert.type === 'antivirus') icon = '🦠';

    const timestamp = new Date(alert.timestamp || Date.now()).toUTCString();

    return `${icon} *SENTINEL ALERT* ${icon}\n\n` +
      `*Host:* \`${alert.host}\`\n` +
      `*Type:* ${alert.type.toUpperCase()}\n` +
      `*Severity:* ${alert.severity.toUpperCase()}\n` +
      `*Time:* ${timestamp}\n\n` +
      `*Details:*\n\`${alert.message}\``;
  }

  async sendTelegramMessage(chatId, text) {
    let token = process.env.TELEGRAM_BOT_TOKEN;
    let actualChatId = chatId;
    let actualText = text;
    if (arguments.length === 3) {
      token = arguments[0] || process.env.TELEGRAM_BOT_TOKEN;
      actualChatId = arguments[1];
      actualText = arguments[2];
    }

    if (!token || !actualChatId) {
      throw new Error("Missing Telegram botToken or chatId");
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
      const response = await axios.post(url, {
        chat_id: actualChatId,
        text: actualText,
        parse_mode: 'Markdown'
      });
      return response.data;
    } catch (error) {
      console.error("[TELEGRAM SERVICE] Error sending message:", error.response?.data || error.message);
      throw error;
    }
  }

  async sendTestMessage() {
    const settings = this.getSettings();
    if (!settings.active) {
      return { success: false, message: 'Telegram alerts are disabled.' };
    }
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return { success: false, message: 'Bot Token is missing in environment variables.' };
    }
    
    const activeRecipients = settings.recipients.filter(r => r.active && r.chatId);
    if (activeRecipients.length === 0) {
      return { success: false, message: 'No active chat IDs configured.' };
    }

    const testText = `✅ *Sentinel System Monitor*\n\nTelegram integration is successfully configured. You will now receive system alerts here.`;
    
    let sentCount = 0;
    for (const r of activeRecipients) {
      try {
        await this.sendTelegramMessage(r.chatId, testText);
        sentCount++;
      } catch (e) {
        console.error(`Failed to send test to ${r.name} (${r.chatId})`);
      }
    }

    if (sentCount === 0) {
      return { success: false, message: 'Failed to send test message to any recipient.' };
    }
    return { success: true, message: `Test message sent to ${sentCount} recipient(s).` };
  }

  async sendAlertNotification(alert) {
    const settings = this.getSettings();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!settings.active || !token || !settings.recipients || settings.recipients.length === 0) {
      return;
    }

    const activeRecipients = settings.recipients.filter(r => r.active && r.chatId);
    if (activeRecipients.length === 0) return;

    // Cooldown logic
    const dedupKey = `${alert.host}-${alert.type}-${alert.severity}`;
    const now = Date.now();
    const cooldown = this.getAlertCooldownMs(alert.severity);

    if (this.lastEmailed[dedupKey] && (now - this.lastEmailed[dedupKey]) < cooldown) {
      return; // Skip, inside cooldown
    }

    const text = this.formatAlertMessage(alert);
    
    let sentAny = false;
    for (const r of activeRecipients) {
      try {
        await this.sendTelegramMessage(r.chatId, text);
        sentAny = true;
      } catch (e) {
        console.error(`[TELEGRAM SERVICE] Failed to send alert to ${r.chatId}:`, e.message);
      }
    }

    if (sentAny) {
      this.lastEmailed[dedupKey] = now;
      console.log(`[TELEGRAM SERVICE] 🚀 Alert sent to ${activeRecipients.length} Telegram chat(s) for ${alert.host}`);
    }
  }

  async sendActiveAlerts() {
    const settings = this.getSettings();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!settings.active || !token) {
      return { success: false, message: 'Telegram alerts are disabled or missing bot token.' };
    }

    const activeRecipients = settings.recipients.filter(r => r.active && r.chatId);
    if (activeRecipients.length === 0) {
      return { success: false, message: 'No active chat IDs configured.' };
    }

    try {
      const alertService = require('./alert.service');
      const allAlerts = alertService.getAlerts();
      const activeAlerts = allAlerts.filter(a => a.status === 'active');

      if (activeAlerts.length === 0) {
        return { success: true, sent: 0, total: 0, message: 'No active alerts to send.' };
      }

      let sentCount = 0;
      for (const alert of activeAlerts) {
        const text = this.formatAlertMessage(alert);
        for (const r of activeRecipients) {
          try {
            await this.sendTelegramMessage(r.chatId, text);
          } catch (e) {
            console.error(`[TELEGRAM SERVICE] Failed to send active alert to ${r.chatId}:`, e.message);
          }
        }
        sentCount++;
      }

      return { success: true, sent: sentCount, total: activeAlerts.length, message: `Dispatched ${sentCount} active alerts.` };
    } catch (e) {
      console.error("[TELEGRAM SERVICE] Error in sendActiveAlerts:", e);
      throw e;
    }
  }

  async getPendingChats() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return { success: false, message: 'TELEGRAM_BOT_TOKEN is not set in environment.' };
    }

    let settings = this.getSettings();

    // Offset +1 to acknowledge and consume updates
    const offset = (settings.lastUpdateId || 0) + 1;
    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=5`;
    
    try {
      const response = await axios.get(url);
      const updates = response.data.result;
      
      if (updates && updates.length > 0) {
        let maxUpdateId = settings.lastUpdateId;
        const newPendings = [];

        for (const update of updates) {
          maxUpdateId = Math.max(maxUpdateId, update.update_id);
          
          if (update.message && update.message.chat) {
            const chatId = update.message.chat.id.toString();
            const text = update.message.text || '';
            
            const isConfigured = settings.recipients?.some(r => r.chatId === chatId);
            const isAlreadyPending = settings.pendingQueue?.some(p => p.chatId === chatId);

            // If it's a completely new user who sent /start
            if (!isConfigured && !isAlreadyPending && text.startsWith('/start')) {
              const username = update.message.from?.username || update.message.from?.first_name || 'User';
              
              newPendings.push({
                chatId,
                username,
                timestamp: Date.now()
              });

              // Send the auto-reply acknowledging their request
              const replyText = `⏳ *Access Requested*\n\nYour request has been forwarded to the Sentinel Administrator for approval. You will be notified once access is granted.`;
              await this.sendTelegramMessage(chatId, replyText).catch(() => {});
            }
          }
        }

        // Save new queue and update ID
        if (newPendings.length > 0 || maxUpdateId > settings.lastUpdateId) {
          const updatedQueue = [...(settings.pendingQueue || []), ...newPendings];
          settings = this.saveSettings({ 
            lastUpdateId: maxUpdateId, 
            pendingQueue: updatedQueue 
          });
        }
      }

      const pendingList = settings.pendingQueue || [];
      return { success: true, pending: pendingList, message: `Found ${pendingList.length} pending chat(s).` };
    } catch (error) {
      console.error("[TELEGRAM SERVICE] Error in getPendingChats:", error.response?.data || error.message);
      return { success: false, message: 'Failed to connect to Telegram API. Check your Bot Token.' };
    }
  }
}

module.exports = new TelegramService();
