/** Print the configuration used by both Metro and the Android build. */
const { readAppEnvironment } = require('./scripts/app-env.cjs');

const { baseUrl, host, scheme } = readAppEnvironment();
console.log(`Base URL: ${baseUrl}`);
console.log(`App link: ${scheme}://${host}`);
console.log(`Health: ${baseUrl}/health`);
console.log(`Templates: ${baseUrl}/api/templates`);
console.log(`Deletion form: ${baseUrl}/winter/account-delete-request`);
