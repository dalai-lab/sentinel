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

async function fetchLogs(startTime, endTime) {
  try {
    const end = endTime || Date.now();
    const start = startTime || (end - 60 * 60 * 1000); // 1 hour default

    const payload = {
      start,
      end,
      requestType: 'raw',
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: 'builder_query',
            spec: {
              name: 'A',
              signal: 'logs',
              limit: 100,
              offset: 0
            }
          }
        ]
      }
    };

    const response = await axios.post(`${config.SIGNOZ_URL}/api/v5/query_range`, payload, {
      headers: {
        'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const results = response.data?.data?.data?.results || [];
    const rows = results[0]?.rows || [];

    return rows.map(r => {
      const d = r.data;
      const timeMs = Math.floor(d.timestamp / 1000000);
      const date = new Date(timeMs);
      const timeStr = date.toTimeString().split(' ')[0];

      let level = d.severity_text || 'INFO';
      if (!d.severity_text && d.body) {
        if (d.body.toLowerCase().includes('error')) level = 'ERROR';
        else if (d.body.toLowerCase().includes('warn')) level = 'WARN';
        else if (d.body.toLowerCase().includes('debug')) level = 'DEBUG';
      }

      const service = d.resources_string?.['service.name'] || d.attributes_string?.['log.file.name'] || 'system';

      return {
        time: timeStr,
        level: level.toUpperCase(),
        service: service.replace('.log', ''),
        msg: d.body
      };
    });
  } catch (error) {
    console.error('[METRICS SERVICE] Failed to fetch logs:', error.message);
    return [];
  }
}

module.exports = {
  fetchMetrics,
  fetchActiveAlerts,
  fetchLogs
};
