const signozService = require('./signoz.service');
const aiService = require('./ai.service');
const alertService = require('./alert.service');

// Friendly names map for raw hostnames (duplicated from frontend for backend context)
const FRIENDLY_NAMES = {
  'instance-20260630-1713': 'Oracle database server',
  'Database-Server-Oracle': 'Oracle database server',
  'srv1213878': 'Orbithyre',
  'srv1176513': 'Gaplytiq',
  'srv1055295': 'Dalai'
};

const SERVER_IPS = {
  'instance-20260630-1713': '80.225.241.81',
  'Database-Server-Oracle': '80.225.241.81',
  'srv1213878': '31.97.235.136',
  'srv1176513': '72.61.235.141',
  'srv1055295': '168.231.122.248'
};

function getFriendlyName(hostName) {
  return FRIENDLY_NAMES[hostName] || hostName;
}

function getServerIp(hostName) {
  return SERVER_IPS[hostName] || 'Live';
}

class AiManagerService {
  constructor() {
    this.cachedSummary = null;
    this.lastKnownState = {
      alertCount: 0,
      highCpuHosts: new Set()
    };
    this.lastHourlyRun = Date.now();
    this.lastDailyRun = Date.now();
    this.intervalId = null;
  }

  async fetchAndBuildServers() {
    const cpuQuery = '100 - (avg by (host_name) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)';
    const memQuery = '100 * (1 - (avg by (host_name) (node_memory_MemAvailable_bytes) / avg by (host_name) (node_memory_MemTotal_bytes)))';
    const diskQuery = '100 - ((avg by (host_name) (node_filesystem_avail_bytes{mountpoint="/",fstype!~"rootfs|selinuxfs|autofs|rpc_pipefs|tmpfs|udev|none|devpts|pstore|securityfs|debugfs|bpf|tracefs|sysfs|cgroup|cgroup2|mqueue|systemd-1"}) * 100) / avg by (host_name) (node_filesystem_size_bytes{mountpoint="/",fstype!~"rootfs|selinuxfs|autofs|rpc_pipefs|tmpfs|udev|none|devpts|pstore|securityfs|debugfs|bpf|tracefs|sysfs|cgroup|cgroup2|mqueue|systemd-1"}))';

    try {
      const [cpuData, memData, diskData] = await Promise.all([
        signozService.fetchMetrics(cpuQuery),
        signozService.fetchMetrics(memQuery),
        signozService.fetchMetrics(diskQuery)
      ]);

      const cpuResults = cpuData?.data?.result || [];
      const memResults = memData?.data?.result || [];
      const diskResults = diskData?.data?.result || [];

      const memMap = {};
      memResults.forEach(m => { memMap[m.metric.host_name] = parseFloat(m.value[1]); });

      const diskMap = {};
      diskResults.forEach(d => { diskMap[d.metric.host_name] = parseFloat(d.value[1]); });

      return cpuResults.map((metric, index) => {
        const hostName = metric.metric.host_name || 'Database-Server-Oracle';
        return {
          id: index + 1,
          name: getFriendlyName(hostName),
          ip: getServerIp(hostName),
          cpu: parseFloat(metric.value[1]).toFixed(1),
          ram: (memMap[hostName] || 0).toFixed(1),
          disk: (diskMap[hostName] || 0).toFixed(1),
          status: 'online'
        };
      });
    } catch (e) {
      console.error('[AI MANAGER] Error fetching metrics for AI build:', e.message);
      return [];
    }
  }

  async runAnalysis(reason) {
    console.log(`[AI MANAGER] Triggering OpenAI Analysis. Reason: ${reason}`);
    try {
      const servers = await this.fetchAndBuildServers();
      const logs = await signozService.fetchLogs();
      const summaryString = await aiService.generateHealthSummary(servers, logs);
      this.cachedSummary = JSON.parse(summaryString);
      console.log(`[AI MANAGER] Successfully generated and cached AI Summary.`);
    } catch (error) {
      console.error('[AI MANAGER] Failed to run analysis:', error.message);
      // Fallback
      if (!this.cachedSummary) {
        this.cachedSummary = {
          headline: "Sentinel AI: Failed to run analysis.",
          mood: "warning",
          insights: ["Backend error."],
          daily_digest: "System check failed.",
          tip: "Check logs.",
          command: "systemctl status"
        };
      }
    }
  }

  async checkState() {
    try {
      const servers = await this.fetchAndBuildServers();
      const rawAlerts = alertService.getAlerts();
      const activeAlerts = rawAlerts.filter(a => a.status === 'active');
      
      let triggerAnalysis = false;
      let triggerReason = '';

      // 1. Event-Driven: Internal Alert Count Increased
      if (activeAlerts.length > this.lastKnownState.alertCount) {
        triggerAnalysis = true;
        triggerReason = 'New Active Alert Detected by Internal Engine';

        // Add incident history for AI context
        const incidentService = require('./incident.service');
        
        for (const alert of activeAlerts) {
          incidentService.addIncident({
            alertname: alert.title,
            severity: alert.severity,
            host: alert.host,
            fingerprint: alert.id
          });
        }
      }
      this.lastKnownState.alertCount = activeAlerts.length;

      // 2. Event-Driven: CPU Spikes > 75%
      const currentHighCpuHosts = new Set();
      servers.forEach(s => {
        if (parseFloat(s.cpu) > 75) {
          currentHighCpuHosts.add(s.name);
          if (!this.lastKnownState.highCpuHosts.has(s.name)) {
            triggerAnalysis = true;
            triggerReason = `CPU Spike on ${s.name} (>75%)`;
          }
        }
      });
      this.lastKnownState.highCpuHosts = currentHighCpuHosts;

      const now = Date.now();

      // 3. Scheduled: Hourly Briefing
      if (now - this.lastHourlyRun >= 60 * 60 * 1000) {
        triggerAnalysis = true;
        triggerReason = 'Hourly Scheduled Briefing';
        this.lastHourlyRun = now;
      }

      // 4. Scheduled: Daily Digest
      if (now - this.lastDailyRun >= 24 * 60 * 60 * 1000) {
        triggerAnalysis = true;
        triggerReason = 'Daily Scheduled Digest';
        this.lastDailyRun = now;
      }

      // 5. Initial Run if no cache exists
      if (!this.cachedSummary) {
        triggerAnalysis = true;
        triggerReason = 'Initial Boot Analysis';
      }

      if (triggerAnalysis) {
        await this.runAnalysis(triggerReason);
      }
    } catch (e) {
      console.error('[AI MANAGER] Error in checkState loop:', e.message);
    }
  }

  start() {
    console.log('[AI MANAGER] Initializing background AI manager...');
    // Run immediately on boot
    this.checkState();
    
    // Check every 60 seconds
    this.intervalId = setInterval(() => {
      this.checkState();
    }, 60000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getLatestSummary() {
    return this.cachedSummary;
  }

  async forceRun() {
    console.log('[AI MANAGER] Manual force regeneration requested...');
    await this.runAnalysis('Manual Force Reload');
    // reset timers so it doesn't immediately double-run
    this.lastHourlyRun = Date.now();
    this.lastDailyRun = Date.now();
    return this.cachedSummary;
  }
}

module.exports = new AiManagerService();
