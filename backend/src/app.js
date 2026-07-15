const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const metricsRoutes = require('./routes/metrics.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/metrics', metricsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', configured: !!config.SIGNOZ_API_KEY });
});

module.exports = app;
