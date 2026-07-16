const signozService = require('../services/signoz.service');
const aiService = require('../services/ai.service');
const config = require('../config/env');

async function getMetrics(req, res) {
  if (!config.SIGNOZ_API_KEY) {
    return res.status(503).json({ error: 'Backend is missing SIGNOZ_API_KEY in .env' });
  }

  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter.' });
    }

    const data = await signozService.fetchMetrics(query);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getMetricsRange(req, res) {
  if (!config.SIGNOZ_API_KEY) {
    return res.status(503).json({ error: 'Backend is missing SIGNOZ_API_KEY in .env' });
  }

  try {
    const { query, start, end, step } = req.body;
    if (!query || !start || !end || !step) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const data = await signozService.fetchMetricsRange(query, start, end, step);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

const aiManagerService = require('../services/aiManager.service');

async function getAiSummary(req, res) {
  try {
    const { servers, logs } = req.body;
    const aiSummary = await aiService.generateHealthSummary(servers, logs);
    return res.json({ aiSummary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getLatestAiSummary(req, res) {
  try {
    const summary = aiManagerService.getLatestSummary();
    if (!summary) {
      return res.status(503).json({ error: 'AI Summary is still generating.' });
    }
    // Summary is already an object from cached JSON.parse
    return res.json({ aiSummary: JSON.stringify(summary) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function forceAiSummary(req, res) {
  try {
    const summary = await aiManagerService.forceRun();
    return res.json({ aiSummary: JSON.stringify(summary) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

const incidentService = require('../services/incident.service');

async function getIncidents(req, res) {
  try {
    const list = incidentService.getIncidents();
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function clearIncidents(req, res) {
  try {
    incidentService.clearIncidents();
    // Force AI regeneration immediately so it clears from AI headline too!
    const summary = await aiManagerService.forceRun();
    return res.json({ success: true, aiSummary: JSON.stringify(summary) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function askAi(req, res) {
  try {
    const { question, servers, alerts, logs } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Missing question in request body' });
    }
    const result = await aiService.askQuestion(question, servers, alerts, logs);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getMetrics,
  getAiSummary,
  getLatestAiSummary,
  forceAiSummary,
  getIncidents,
  clearIncidents,
  askAi,
  getMetricsRange
};
