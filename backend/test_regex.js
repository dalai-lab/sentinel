const axios = require('axios');
const config = require('./src/config/env');

async function run() {
    const end = Date.now();
    const start = end - (7 * 24 * 60 * 60 * 1000);
    const startNano = start * 1000000;
    const endNano = end * 1000000;

    // 1. Find the latest SCAN SUMMARY for each host
    const query1 = `SELECT timestamp, resources_string FROM signoz_logs.logs_v2 WHERE timestamp >= ${startNano} AND timestamp <= ${endNano} AND body ILIKE '%SCAN SUMMARY%' ORDER BY timestamp DESC LIMIT 100`;

    let response = await axios.post(`${config.SIGNOZ_URL}/api/v5/query_range`, {
      start, end, requestType: 'raw', variables: {},
      compositeQuery: { queries: [{ type: 'clickhouse_sql', spec: { name: 'A', query: query1 } }] }
    }, { headers: { 'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY, 'Content-Type': 'application/json' } });

    const rows = response.data?.data?.data?.results[0]?.rows || [];
    
    const latestScansMap = {};
    rows.forEach(r => {
      const d = r.data;
      const host = d.resources_string?.['host.name'] || 'unknown';
      if (!latestScansMap[host]) {
        latestScansMap[host] = d.timestamp;
      }
    });

    // 2. Fetch the surrounding logs for each host
    for (const host of Object.keys(latestScansMap)) {
      const tsNano = latestScansMap[host];
      // 5 seconds window
      const windowEndNano = tsNano + (5 * 1000 * 1000000); 
      
      const query2 = `SELECT body FROM signoz_logs.logs_v2 WHERE timestamp >= ${tsNano} AND timestamp <= ${windowEndNano} AND resources_string['host.name'] = '${host}' ORDER BY timestamp ASC LIMIT 50`;
      
      response = await axios.post(`${config.SIGNOZ_URL}/api/v5/query_range`, {
        start: Math.floor(tsNano/1000000), end: Math.floor(windowEndNano/1000000), requestType: 'raw', variables: {},
        compositeQuery: { queries: [{ type: 'clickhouse_sql', spec: { name: 'A', query: query2 } }] }
      }, { headers: { 'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY, 'Content-Type': 'application/json' } });

      const subRows = response.data?.data?.data?.results[0]?.rows || [];
      const lines = subRows.map(r => r.data.body);
      const fullBody = lines.join('\\n');
      
      console.log(`\n--- Host: ${host} ---`);
      console.log(fullBody);
      
      const parseField = (regex, defaultVal = '') => {
        const match = fullBody.match(regex);
        return match ? match[1].trim() : defaultVal;
      };

      console.log('Parsed Infected files:', parseField(/Infected files:\\s*(\\d+)/));
      console.log('Parsed Scanned files:', parseField(/Scanned files:\\s*(.*)/));
    }
}

run();
