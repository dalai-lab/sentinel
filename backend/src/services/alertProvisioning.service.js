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
      alert: "CPU_Critical_90",
      expr: "100 - (avg by (host_name) (rate(node_cpu_seconds_total{mode='idle'}[1m])) * 100) > 90",
      labels: { severity: "critical" },
      annotations: { summary: "CPU is above 90% for {{ $labels.host_name }}" }
    },
    {
      alert: "CrowdSec_Ban_Detected",
      expr: "rate(crowdsec_bans_total[5m]) > 0",
      labels: { severity: "warning" },
      annotations: { summary: "CrowdSec has banned an IP on {{ $labels.host_name }}" }
    }
  ];

  console.log('[ALERTS] Provisioning default security & infrastructure alerts to SigNoz...');

  for (const rule of alertsToProvision) {
    try {
      // Depending on the SigNoz version, the Rules API is typically at /api/v1/rules
      // We send the alert definition to ensure the backend is fully synchronized with the agent capabilities.
      const response = await fetch(`${config.SIGNOZ_URL}/api/v1/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.SIGNOZ_API_KEY}`
        },
        body: JSON.stringify(rule)
      });

      if (response.ok) {
        console.log(`[ALERTS] Successfully provisioned alert: ${rule.alert}`);
      } else {
        // If the API endpoint differs or rule already exists, we fail gracefully to prevent crashing
        console.log(`[ALERTS] Rule ${rule.alert} provision status: ${response.status} (May already exist)`);
      }
    } catch (error) {
      console.log(`[ALERTS] Error provisioning ${rule.alert}: ${error.message}`);
    }
  }
}

module.exports = {
  provisionDefaultAlerts
};
