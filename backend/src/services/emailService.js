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
    
    let accentColor = '#ef4444'; // default critical red
    let badgeText = 'CRITICAL ALERT';
    
    if (isResolved) {
      accentColor = '#10b981'; // green
      badgeText = 'RESOLVED';
    } else if (isEvent) {
      accentColor = '#818cf8'; // indigo
      badgeText = 'SYSTEM REPORT';
    } else if (severity === 'warning') {
      accentColor = '#f59e0b'; // amber
      badgeText = 'WARNING';
    } else if (severity === 'info') {
      accentColor = '#71717a'; // gray
      badgeText = 'INFO';
    }

    const timestamp = new Date(alert.timestamp || Date.now()).toUTCString();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel Alert Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #a1a1aa;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #0d0d11; border: 1px solid rgba(255,255,255,0.06); border-top: 4px solid ${accentColor}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); background-color: #0d0d11;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #71717a; text-transform: uppercase;">
                      SENTINEL SECURITY GATEWAY
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 4px; background-color: ${accentColor}12; border: 1px solid ${accentColor}30; color: ${accentColor}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #f4f4f5; letter-spacing: -0.02em;">
                ${alert.title || 'Incident Event Registered'}
              </h2>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1aa; line-height: 1.6; font-weight: 400;">
                ${alert.message || 'An infrastructure telemetry event has triggered this notification.'}
              </p>

              <!-- Telemetry Metadata Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; color: #71717a; font-weight: 500;">Server Host</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; color: #f4f4f5; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600;" align="right">${alert.host || 'Global Fleet'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; color: #71717a; font-weight: 500;">Alert Type</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; color: #f4f4f5; text-transform: uppercase; font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 600; font-size: 11px;" align="right">${alert.type || 'Telemetry'}</td>
                </tr>
                ${alert.value !== undefined ? `
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; color: #71717a; font-weight: 500;">Recorded Metric Value</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; color: ${accentColor}; font-weight: 600; font-family: ui-monospace, SFMono-Regular, monospace;" align="right">${alert.value}%</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 12px 14px; font-size: 12px; color: #71717a; font-weight: 500;">Timestamp (UTC)</td>
                  <td style="padding: 12px 14px; font-size: 12px; color: #a1a1aa; font-family: ui-monospace, SFMono-Regular, monospace;" align="right">${timestamp}</td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="http://localhost:5173" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #f4f4f5; color: #09090b; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; letter-spacing: 0.5px; transition: background 0.15s ease;">
                      Access Central Console
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #09090b; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #52525b; font-weight: 500; letter-spacing: 0.5px;">
                Sentinel Fleet Monitoring System • AAA Alert Gateway
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