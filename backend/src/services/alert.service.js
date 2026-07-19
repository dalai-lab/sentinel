const fs = require('fs');
const path = require('path');
const signozService = require('./signoz.service');
const emailService = require('./emailService');
const telegramService = require('./telegramService');

const SETTINGS_PATH = path.join(__dirname, '../config/alertSettings.json');
const ALERTS_HISTORY_PATH = path.join(__dirname, '../config/alertsHistory.json');

class AlertService {
  constructor() {
    this.settings = this.loadSettings();
    this.alerts = this.loadAlerts();
    this.intervalId = null;

    // To prevent spamming the exact same alert repeatedly
    this.lastTriggered = {};
    
    // Keep track of the last seen scan timestamp per host
    this.lastScanTimestamps = {};
    
    // Keep track of when a metric first exceeded its threshold
    this.violationStarts = {};
  }

  loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_PATH)) {
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      }
    } catch (e) {
      console.error('[ALERT SERVICE] Error loading settings:', e.message);
    }
    return {
      cpuThreshold: 85,
      ramThreshold: 90,
      diskThreshold: 90,
      enableAntivirusAlerts: true,
      enableEmailAlerts: true,
      enableTelegramAlerts: true,
      minSeverityForEmail: 'info',
      minSeverityForTelegram: 'warning',
      overrides: {}
    };
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(this.settings, null, 2));
  }

  getSettings() {
    return this.settings;
  }

  loadAlerts() {
    try {
      if (fs.existsSync(ALERTS_HISTORY_PATH)) {
        return JSON.parse(fs.readFileSync(ALERTS_HISTORY_PATH, 'utf-8'));
      }
    } catch (e) {
      console.error('[ALERT SERVICE] Error loading alerts history:', e.message);
    }
    return [];
  }

  saveAlerts() {
    fs.writeFileSync(ALERTS_HISTORY_PATH, JSON.stringify(this.alerts, null, 2));
  }

  getAlerts() {
    // Return all active and historical alerts, newest first
    return this.alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'acknowledged';
      this.saveAlerts();
      return true;
    }
    return false;
  }

  resolveAlert(hostFriendly, type, message) {
    const existing = this.alerts.find(
      a => a.host === hostFriendly && a.type === type && a.status !== 'resolved'
    );
    
    if (existing) {
      existing.status = 'resolved';
      existing.resolvedAt = Date.now();
      existing.message = message || `${type.toUpperCase()} alert has been resolved.`;
      this.saveAlerts();
      
      console.log(`[ALERT SERVICE] ✅ Alert Resolved: ${existing.title} on ${existing.host}`);
      
      const resolvedAlert = { ...existing, status: 'resolved', title: `RESOLVED: ${existing.title}` };
      this.dispatchNotifications(resolvedAlert);
    }
  }

  dispatchNotifications(alert) {
    let rawHost = alert.host;
    const fNames = {
      'instance-20260630-1713': 'Oracle database server',
      'Database-Server-Oracle': 'Oracle database server',
      'srv1213878': 'Orbithyre',
      'srv1176513': 'Gaplytiq',
      'srv1055295': 'Dalai'
    };
    for (const [k, v] of Object.entries(fNames)) {
      if (v === alert.host && this.settings.overrides?.[k]) {
        rawHost = k;
        break;
      }
    }

    const hostSettings = this.settings.overrides?.[rawHost] || {};
    const emailEnabled = hostSettings.enableEmailAlerts ?? this.settings.enableEmailAlerts ?? true;
    const tgEnabled = hostSettings.enableTelegramAlerts ?? this.settings.enableTelegramAlerts ?? true;
    const minSevEmail = hostSettings.minSeverityForEmail ?? this.settings.minSeverityForEmail ?? 'info';
    const minSevTg = hostSettings.minSeverityForTelegram ?? this.settings.minSeverityForTelegram ?? 'warning';

    const SEVERITY_LEVEL = { 'info': 0, 'warning': 1, 'critical': 2 };
    const currentSev = SEVERITY_LEVEL[alert.severity] || 0;

    if (emailEnabled && currentSev >= (SEVERITY_LEVEL[minSevEmail] || 0)) {
      emailService.sendAlertNotification(alert).catch(err => {
        console.error('[ALERT SERVICE] Email forwarding error:', err.message);
      });
    }

    if (tgEnabled && currentSev >= (SEVERITY_LEVEL[minSevTg] || 0)) {
      telegramService.sendAlertNotification(alert).catch(err => {
        console.error('[ALERT SERVICE] Telegram forwarding error:', err.message);
      });
    }
  }

  triggerAlert(alert) {
    const dedupKey = `${alert.host}-${alert.type}`;
    const now = Date.now();

    // Only trigger if we haven't triggered this EXACT alert type for this host in the last 15 minutes
    if (this.lastTriggered[dedupKey] && (now - this.lastTriggered[dedupKey]) < (15 * 60 * 1000)) {
      return;
    }

    const existing = this.alerts.find(
      a => a.host === alert.host && a.type === alert.type && a.status !== 'resolved'
    );
    
    if (existing) {
      existing.lastSeen = now;
      existing.value = alert.value ?? existing.value;
      existing.message = alert.message ?? existing.message;
      this.saveAlerts();
      this.lastTriggered[dedupKey] = now;
      console.log(`[ALERT SERVICE] 🚨 Alert Updated (Silently): [${alert.severity.toUpperCase()}] ${alert.title} on ${alert.host}`);
      return;
    }

    const newAlert = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now,
      status: 'active',
      ...alert
    };

    this.alerts.push(newAlert);
    if (this.alerts.length > 100) this.alerts = this.alerts.slice(-100);
    this.saveAlerts();
    this.lastTriggered[dedupKey] = now;
    
    console.log(`[ALERT SERVICE] 🚨 New Alert Triggered: [${alert.severity.toUpperCase()}] ${alert.title} on ${alert.host}`);
    this.dispatchNotifications(newAlert);
  }

  // Friendly names map duplicated from aiManager
  getFriendlyName(hostName) {
    const FRIENDLY_NAMES = {
      'instance-20260630-1713': 'Oracle database server',
      'Database-Server-Oracle': 'Oracle database server',
      'srv1213878': 'Orbithyre',
      'srv1176513': 'Gaplytiq',
      'srv1055295': 'Dalai'
    };
    return FRIENDLY_NAMES[hostName] || hostName;
  }

  async checkState() {
    try {
      const cpuQuery = '100 - (avg by (host_name) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)';
      const memQuery = '100 * (1 - (avg by (host_name) (node_memory_MemAvailable_bytes) / avg by (host_name) (node_memory_MemTotal_bytes)))';
      const diskQuery = '100 - ((avg by (host_name) (node_filesystem_avail_bytes{mountpoint="/",fstype!~"rootfs|selinuxfs|autofs|rpc_pipefs|tmpfs|udev|none|devpts|pstore|securityfs|debugfs|bpf|tracefs|sysfs|cgroup|cgroup2|mqueue|systemd-1"}) * 100) / avg by (host_name) (node_filesystem_size_bytes{mountpoint="/",fstype!~"rootfs|selinuxfs|autofs|rpc_pipefs|tmpfs|udev|none|devpts|pstore|securityfs|debugfs|bpf|tracefs|sysfs|cgroup|cgroup2|mqueue|systemd-1"}))';

      const [cpuData, memData, diskData] = await Promise.all([
        signozService.fetchMetrics(cpuQuery),
        signozService.fetchMetrics(memQuery),
        signozService.fetchMetrics(diskQuery)
      ]);

      const cpuResults = cpuData?.data?.result || [];
      const memResults = memData?.data?.result || [];
      const diskResults = diskData?.data?.result || [];

      // 1. Evaluate CPU
      cpuResults.forEach(r => {
        const val = parseFloat(r.value[1]);
        const host = r.metric.host_name;
        const threshold = this.settings.overrides?.[host]?.cpuThreshold ?? this.settings.cpuThreshold;
        const dedupKey = `${host}-cpu`;
        
        if (val > threshold) {
          if (!this.violationStarts[dedupKey]) {
            this.violationStarts[dedupKey] = Date.now();
          } else if (Date.now() - this.violationStarts[dedupKey] >= 3 * 60 * 1000) {
            this.triggerAlert({
              type: 'cpu',
              severity: val > 95 ? 'critical' : 'warning',
              host: this.getFriendlyName(host),
              title: 'High CPU Usage',
              message: `CPU usage has been above ${threshold}% for over 3 minutes. Currently at ${val.toFixed(1)}%.`
            });
          }
        } else {
          delete this.violationStarts[dedupKey];
          this.resolveAlert(this.getFriendlyName(host), 'cpu', `CPU usage has recovered to ${val.toFixed(1)}%.`);
        }
      });

      // 2. Evaluate RAM
      memResults.forEach(r => {
        const val = parseFloat(r.value[1]);
        const host = r.metric.host_name;
        const threshold = this.settings.overrides?.[host]?.ramThreshold ?? this.settings.ramThreshold;
        const dedupKey = `${host}-ram`;

        if (val > threshold) {
          if (!this.violationStarts[dedupKey]) {
            this.violationStarts[dedupKey] = Date.now();
          } else if (Date.now() - this.violationStarts[dedupKey] >= 3 * 60 * 1000) {
            this.triggerAlert({
              type: 'ram',
              severity: val > 95 ? 'critical' : 'warning',
              host: this.getFriendlyName(host),
              title: 'High Memory Usage',
              message: `RAM usage has been above ${threshold}% for over 3 minutes. Currently at ${val.toFixed(1)}%.`
            });
          }
        } else {
          delete this.violationStarts[dedupKey];
          this.resolveAlert(this.getFriendlyName(host), 'ram', `Memory usage has recovered to ${val.toFixed(1)}%.`);
        }
      });

      // 3. Evaluate Disk
      diskResults.forEach(r => {
        const val = parseFloat(r.value[1]);
        const host = r.metric.host_name;
        const threshold = this.settings.overrides?.[host]?.diskThreshold ?? this.settings.diskThreshold;
        const dedupKey = `${host}-disk`;

        if (val > threshold) {
          if (!this.violationStarts[dedupKey]) {
            this.violationStarts[dedupKey] = Date.now();
          } else if (Date.now() - this.violationStarts[dedupKey] >= 3 * 60 * 1000) {
            this.triggerAlert({
              type: 'disk',
              severity: val > 95 ? 'critical' : 'warning',
              host: this.getFriendlyName(host),
              title: 'Storage Space Critical',
              message: `Disk usage has been above ${threshold}% for over 3 minutes. Currently at ${val.toFixed(1)}%.`
            });
          }
        } else {
          delete this.violationStarts[dedupKey];
          this.resolveAlert(this.getFriendlyName(host), 'disk', `Disk usage has recovered to ${val.toFixed(1)}%.`);
        }
      });

      // 4. Evaluate Antivirus Scans
      const scans = await signozService.fetchLatestScans();
      scans.forEach(scan => {
        const host = scan.host;
        const enableAv = this.settings.overrides?.[host]?.enableAntivirusAlerts ?? this.settings.enableAntivirusAlerts;
        
        // Critical alerts for infected files
        if (enableAv && scan.infectedFiles > 0) {
          this.triggerAlert({
            type: 'antivirus',
            severity: 'critical',
            host: this.getFriendlyName(host),
            title: 'Malware Infection Detected',
            message: `ClamAV detected ${scan.infectedFiles} infected files during the recent scan.`
          });
        } else if (enableAv && scan.infectedFiles === 0) {
          this.resolveAlert(this.getFriendlyName(host), 'antivirus', `Malware cleanup completed. Scan found 0 infected files.`);
        }


      });

    } catch (e) {
      console.error('[ALERT SERVICE] Error in checkState loop:', e.message);
    }
  }

  start() {
    console.log('[ALERT SERVICE] Initializing custom alerting daemon...');
    this.checkState();

    // Check thresholds every 60 seconds
    this.intervalId = setInterval(() => {
      this.checkState();
    }, 60000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

module.exports = new AlertService();
