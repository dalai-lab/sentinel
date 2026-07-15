const config = require('../config/env');

/**
 * Automates the creation of Alert Rules in SigNoz using the Service Account API Key.
 * This runs once on backend startup.
 */
async function provisionDefaultAlerts() {
  if (!config.SIGNOZ_API_KEY) {
    console.warn('[ALERTS] Skipping alert provisioning: SIGNOZ_API_KEY is missing.');
    return;
  }

  const alertsToProvision = [
    {
      alert: "Sentinel: CPU Critical (>90%)",
      alertType: "METRIC_BASED_ALERT",
      ruleType: "promql_rule",
      version: "v5",
      evalWindow: "5m",
      frequency: "1m",
      condition: {
        compositeQuery: {
          queryType: "promql",
          promqlQuery: "100 - (avg by (host_name) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
        },
        op: "1",
        target: 90,
        matchType: "4"
      },
      labels: { severity: "critical", source: "sentinel" },
      annotations: {
        summary: "CPU above 90% on {{ $labels.host_name }}",
        description: "Fleet server is CPU critical. Immediate attention required."
      },
      disabled: false,
      preferredChannels: []
    },
    {
      alert: "Sentinel: Disk Critical (>85%)",
      alertType: "METRIC_BASED_ALERT",
      ruleType: "promql_rule",
      version: "v5",
      evalWindow: "5m",
      frequency: "1m",
      condition: {
        compositeQuery: {
          queryType: "promql",
          promqlQuery: "100 - ((avg by (host_name) (node_filesystem_avail_bytes{mountpoint=\"/\"}) * 100) / avg by (host_name) (node_filesystem_size_bytes{mountpoint=\"/\"}))"
        },
        op: "1",
        target: 85,
        matchType: "4"
      },
      labels: { severity: "critical", source: "sentinel" },
      annotations: {
        summary: "Disk above 85% on {{ $labels.host_name }}",
        description: "Server storage is critically full."
      },
      disabled: false,
      preferredChannels: []
    }
  ];

  console.log('[ALERTS] Provisioning default security & infrastructure alerts to SigNoz...');

  for (const rule of alertsToProvision) {
    try {
      const response = await fetch(`${config.SIGNOZ_URL}/api/v1/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY
        },
        body: JSON.stringify(rule)
      });

      const text = await response.text();
      if (response.ok) {
        console.log(`[ALERTS] ✅ Successfully provisioned alert: ${rule.alert}`);
      } else {
        console.log(`[ALERTS] ⚠️ Rule "${rule.alert}" status: ${response.status} — ${text.slice(0, 120)}`);
      }
    } catch (error) {
      console.log(`[ALERTS] ❌ Error provisioning ${rule.alert}: ${error.message}`);
    }
  }
}

module.exports = {
  provisionDefaultAlerts
};
