const axios = require('axios');
const config = require('../config/env');

async function fetchMetrics(query) {
  try {
    const response = await axios.get(`${config.SIGNOZ_URL}/api/v1/query`, {
      params: { query },
      headers: {
        'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('[METRICS SERVICE] Failed to proxy query:', error.message);
    throw new Error('Failed to fetch metrics from SigNoz');
  }
}

async function fetchActiveAlerts() {
  try {
    const response = await axios.get(`${config.SIGNOZ_URL}/api/v1/alerts`, {
      headers: {
        'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('[METRICS SERVICE] Failed to fetch active alerts:', error.message);
    return [];
  }
}

module.exports = {
  fetchMetrics,
  fetchActiveAlerts
};
