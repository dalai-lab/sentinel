const app = require('./src/app');
const config = require('./src/config/env');
const alertProvisioningService = require('./src/services/alertProvisioning.service');

app.listen(config.PORT, () => {
  console.log(`🚀 Secure Sentinel Backend running on port ${config.PORT}`);
  
  // Provision default security alerts asynchronously
  alertProvisioningService.provisionDefaultAlerts();
});
