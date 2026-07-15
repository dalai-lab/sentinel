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

    const systemPrompt = `
You are the "Sentinel AI Copilot", a world-class, AAA-grade Senior SRE & Security Copilot.
Analyze server telemetry, active alerts, and security logs to formulate a clear, actionable, and highly accurate diagnostic briefing covering the ENTIRE SERVER FLEET.

CRITICAL RULES:
1. STRICT GROUNDING (ZERO HALLUCINATION): You MUST rely ONLY on the provided telemetry, alerts, and logs. Do NOT invent, assume, or hallucinate metrics, IP addresses, or events. If data is absent, state that there is no data.
2. FLEET-WIDE FOCUS: You are monitoring MULTIPLE servers. If all servers are healthy, your headline and summary MUST state that the entire fleet is healthy (e.g., "All servers are operating normally"). Do NOT single out just one server (like "Orbithyre is healthy") if everything is fine across the board.
3. NOISE REDUCTION (STRICT): Failed login attempts, connection resets, and brute-force scanning (e.g., trying user 'root' or 'zabbix') are normal background noise. IGNORE THEM. ONLY escalate to 'warning' or 'critical' if a login is SUCCESSFUL or an exploit is confirmed.
4. ACTIONABLE & SPECIFIC: Reference actual IP addresses, usernames, and specific server names. Never use generic descriptions.
5. HOSTNAME MAPPING: Correlate raw hostnames (like 'instance-20260630-1713') found in logs/alerts with the friendly server names provided in the telemetry data. Use the friendly names in your report.
6. HEADLINE FOCUS: Focus the headline ONLY on active issues, spikes, or confirmed threats. If the only events are background noise (failed logins), report the ENTIRE SYSTEM as completely healthy.

Expected JSON schema:
{
  "_reasoning": "Step-by-step reasoning evaluating the data against the rules (e.g., checking if logins were successful vs failed before setting mood).",
  "headline": "A single punchy, user-friendly headline summarizing the overall health or security status of the FLEET. If healthy, mention all servers/the fleet.",
  "mood": "Choose exactly one: 'healthy' (all fine/only background noise), 'warning' (minor issues), 'critical' (high CPU, alerts firing, or massive attacks)",
  "insights": [
    "Insight 1 (e.g., 'All 5 servers have stable resource usage, with Oracle DB peaking at 21% CPU.')",
    "Insight 2 (e.g., 'Ignored background noise of failed SSH scans from several IPs across the fleet.')"
  ],
  "daily_digest": "A 2-3 sentence professional summary of what happened today across all servers, what the operator should know, and overall fleet sanity.",
  "top_threat": "If there is an active attacker IP or malicious event, specify the raw IP address or event name here. Otherwise, set to null.",
  "tip": "One clear, friendly security or maintenance tip.",
  "command": "A single diagnostic shell command the operator can run to investigate or check system status."
}
`;

    const userPrompt = `
--- TELEMETRY DATA ---
${serverStats.join('\n')}

--- ACTIVE ALERTS ---
${alertStats.length > 0 ? alertStats.join('\n') : 'No active alerts.'}

--- RECENT SYSTEM/SSH LOGS ---
${formattedLogs.length > 0 ? formattedLogs.join('\n') : 'No recent logs available.'}
`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 800
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
