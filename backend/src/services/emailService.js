const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../config/mailSettings.json');

class EmailService {
  constructor() {
    this.settings = this.loadSettings();
    this.transporter = this.createTransporter();
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
    
    let badgeBg = 'rgba(16,185,129,0.05)';
    let badgeBorder = 'rgba(16,185,129,0.2)';
    let badgeColor = '#10b981';
    let badgeText = 'HEALTHY';
    
    if (severity === 'critical') {
      badgeBg = 'rgba(239,68,68,0.05)';
      badgeBorder = 'rgba(239,68,68,0.2)';
      badgeColor = '#ef4444';
      badgeText = 'CRITICAL ALERT';
    } else if (severity === 'high' || severity === 'warning') {
      badgeBg = 'rgba(245,158,11,0.05)';
      badgeBorder = 'rgba(245,158,11,0.2)';
      badgeColor = '#fb923c';
      badgeText = 'SECURITY WARNING';
    } else if (alert.type === 'antivirus') {
      badgeBg = 'rgba(239,68,68,0.05)';
      badgeBorder = 'rgba(239,68,68,0.2)';
      badgeColor = '#ef4444';
      badgeText = 'VIRUS DETECTED';
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
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #a1a1aa;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #0c0c0e; border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden;">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background-color: #0c0c0e;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #71717a; text-transform: uppercase;">
                      SENTINEL SYSTEM MONITOR
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 3px; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #f4f4f5;">
                ${alert.title || 'System Incident Registered'}
              </h2>
              
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #71717a; line-height: 1.5; font-weight: 400;">
                ${alert.message || alert.details || 'An infrastructure or telemetry event has triggered a notification event.'}
              </p>

              <!-- Telemetry Metadata Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; color: #71717a;">Server Host:</td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; color: #f4f4f5; font-family: Consolas, Monaco, monospace; font-weight: 600;" align="right">${alert.host || 'Global Fleet'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; color: #71717a;">Metric Type:</td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; color: #f4f4f5; text-transform: capitalize;" align="right">${alert.type || 'Telemetry'}</td>
                </tr>
                ${alert.value !== undefined ? `
                <tr>
                  <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; color: #71717a;">Registered Level:</td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; color: #ef4444; font-weight: 600; font-family: Consolas, Monaco, monospace;" align="right">${alert.value}%</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 10px 12px; font-size: 12px; color: #71717a;">Timestamp (UTC):</td>
                  <td style="padding: 10px 12px; font-size: 12px; color: #a1a1aa; font-family: Consolas, Monaco, monospace;" align="right">${timestamp}</td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="http://localhost:5173" target="_blank" style="display: inline-block; padding: 8px 18px; background-color: #f4f4f5; color: #09090b; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 3px; letter-spacing: 0.5px;">
                      Open Dashboard →
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
                Sentinel Infrastructure Telemetry · Automated Alert System
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

    const severity = (alert.severity || 'warning').toLowerCase();
    const severityCheck = this.settings.severities || {};

    // Match alert severity filter
    if (severity === 'critical' && !severityCheck.critical) return;
    if (severity === 'high' && !severityCheck.high) return;
    if (severity === 'warning' && !severityCheck.warning) return;
    if (severity === 'info' && !severityCheck.info) return;

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