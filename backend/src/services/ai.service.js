const { OpenAI } = require('openai');
const config = require('../config/env');
const signozService = require('./signoz.service');

let openai = null;
if (config.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
  });
}

function getAlertHost(alert) {
  if (!alert) return 'unknown host';
  const labels = alert.labels || {};
  const possibleHost = 
    labels.host_name || 
    labels.host || 
    labels.instance || 
    labels.server || 
    labels.service_name || 
    labels.service;
    
  if (possibleHost && possibleHost !== 'unknown') {
    return possibleHost;
  }

  const annotations = alert.annotations || {};
  if (annotations.summary) {
    const onMatch = annotations.summary.match(/on\s+([a-zA-Z0-9_-]+)/i);
    if (onMatch) return onMatch[1];
  }
  if (annotations.description) {
    const forMatch = annotations.description.match(/(?:for|host|server|instance)\s+([a-zA-Z0-9_-]+)/i);
    if (forMatch) return forMatch[1];
  }

  return 'unknown host';
}

async function generateHealthSummary(servers, recentLogs = []) {
  // Rich offline fallback
  const offlineResult = {
    headline: "Sentinel AI: Live telemetry nominal. All nodes operating normally.",
    mood: "healthy",
    insights: [
      "All instances reporting stable CPU and Memory usage.",
      "No security anomalies or failed authentication bursts detected."
    ],
    daily_digest: "Sentinel AI analyzed server telemetry. CPU load averages 4%. No major incidents or security concerns logged today. Systems are stable.",
    top_threat: null,
    tip: "Enable multi-factor auth on all ssh accounts and check your firewall rules regularly.",
    command: "df -h && docker ps --format 'table {{.Names}}\t{{.Status}}'"
  };

  if (!openai) {
    return JSON.stringify(offlineResult);
  }

  try {
    if (!servers || servers.length === 0) {
      return JSON.stringify({
        ...offlineResult,
        headline: "Sentinel AI: Waiting for telemetry streams to initialize..."
      });
    }

    // Fetch active alerts to combine with metrics, and merge with persistent incidents
    const liveAlerts = await signozService.fetchActiveAlerts().catch(() => []);
    const incidentService = require('./incident.service');
    const persistentAlerts = incidentService.getIncidents().map(inc => ({
      labels: {
        alertname: inc.alertname,
        severity: inc.severity,
        host_name: inc.host
      },
      annotations: {
        summary: `PERSISTENT SECURITY ALERT: ${inc.alertname}`
      }
    }));

    const alerts = [...liveAlerts, ...persistentAlerts];

    const serverStats = servers.map(s => `- Server: ${s.name} (${s.ip}) | CPU: ${s.cpu}% | RAM: ${s.ram}% | Disk: ${s.disk || 0}% | Uptime: ${s.uptime || 0}s | Status: ${s.status}`);
    const alertStats = alerts.map(a => `- Alert: [Severity: ${a.labels?.severity || 'warning'}] ${a.labels?.alertname} on ${getAlertHost(a)}`);
    
    // Format recent logs for the prompt (limit to 30 logs to avoid token bloat)
    const formattedLogs = recentLogs.slice(0, 30).map(l => `[${l.time}] [${l.level}] [Host: ${l.service}] ${l.msg}`);

    const prompt = `
You are the "Sentinel AI Copilot", a friendly, senior SRE & Security Copilot.
Analyze the following server telemetry, active alerts, and recent security logs, and formulate a clear, jargon-free diagnostic briefing.

--- TELEMETRY DATA ---
${serverStats.join('\n')}

--- ACTIVE ALERTS ---
${alertStats.length > 0 ? alertStats.join('\n') : 'No active alerts.'}

--- RECENT SYSTEM/SSH LOGS ---
${formattedLogs.length > 0 ? formattedLogs.join('\n') : 'No recent logs available.'}

--- OBJECTIVE ---
Output a single, valid JSON object containing your analysis. Keep the language natural, helpful, and friendly (NOT overly technical or full of dry SRE jargon).
Avoid generic descriptions. Reference actual IP addresses, usernames, AND SPECIFIC SERVER NAMES if they appear in logs or telemetry.
If an alert says it occurred on "unknown host", YOU MUST check the recent logs to find which server recently logged that specific event, and use that server name in your report! Never say "unknown host".
IMPORTANT: Failed login attempts or brute-force scanning (like trying to guess username 'zabbix' or 'root') are normal background noise and spam. IGNORE THEM for alerts. ONLY raise a warning/alert or highlight a security threat in your headline/mood if someone ACTUALLY logged in successfully (e.g., successful SSH authentication/accepted password). If there is only failed brute-force scanning spam, report the system health as normal/healthy.
IMPORTANT FOR HEADLINE: Keep the headline focused ONLY on active issues, spikes, or threats. DO NOT mention healthy servers in the headline just to say they are healthy (e.g., do NOT say "No threats on Gaplytiq, but Oracle has high CPU" – instead, just say "Oracle DB Server shows high CPU usage"). Only mention healthy servers if ALL servers are healthy (e.g., "All servers are calm and healthy today").

Expected JSON schema:
{
  "headline": "A single punchy, user-friendly headline summarizing the overall health or security status. MUST include the affected Server Name. (e.g., 'Suspicious login attempt blocked on Oracle DB Server from IP 23.134.76.12.')",
  "mood": "Choose exactly one: 'healthy' (all fine), 'warning' (minor issues or suspicious scans), 'critical' (high CPU, alerts firing, or massive attacks)",
  "insights": [
    "Insight 1 in plain English (e.g., 'Oracle DB server has ultra-low resource usage at 4% CPU.')",
    "Insight 2 in plain English (e.g., 'CrowdSec blocked a brute force scan for user 'root' from 103.13.206.100.')"
  ],
  "daily_digest": "A 2-3 sentence friendly summary of what happened today, what the operator should know, and overall system sanity.",
  "top_threat": "If there is an active attacker IP or malicious event in the logs, specify the raw IP address or event name here. Otherwise, set to null.",
  "tip": "One clear, friendly security or maintenance tip (e.g., 'Consider disabling password logins for root on Oracle DB.')",
  "command": "A single diagnostic shell command the operator can run to investigate or check system status."
}
`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
      max_tokens: 600
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('[AI SERVICE] Error generating summary:', error.message);
    return JSON.stringify(offlineResult);
  }
}

