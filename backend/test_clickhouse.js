const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const config = {
  SIGNOZ_URL: process.env.SIGNOZ_URL,
  SIGNOZ_API_KEY: process.env.SIGNOZ_API_KEY
};

async function test() {
  try {
    const end = Date.now();
    const start = end - 7 * 24 * 60 * 60 * 1000;
    const startNano = start * 1000000;
    const endNano = end * 1000000;

    const payload = {
      start,
      end,
      requestType: 'raw',
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: 'clickhouse_sql',
            spec: {
              name: 'A',
              query: `SELECT timestamp, body, severity_text, resources_string, attributes_string FROM signoz_logs.logs_v2 WHERE (body ILIKE '%sshd%' OR body ILIKE '%crowdsec%') AND timestamp >= ${startNano} AND timestamp <= ${endNano} ORDER BY timestamp DESC LIMIT 2000`
            }
          }
        ]
      }
    };

    const response = await axios.post(config.SIGNOZ_URL + '/api/v5/query_range', payload, {
      headers: {
        'SIGNOZ-API-KEY': config.SIGNOZ_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log('Results length:', response.data?.data?.data?.results[0]?.rows?.length);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
