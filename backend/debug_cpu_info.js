/**
 * debug_cpu_info.js
 * Run from: d:\INTERNSHIP\server dashboard\backend
 * Usage:    node debug_cpu_info.js
 *
 * Queries the local backend for several CPU-related Prometheus metrics
 * and prints every label key/value so we can see what's available.
 */

const BACKEND = 'http://localhost:3001/api/metrics';

const HOSTS = [
  'instance-20260630-1713',  // Oracle
  'srv1213878',              // Orbithyre
  'srv1176513',              // Gaplytiq
  'srv1055295'               // Dalai
];

const QUERIES = [
  { name: 'node_cpu_info (per-host)',  q: (h) => `node_cpu_info{host_name="${h}"}` },
  { name: 'node_cpu_info (no filter)', q: ()  => `node_cpu_info` },
  { name: 'node_uname_info',          q: (h) => `node_uname_info{host_name="${h}"}` },
  { name: 'node_os_info',             q: (h) => `node_os_info{host_name="${h}"}` },
];

async function post(query) {
  const res = await fetch(BACKEND, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return res.json();
}

function printResult(name, query, data) {
  const results = data?.data?.result || [];
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  QUERY : ${name}`);
  console.log(`  PromQL: ${query}`);
  console.log(`  HITS  : ${results.length}`);
  if (results.length === 0) {
    console.log('  ⚠️  No results — metric not collected or host_name label missing');
  } else {
    results.slice(0, 3).forEach((r, i) => {
      console.log(`\n  [result ${i}] labels:`);
      Object.entries(r.metric || {}).forEach(([k, v]) => {
        console.log(`    ${k.padEnd(22)} = ${v}`);
      });
      console.log(`  value = ${r.value?.[1]}`);
    });
    if (results.length > 3) console.log(`  ... and ${results.length - 3} more`);
  }
}

async function main() {
  console.log('=== CPU / OS Info Metric Debug ===\n');
  console.log('Checking which hosts have data...\n');

  // First: check what hosts exist at all
  const cpuQuery = 'node_cpu_seconds_total{mode="idle"}';
  const cpuData  = await post(cpuQuery);
  const hosts    = [...new Set((cpuData?.data?.result || []).map(r => r.metric?.host_name).filter(Boolean))];
  console.log(`Hosts with node_cpu_seconds_total data:`);
  hosts.forEach(h => console.log(`  • ${h}`));

  // Check each interesting query
  for (const { name, q } of QUERIES) {
    if (name.includes('no filter')) {
      // Run without host filter
      const data = await post(q());
      printResult(name, q(), data);
    } else {
      // Run for first known host
      const h    = hosts[0] || HOSTS[0];
      const query = q(h);
      const data  = await post(query);
      printResult(name, query, data);
    }
  }

  // Also check if node_cpu_info exists at all without any filter
  console.log(`\n${'─'.repeat(60)}`);
  console.log('  Checking all available node_cpu* metric names...\n');

  const metricNames = [
    'node_cpu_info',
    'node_cpu_info_total',
    'node_cpufreq_current_hertz',
    'node_cpufreq_minimum_hertz',
    'node_cpufreq_maximum_hertz',
  ];

  for (const m of metricNames) {
    try {
      const d = await post(m);
      const count = d?.data?.result?.length || 0;
      const status = count > 0 ? `✅ ${count} series` : '❌ not found';
      console.log(`  ${m.padEnd(40)} ${status}`);
      if (count > 0) {
        // Print all label keys from first result
        const labels = Object.keys(d.data.result[0]?.metric || {});
        console.log(`    labels: ${labels.join(', ')}`);
      }
    } catch {
      console.log(`  ${m.padEnd(40)} ⚠️  fetch error`);
    }
  }

  console.log('\n=== Done ===\n');
}

main().catch(console.error);
