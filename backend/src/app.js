const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const metricsRoutes = require('./routes/metrics.routes');
const alertsRoutes = require('./routes/alerts.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/metrics', metricsRoutes);
app.use('/api/alerts', alertsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', configured: !!config.SIGNOZ_API_KEY });
});

const aiManagerService = require('./services/aiManager.service');
const alertService = require('./services/alert.service');

// Start background daemons
alertService.start();
aiManagerService.start();

module.exports = app;
