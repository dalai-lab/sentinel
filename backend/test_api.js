const axios = require('axios');
const config = require('./src/config/env');

async function run() {
    console.log('Testing backend API directly...');
    try {
        const end = Date.now();
        const start = end - (24 * 60 * 60 * 1000); // Past 24 hours

        const response = await axios.get(`http://localhost:${config.PORT}/api/metrics/logs`, {
            params: {
                startTime: start,
                endTime: end,
                search: 'SCAN SUMMARY'
            }
        });

        const rows = response.data;
        console.log(`API returned ${rows.length} logs.`);
        
        rows.forEach(r => {
            console.log(`[${r.rawTs}] [${r.service}] : ${r.msg.substring(0, 40)}...`);
        });

    } catch (err) {
        console.error('Failed:', err.message);
        if (err.response) console.error(err.response.data);
    }
}

run();
