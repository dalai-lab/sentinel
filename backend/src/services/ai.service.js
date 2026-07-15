const { OpenAI } = require('openai');
const config = require('../config/env');

let openai = null;
if (config.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
  });
}

// Map ugly hostnames to friendly names (we can duplicate the logic here to pass cleaner text to AI)
const FRIENDLY_NAMES = {
  'instance-20260630-1713': 'Oracle Master',
  'Database-Server-Oracle': 'Oracle Master',
  'srv1213878': 'Orbithyre',
  'srv1176513': 'Gaplytiq',
  'srv1055295': 'Dalai'
};

async function generateHealthSummary(servers) {
  if (!openai) {
    return "AI Engine is offline (Missing OpenAI API Key). All servers appear healthy based on raw telemetry.";
  }

  try {
    if (!servers || servers.length === 0) {
      return "Sentinel AI: Waiting for telemetry data from agents...";
    }

    const serverStats = servers.map(s => `- ${s.name}: CPU ${s.cpu}%, RAM ${s.ram}%`);

    const prompt = `
You are the "Sentinel AI", an autonomous SRE agent monitoring a server fleet.
Here is the current real-time telemetry from the fleet:
${serverStats.join('\n')}

Write a SINGLE, short, concise, punchy sentence summarizing the health of the fleet.
Focus ONLY on the most critical or highest metric. If everything is under 70%, just say everything is healthy and nominal. 
Do not use markdown. Do not add conversational filler. Be professional.
`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 60
    });

    return `Sentinel AI: ${response.choices[0].message.content.trim()}`;
  } catch (error) {
    console.error('[AI SERVICE] Error generating summary:', error.message);
    return "Sentinel AI: Unable to analyze telemetry at this time.";
  }
}

module.exports = {
  generateHealthSummary
};
