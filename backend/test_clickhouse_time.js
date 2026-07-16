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
    const payload = {
      start: Date.now() - 365 * 24 * 60 * 60 * 1000,
      end: Date.now(),
      requestType: 'raw',
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: 'clickhouse_sql',
            spec: {
              name: 'A',
              query: `SELECT min(timestamp), max(timestamp) FROM signoz_logs.logs_v2 WHERE (body ILIKE '%sshd%' OR body ILIKE '%crowdsec%')`
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
    console.log('Result:', JSON.stringify(response.data?.data?.data?.results[0]?.rows));
  } catch (err) {
    console.error(err.response?.data?.error || err.message);
  }
}
test();