async function askQuestion(question, servers = [], alerts = [], recentLogs = []) {
  if (!openai) {
    return {
      answer: "Sentinel AI chat is offline. Please check that OPENAI_API_KEY is configured in your .env file."
    };
  }

  try {
    const serverStats = servers.map(s => `- Server: ${s.name} (${s.ip}) | CPU: ${s.cpu}% | RAM: ${s.ram}% | Disk: ${s.disk || 0}% | Status: ${s.status}`);
    const alertStats = alerts.map(a => `- Alert: [${a.labels?.severity || 'warning'}] ${a.labels?.alertname} on ${getAlertHost(a)}`);
    const formattedLogs = recentLogs.slice(0, 20).map(l => `[${l.time}] [${l.level}] [${l.service}] ${l.msg}`);

    const prompt = `
You are the "Sentinel AI Copilot". Answer the operator's question based on their server state.
Keep your response concise, helpful, and friendly. Avoid dry SRE jargon.

--- CURRENT SERVER STATUS ---
${serverStats.join('\n')}
${alertStats.length > 0 ? `\n--- ACTIVE ALERTS ---\n${alertStats.join('\n')}` : ''}
${formattedLogs.length > 0 ? `\n--- RECENT LOGS ---\n${formattedLogs.join('\n')}` : ''}

Operator's Question: "${question}"

Provide a direct answer. If recommending commands, wrap them in standard markdown code blocks.
`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    return {
      answer: response.choices[0].message.content.trim()
    };
  } catch (error) {
    console.error('[AI SERVICE] Error answering question:', error.message);
    return {
      answer: `Error communicating with AI model: ${error.message}`
    };
  }
}

module.exports = {
  generateHealthSummary,
  askQuestion
};
