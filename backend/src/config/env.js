require('dotenv').config();

const config = {
  PORT: process.env.PORT || 3001,
  SIGNOZ_API_KEY: process.env.SIGNOZ_API_KEY,
  SIGNOZ_URL: process.env.SIGNOZ_URL || 'http://localhost:8080',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini'
};

if (!config.SIGNOZ_API_KEY) {
  console.warn("⚠️ WARNING: SIGNOZ_API_KEY is missing from .env!");
}

module.exports = config;
