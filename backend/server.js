const app = require('./src/app');
const config = require('./src/config/env');

app.listen(config.PORT, () => {
  console.log(`🚀 Secure Sentinel Backend running on port ${config.PORT}`);
});
