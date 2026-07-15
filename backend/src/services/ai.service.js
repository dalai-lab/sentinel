const { OpenAI } = require('openai');
const config = require('../config/env');
const signozService = require('./signoz.service');

let openai = null;
if (config.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
  });
}

async function generateHealthSummary(servers) {
  // If OpenAI is offline, provide mock smart SRE data so the UI does not break
  const offlineResult = {
    status: "Sentinel AI Copilot: Telemetry nominal. No critical events detected.",
    diagnostics: [
      "All tracked instances reporting stable resource parameters.",
      "Database read/write latency is within target baseline bounds."
    ],
    advice: "Monitor disk space on Dalai nodes. Setup proactive alert notification rules.",
    command: "df -h && docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
  };

  if (!openai) {
    return JSON.stringify(offlineResult);
  }

  try {
    if (!servers || servers.length === 0) {
      return JSON.stringify({
        ...offlineResult,
        status: "Sentinel AI: Waiting for telemetry streams to initialize..."
      });
    }

    // Fetch active alerts to combine with metrics
    const alerts = await signozService.fetchActiveAlerts().catch(() => []);

    const serverStats = servers.map(s => `- ${s.name}: CPU ${s.cpu}%, RAM ${s.ram}%, Disk ${s.disk}%, Uptime ${s.uptime}s, Status ${s.status}`);
    const alertStats = alerts.map(a => `- [${a.labels?.severity || 'warning'}] ${a.labels?.alertname} firing on ${a.labels?.host_name || 'unknown host'}`);

    const prompt = `
You are the "Sentinel AI Copilot", a senior Site Reliability Engineer (SRE) agent.
Analyze the current server telemetry and active alert states to formulate a professional diagnostic report.

--- TELEMETRY DATA ---
${serverStats.join('\n')}

--- ACTIVE ALERTS ---
${alertStats.length > 0 ? alertStats.join('\n') : 'No active alert rules firing.'}

--- OBJECTIVE ---
Output a single, valid JSON object containing SRE advice. Do not wrap in markdown code blocks. Keep the text concise and professional.

Expected JSON schema:
{
  "status": "A punchy summary sentence of the server health (max 80 chars).",
  "diagnostics": [
    "Insight 1 (e.g. Host X memory is high, possibly due to DB cache)",
    "Insight 2 (e.g. No active alerts are firing, systems are stable)"
  ],
  "advice": "SRE advice or recommendation on what steps to take.",
  "command": "A single bash/powershell command that the operator can run to diagnose or mitigate the specific issue."
}
`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 300
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('[AI SERVICE] Error generating summary:', error.message);
    return JSON.stringify({
      status: "Sentinel AI Copilot: Diagnostic stream temporarily unavailable.",
      diagnostics: ["Telemetry analysis interrupted. Check backend connection logs."],
      advice: "Verify SigNoz connectivity and API key settings.",
      command: "curl -s http://localhost:3001/api/metrics/alerts"
    });
  }
}

module.exports = {
  generateHealthSummary
};
