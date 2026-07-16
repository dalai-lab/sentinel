const axios = require('axios');
const config = require('./src/config/env');

async function run() {
    console.log('Querying SigNoz API for the 03:03 AM log...');
    try {
        const payload = {
            start: Date.now() - (7 * 24 * 60 * 60 * 1000),
            end: Date.now(),
            requestType: 'raw',
            variables: {},
            compositeQuery: {
                queries: [
                    {
                        type: 'clickhouse_sql',
                        spec: {
                            name: 'A',
                            query: `SELECT timestamp, body, resources_string FROM signoz_logs.logs_v2 WHERE body ILIKE '%SCAN SUMMARY%' AND timestamp >= 1721079180000000000 ORDER BY timestamp DESC LIMIT 50`
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
        
        console.log(`Found ${rows.length} logs.`);
        rows.forEach(r => {
            const d = r.data;
            const timeMs = Math.floor(d.timestamp / 1000000);
            const date = new Date(timeMs);
            console.log(`[${date.toISOString()}] resources: ${JSON.stringify(d.resources_string)}`);
        });

    } catch (err) {
        console.error('Failed:', err.message);
    }
}

run();
