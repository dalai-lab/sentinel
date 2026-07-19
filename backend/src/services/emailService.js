const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../config/mailSettings.json');

class EmailService {
  constructor() {
    this.settings = this.loadSettings();
    this.transporter = this.createTransporter();
    // Tracks last email send time per dedupKey (host+alertType)
    // to prevent spamming when the same alert keeps firing
    this.lastEmailed = {};
  }

  // Minimum cooldown between emails for the same alert type per host
  // critical → 1h, high → 2h, warning/info → 4h
  getEmailCooldownMs(severity) {
    const s = (severity || 'warning').toLowerCase();
    if (s === 'critical') return 60 * 60 * 1000;       // 1 hour
    if (s === 'high')     return 2 * 60 * 60 * 1000;   // 2 hours
    return 4 * 60 * 60 * 1000;                          // 4 hours (warning/info)
  }

  loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_PATH)) {
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      }
    } catch (e) {
      console.error('[EMAIL SERVICE] Error loading mailSettings.json:', e.message);
    }

    const defaultSettings = {
      enabled: true,
      senderEmail: process.env.FROM_EMAIL || 'info@orbithyre.com',
      senderName: 'Sentinel Security Guard',
      severities: {
        critical: true,
        high: true,
        warning: true,
        info: false
      },
      recipients: [
        { id: 'rcp_1', name: 'Sales & Security Desk', email: 'sales@orbithyre.com', active: true }
      ]
    };

    this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(this.settings, null, 2));
    } catch (e) {
      console.error('[EMAIL SERVICE] Failed to save mailSettings.json:', e.message);
    }
    return this.settings;
  }

  getSettings() {
    return {
      ...this.settings,
      smtpHost: process.env.SMTP_HOST || 'smtp.zeptomail.in'
    };
  }

  createTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.zeptomail.in';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || 'emailapikey';
    const pass = process.env.SMTP_PASS;

    if (!pass) {
      console.warn('[EMAIL SERVICE] SMTP_PASS is missing in environment variables. Email sending may fail.');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });
  }

  generateAlertHtml(alert) {
    const severity = (alert.severity || 'warning').toLowerCase();
    const status = alert.status;
    const isResolved = status === 'resolved' && alert.title?.toUpperCase().includes('RESOLVED');
    const isEvent = alert.type === 'antivirus_scan_completed';
    const isVirus = alert.type === 'antivirus';
    
    let accentColor = '#ef4444'; // critical red
    let badgeText = 'INCIDENT REGISTERED';
    let humanSummary = '';

    const hostName = alert.host || 'one of your servers';
    const typeLabel = alert.type ? alert.type.toUpperCase() : 'system';

    if (isResolved) {
      accentColor = '#10b981'; // emerald green
      badgeText = 'RESOLVED';
      humanSummary = `The issue on <strong>${hostName}</strong> has been resolved. The ${typeLabel} metrics have returned to normal operating parameters.`;
    } else if (isEvent) {
      accentColor = '#818cf8'; // indigo
      badgeText = 'SCAN COMPLETED';
      humanSummary = `A scheduled antivirus check completed successfully on <strong>${hostName}</strong>. No malware was detected during this run.`;
    } else if (isVirus) {
      accentColor = '#ef4444'; // critical red
      badgeText = 'MALWARE DETECTED';
      humanSummary = `Security warning: Infected files were detected during a scan on <strong>${hostName}</strong>. Action may be required to quarantine or clean up.`;
    } else {
      // CPU/RAM/Disk trigger
      accentColor = severity === 'warning' ? '#f59e0b' : '#ef4444';
      badgeText = severity === 'warning' ? 'WARNING' : 'CRITICAL LIMIT';
      humanSummary = `The server <strong>${hostName}</strong> is experiencing high resource load. The ${typeLabel} usage has climbed to <strong>${alert.value}%</strong>, crossing your threshold.`;
    }

    const timestamp = new Date(alert.timestamp || Date.now()).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5173';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel Status Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #a1a1aa;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #0d0d11; border: 1px solid rgba(255,255,255,0.06); border-top: 4px solid ${accentColor}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.45);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); background-color: #0d0d11;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #71717a; text-transform: uppercase;">
                      SENTINEL SYSTEM UPDATE
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 3px 9px; border-radius: 4px; background-color: ${accentColor}12; border: 1px solid ${accentColor}30; color: ${accentColor}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 24px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #f4f4f5; letter-spacing: -0.02em;">
                ${alert.title || 'System notification alert'}
              </h2>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #a1a1aa; line-height: 1.6; font-weight: 400;">
                ${humanSummary}
              </p>

              <!-- Detailed context box -->
              <div style="background-color: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #f4f4f5; line-height: 1.5;">
                  <strong>Details:</strong> ${alert.message || 'No additional message details provided.'}
                </p>
                <p style="margin: 0; font-size: 12px; color: #71717a;">
                  Logged on ${timestamp} (UTC)
                </p>
              </div>

              <!-- Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 10px 22px; background-color: #f4f4f5; color: #09090b; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; letter-spacing: 0.5px; transition: background 0.15s ease;">
                      Open Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px; background-color: #09090b; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #52525b; font-weight: 500;">
                Automated notification from Sentinel Security Dashboard
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  async sendAlertNotification(alert) {
    if (!this.settings.enabled) return { success: false, reason: 'Mail notifications disabled in settings' };

    const activeRecipients = (this.settings.recipients || [])
      .filter(r => r.active && r.email)
      .map(r => r.email);

    if (activeRecipients.length === 0) {
      console.log('[EMAIL SERVICE] No active recipient email addresses configured.');
      return { success: false, reason: 'No recipients configured' };
    }

    // Email-level cooldown — independent of alert dedup
    const emailDedupKey = `${alert.host}-${alert.type}-${alert.severity}`;
    const now = Date.now();
    const cooldown = this.getEmailCooldownMs(alert.severity);
    if (this.lastEmailed[emailDedupKey] && (now - this.lastEmailed[emailDedupKey]) < cooldown) {
      const minsLeft = Math.round((cooldown - (now - this.lastEmailed[emailDedupKey])) / 60000);
      console.log(`[EMAIL SERVICE] ⏳ Suppressed duplicate email for [${alert.severity}] ${alert.title} on ${alert.host} — next allowed in ~${minsLeft}m`);
      return { success: false, reason: 'Email cooldown active' };
    }
    this.lastEmailed[emailDedupKey] = now;

    const severity = (alert.severity || 'warning').toLowerCase();
    const severityCheck = this.settings.severities || {};

    // Match alert severity filter.
    // Exception: antivirus_scan_completed always goes through regardless of the 'info' severity toggle,
    // since it has its own dedicated toggle (sendAntivirusReportEmail) checked in alert.service.js.
    if (alert.type !== 'antivirus_scan_completed') {
      if (severity === 'critical' && !severityCheck.critical) return;
      if (severity === 'high' && !severityCheck.high) return;
      if (severity === 'warning' && !severityCheck.warning) return;
      if (severity === 'info' && !severityCheck.info) return;
    }

    const subject = `[Sentinel ${severity.toUpperCase()}] ${alert.title} - ${alert.host || 'Fleet'}`;
    const html = this.generateAlertHtml(alert);

    const fromAddress = `"${this.settings.senderName || 'Sentinel Intelligence'}" <${process.env.FROM_EMAIL || 'info@orbithyre.com'}>`;

    const mailOptions = {
      from: fromAddress,
      to: activeRecipients.join(', '),
      subject,
      html
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL SERVICE] 📧 Alert notification dispatched to ${activeRecipients.length} recipients: ${info.messageId}`);
      return { success: true, messageId: info.messageId, recipients: activeRecipients };
    } catch (err) {
      console.error('[EMAIL SERVICE] ❌ Failed to dispatch alert email:', err.message);
      return { success: false, error: err.message };
    }
  }

  async sendTestEmail(targetEmail) {
    const activeRecipients = targetEmail 
      ? [targetEmail] 
      : (this.settings.recipients || []).filter(r => r.active).map(r => r.email);

    if (activeRecipients.length === 0) {
      throw new Error('No active email addresses to receive test mail.');
    }

    const sampleAlert = {
      id: 'test_alert_sample',
      title: 'High Resource Load & Security Scan Dispatch',
      message: 'This is a test notification dispatched from your Sentinel Security Dashboard settings. ZeptoMail SMTP service is operational.',
      host: 'srv1213878.orbithyre.internal',
      type: 'test_diagnostic',
      severity: 'high',
      value: 88.5,
      timestamp: Date.now()
    };

    const subject = `[Sentinel Diagnostic] Test Alert Notification - ${sampleAlert.host}`;
    const html = this.generateAlertHtml(sampleAlert);
    const fromAddress = `"${this.settings.senderName || 'Sentinel Intelligence'}" <${process.env.FROM_EMAIL || 'info@orbithyre.com'}>`;

    const mailOptions = {
      from: fromAddress,
      to: activeRecipients.join(', '),
      subject,
      html
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] 🧪 Test email dispatched to ${activeRecipients.join(', ')}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, recipients: activeRecipients };
  }
}

module.exports = new EmailService();