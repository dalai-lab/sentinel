require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Official SigNoz Service Account API Key (Never Expires)
const SIGNOZ_API_KEY = process.env.SIGNOZ_API_KEY;

if (!SIGNOZ_API_KEY) {
  console.warn("⚠️ WARNING: SIGNOZ_API_KEY is missing from .env!");
}



// Proxy Endpoint for Metrics
app.post('/api/metrics', async (req, res) => {
  if (!SIGNOZ_API_KEY) {
    return res.status(503).json({ error: 'Backend is missing SIGNOZ_API_KEY in .env' });
  }

  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter.' });
    }

    const response = await axios.get(`${process.env.SIGNOZ_URL}/api/v1/query`, {
      params: { query },
      headers: {
        'SIGNOZ-API-KEY': SIGNOZ_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    return res.json(response.data);
  } catch (error) {
    console.error('[METRICS] Failed to proxy query:', error.message);
    return res.status(500).json({ error: 'Failed to fetch metrics from SigNoz' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', configured: !!SIGNOZ_API_KEY });
});

app.listen(PORT, () => {
  console.log(`🚀 Secure Sentinel Backend running on port ${PORT}`);
});
