import fs from 'fs';

async function run() {
    const end = Date.now();
    const start = end - (24 * 60 * 60 * 1000);
    const url = `http://localhost:3001/api/metrics/logs?startTime=${start}&endTime=${end}&search=SCAN%20SUMMARY`;
    
    console.log(`Fetching from: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Frontend API returned ${data.length} logs.`);
    data.forEach(r => {
        console.log(`[${r.rawTs}] [${r.service}] : ${r.msg.substring(0, 40).replace(/\n/g, ' ')}...`);
    });
}

run();
