const signozService = require('./src/services/signoz.service');

async function test() {
  const scans = await signozService.fetchLatestScans();
  const oracle = scans.find(s => s.host === 'instance-20260630-1713');
  console.log(JSON.stringify(oracle, null, 2));
}
test();
