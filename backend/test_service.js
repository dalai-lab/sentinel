const service = require('./src/services/signoz.service.js');

async function run() {
  console.log('Testing fetchLatestScans...');
  const scans = await service.fetchLatestScans();
  console.log(JSON.stringify(scans, null, 2));
}

run();
