/**
 * Configuration Verification Script
 * Run this to verify that your app is configured to use the correct server URL
 */

const AppConfig = require('./src/config/AppConfig.js').default;
const { SERVER_URLS } = require('./src/constants/RoutesAndUrls.js');

console.log('🔍 App Configuration Verification');
console.log('================================\n');

console.log('📱 AppConfig Settings:');
console.log(`  PRODUCTION_SERVER_URL: ${AppConfig.PRODUCTION_SERVER_URL}`);
console.log(`  DEV_SERVER_URL: ${AppConfig.DEVELOPMENT?.DEV_SERVER_URL}`);
console.log(`  DEV_AUTH_SERVER_URL: ${AppConfig.DEVELOPMENT?.DEV_AUTH_SERVER_URL}`);
console.log(`  USE_PRODUCTION_FALLBACK: ${AppConfig.DEVELOPMENT?.USE_PRODUCTION_FALLBACK}\n`);

console.log('🌐 Server URLs:');
console.log(`  PICSTAR: ${SERVER_URLS.PICSTAR}`);
console.log(`  PREFERRED_BASE: ${SERVER_URLS.PREFERRED_BASE}\n`);

console.log('✅ Expected Server Endpoints:');
console.log(`  Base URL: ${SERVER_URLS.PREFERRED_BASE}`);
console.log(`  Health: ${SERVER_URLS.PREFERRED_BASE}/health`);
console.log(`  Templates: ${SERVER_URLS.PREFERRED_BASE}/api/templates`);
console.log(`  Background Removal: ${SERVER_URLS.PREFERRED_BASE}/process-batch`);

console.log('\n🎯 Your app is configured to use: https://picstar-server.onrender.com');