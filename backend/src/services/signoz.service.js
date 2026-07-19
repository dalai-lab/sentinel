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

async function fetchMetricsRange(query, start, end, step) {
  try {
    const response = await axios.get(`${config.SIGNOZ_URL}/api/v1/query_range`, {
      params: { query, start, end, step },
      headers: {
        'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('[METRICS SERVICE] Failed to proxy query_range:', error.message);
    throw new Error('Failed to fetch time-series metrics from SigNoz');
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

async function fetchLogs(startTime, endTime, type, search) {
  try {
    const end = endTime || Date.now();
    const start = startTime || (end - 60 * 60 * 1000); // 1 hour default
    const startNano = start * 1000000;
    const endNano = end * 1000000;

    let compositeQuery;

    if (type === 'ssh') {
      compositeQuery = {
        queries: [
          {
            type: 'clickhouse_sql',
            spec: {
              name: 'A',
              query: `SELECT timestamp, body, severity_text, resources_string, attributes_string FROM signoz_logs.logs_v2 WHERE (body ILIKE '%sshd%' OR body ILIKE '%crowdsec%') AND timestamp >= ${startNano} AND timestamp <= ${endNano} ORDER BY timestamp DESC LIMIT 10000`
            }
          }
        ]
      };
    } else {
      let query = `SELECT timestamp, body, severity_text, resources_string, attributes_string FROM signoz_logs.logs_v2 WHERE timestamp >= ${startNano} AND timestamp <= ${endNano}`;
      if (search) {
        const safeSearch = search.replace(/'/g, "''");
        query += ` AND body ILIKE '%${safeSearch}%'`;
      }
      query += ` ORDER BY timestamp DESC LIMIT 5000`;

      compositeQuery = {
        queries: [
          {
            type: 'clickhouse_sql',
            spec: {
              name: 'A',
              query: query
            }
          }
        ]
      };
    }

    const payload = {
      start,
      end,
      requestType: 'raw',
      variables: {},
      compositeQuery
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

      // Prefer host.name from resource labels (actual hostname like srv1213878)
      const host = d.resources_string?.['host.name'] || '';
      const service = d.resources_string?.['service.name'] || d.attributes_string?.['log.file.name'] || 'system';

      return {
        rawTs: date.toISOString(),
        time: timeStr,
        level: level.toUpperCase(),
        // Use host.name as service identifier so SSH card can map to friendly server name
        service: host || service.replace('.log', ''),
        msg: d.body
      };
    });
  } catch (error) {
    console.error('[METRICS SERVICE] Failed to fetch logs:', error.message);
    return [];
  }
}

async function fetchLatestScans() {
  try {
    const end = Date.now();
    const start = end - (7 * 24 * 60 * 60 * 1000); // look back up to 7 days
    const startNano = start * 1000000;
    const endNano = end * 1000000;

    const query1 = `SELECT timestamp, resources_string FROM signoz_logs.logs_v2 WHERE timestamp >= ${startNano} AND timestamp <= ${endNano} AND body ILIKE '%SCAN SUMMARY%' ORDER BY timestamp DESC LIMIT 100`;

    const compositeQuery1 = {
      queries: [{ type: 'clickhouse_sql', spec: { name: 'A', query: query1 } }]
    };

    const payload1 = {
      start, end, requestType: 'raw', variables: {}, compositeQuery: compositeQuery1
    };

    let response = await axios.post(`${config.SIGNOZ_URL}/api/v5/query_range`, payload1, {
      headers: {
        'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const rows = response.data?.data?.data?.results[0]?.rows || [];
    
    const latestScansMap = {};
    rows.forEach(r => {
      const d = r.data;
      const host = d.resources_string?.['host.name'] || 'unknown';
      if (!latestScansMap[host]) {
        latestScansMap[host] = d.timestamp; // keep as nanoseconds string/number
      }
    });

    const finalScans = [];

    // Step 2: Fetch the surrounding lines to reconstruct the summary body
    for (const host of Object.keys(latestScansMap)) {
      const tsNano = latestScansMap[host];
      // Search from 24 hours before the summary (to catch long scans) to 15 seconds after
      const windowStartNano = Number(tsNano) - (24 * 60 * 60 * 1000 * 1000000);
      const windowEndNano = Number(tsNano) + (15 * 1000 * 1000000);
      
      const query2 = `SELECT body FROM signoz_logs.logs_v2 WHERE timestamp >= ${windowStartNano} AND timestamp <= ${windowEndNano} AND resources_string['host.name'] = '${host}' ORDER BY timestamp DESC LIMIT 2000`;
      
      const compositeQuery2 = {
        queries: [{ type: 'clickhouse_sql', spec: { name: 'A', query: query2 } }]
      };

      const payload2 = {
        start: Math.floor(windowStartNano / 1000000), 
        end: Math.floor(windowEndNano / 1000000), 
        requestType: 'raw', variables: {}, compositeQuery: compositeQuery2
      };

      try {
        const res2 = await axios.post(`${config.SIGNOZ_URL}/api/v5/query_range`, payload2, {
          headers: { 'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY, 'Content-Type': 'application/json' }
        });
        
        let subRows = res2.data?.data?.data?.results[0]?.rows || [];
        // Reverse because we queried DESC to ensure we don't truncate the summary end,
        // but our parsing logic expects chronological (ASC) order
        subRows = subRows.reverse();
        
        const lines = subRows.map(r => r.data.body);

        // ── Find all SCAN SUMMARY block boundaries ──────────────────────────
        // Lines are ASC (oldest → newest). Each ClamAV scan prints FOUND lines
        // BEFORE its own SCAN SUMMARY header. Multiple scans may exist in the window.
        const summaryIndices = lines.reduce((acc, line, idx) => {
          if (line && line.includes('SCAN SUMMARY')) acc.push(idx);
          return acc;
        }, []);

        if (summaryIndices.length === 0) continue;

        // Build all scan blocks: { preSummary, body, pf, infectedCount }
        // Each block spans from after the PREVIOUS summary to just before the NEXT summary.
        // Lines are ASC (oldest → newest). FOUND lines appear BEFORE their own SCAN SUMMARY header.
        const scanBlocks = summaryIndices.map((summaryIdx, i) => {
          const blockStart = i === 0 ? 0 : summaryIndices[i - 1] + 1;
          const preSummary = lines.slice(blockStart, summaryIdx); // FOUND lines before summary header
          // Only slice the immediate details following THIS summary, to prevent bleeding from previous scans
          const bodyLines = lines.slice(summaryIdx, summaryIdx + 50); 
          const body = bodyLines.join('\n');
          const pf = (regex, def = '') => { const m = body.match(regex); return m ? m[1].trim() : def; };
          const infectedCount = parseInt(pf(/Infected files:\s*(\d+)/, '0'));
          return { summaryIdx, preSummary, body, pf, infectedCount };
        });

        // Always use the absolute latest scan. This ensures if an admin remediates
        // a virus and runs a new clean scan, the dashboard immediately updates to clean.
        const chosen = scanBlocks[scanBlocks.length - 1];

        const { preSummary, body, pf, infectedCount } = chosen;

        // Extract FOUND lines from the chosen scan's pre-summary section only
        const rawInfectedList = preSummary
          .filter(line => line && line.includes('FOUND'))
          .map(line => {
            const match = line.match(/^(.+?):\s+(.+?)\s+FOUND/);
            if (!match) return null;
            return { path: match[1].trim(), threatName: match[2].trim() };
          })
          .filter(item => item && item.path.startsWith('/'));

        // Deduplicate by path + threatName
        const uniqueMap = new Map();
        rawInfectedList.forEach(item => {
          uniqueMap.set(`${item.path}::${item.threatName}`, item);
        });
        const infectedFilesList = infectedCount > 0 ? Array.from(uniqueMap.values()) : [];

        finalScans.push({
          host,
          timestamp: Math.floor(Number(tsNano) / 1000000),
          knownViruses: pf(/Known viruses:\s*(.*)/),
          engineVersion: pf(/Engine version:\s*(.*)/),
          scannedDirectories: pf(/Scanned directories:\s*(.*)/),
          scannedFiles: pf(/Scanned files:\s*(.*)/),
          infectedFiles: infectedCount,
          infectedFilesList,
          dataScanned: pf(/Data scanned:\s*(.*)/),
          dataRead: pf(/Data read:\s*(.*)/),
          timeTaken: pf(/Time:\s*(.*)/),
          startDate: pf(/Start Date:\s*(.*)/),
          endDate: pf(/End Date:\s*(.*)/)
        });
      } catch (err) {
        console.error(`[METRICS SERVICE] Failed to fetch scan lines for host ${host}:`, err.message);
      }
    }

    return finalScans;
  } catch (error) {
    console.error('[METRICS SERVICE] Failed to fetch latest scans:', error.message);
    return [];
  }
}

module.exports = {
  fetchMetrics,
  fetchMetricsRange,
  fetchActiveAlerts,
  fetchLogs,
  fetchLatestScans
};
