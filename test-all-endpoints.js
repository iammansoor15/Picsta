/**
 * Comprehensive Endpoint Testing Script
 * Tests all server endpoints to verify they're working
 */

const BASE_URLS = [
  'http://localhost:10000',
  'http://192.168.1.46:10000'
];

// Test cases for all endpoints
const ENDPOINTS = {
  'Root & Health': [
    { method: 'GET', path: '/', expectedStatus: 200, description: 'API root/status' },
    { method: 'GET', path: '/health', expectedStatus: 200, description: 'Health check' },
    { method: 'POST', path: '/test', expectedStatus: 200, description: 'Test endpoint', body: { test: 'data' } },
  ],
  
  'Image Processing': [
    { method: 'POST', path: '/process', expectedStatus: [400, 413], description: 'Single image processing (no file)' },
    { method: 'POST', path: '/process-batch', expectedStatus: [400, 413], description: 'Batch processing (no files)' },
    { method: 'GET', path: '/status/test-job-id', expectedStatus: 404, description: 'Job status (non-existent)' },
    { method: 'GET', path: '/cleanup-stats', expectedStatus: 200, description: 'Cleanup stats' },
  ],
  
  'Templates': [
    { method: 'GET', path: '/api/templates/health', expectedStatus: 200, description: 'Templates health check' },
    { method: 'GET', path: '/api/templates', expectedStatus: 200, description: 'List all templates' },
    { method: 'GET', path: '/api/templates/batch', expectedStatus: 200, description: 'Batch fetch templates' },
    { method: 'GET', path: '/api/templates/category/birthday', expectedStatus: 200, description: 'Templates by category' },
    { method: 'POST', path: '/api/templates/upload', expectedStatus: 400, description: 'Upload template (no file)' },
  ],
  
  'Videos': [
    { method: 'GET', path: '/api/videos/health', expectedStatus: 200, description: 'Videos health check' },
    { method: 'POST', path: '/api/videos/upload', expectedStatus: 400, description: 'Upload video (no file)' },
  ],
  
  'Authentication': [
    { method: 'POST', path: '/api/auth/register', expectedStatus: [400, 422], description: 'Register (no data)' },
    { method: 'POST', path: '/api/auth/login', expectedStatus: [400, 401], description: 'Login (no credentials)' },
    { method: 'POST', path: '/api/auth/send-otp', expectedStatus: [400, 422], description: 'Send OTP (no phone)' },
    { method: 'POST', path: '/api/auth/check-otp', expectedStatus: [400, 422], description: 'Check OTP (no data)' },
    { method: 'POST', path: '/api/auth/verify-otp', expectedStatus: [400, 422], description: 'Verify OTP (no data)' },
    { method: 'POST', path: '/api/auth/resend-otp', expectedStatus: [400, 422], description: 'Resend OTP (no phone)' },
    { method: 'GET', path: '/api/auth/me', expectedStatus: 401, description: 'Get user profile (no auth)' },
  ],
  
  'Profile Photo': [
    { method: 'GET', path: '/api/profile-photo/test', expectedStatus: 200, description: 'Profile photo test endpoint' },
    { method: 'GET', path: '/api/profile-photo', expectedStatus: 401, description: 'Get profile photo (no auth)' },
    { method: 'POST', path: '/api/profile-photo/upload', expectedStatus: 401, description: 'Upload profile photo (no auth)' },
    { method: 'DELETE', path: '/api/profile-photo', expectedStatus: 401, description: 'Delete profile photo (no auth)' },
  ],
  
  'Payments': [
    { method: 'POST', path: '/api/payments/create-order', expectedStatus: 401, description: 'Create payment order (no auth)' },
    { method: 'POST', path: '/api/payments/verify-payment', expectedStatus: 401, description: 'Verify payment (no auth)' },
    { method: 'GET', path: '/api/payments/transactions', expectedStatus: 401, description: 'Get transactions (no auth)' },
  ],
  
  '404 Tests': [
    { method: 'GET', path: '/api/nonexistent', expectedStatus: 404, description: 'Non-existent endpoint' },
    { method: 'POST', path: '/api/fake/route', expectedStatus: 404, description: 'Fake route' },
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(baseUrl, test) {
  const url = `${baseUrl}${test.path}`;
  const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
  
  try {
    const options = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (test.body) {
      options.body = JSON.stringify(test.body);
    }
    
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      const text = await response.text();
      responseData = { raw: text.substring(0, 100) };
    }
    
    const statusMatch = expectedStatuses.includes(response.status);
    const status = statusMatch ? '✅' : '❌';
    const statusColor = statusMatch ? 'green' : 'red';
    const jsonStatus = isJson ? '📄 JSON' : '⚠️  HTML';
    
    log(`  ${status} ${test.method.padEnd(6)} ${test.path}`, statusColor);
    log(`     Status: ${response.status} (expected: ${expectedStatuses.join(' or ')}) | ${jsonStatus}`, 'gray');
    log(`     ${test.description}`, 'gray');
    
    if (!statusMatch) {
      log(`     Response: ${JSON.stringify(responseData).substring(0, 80)}...`, 'yellow');
    }
    
    return {
      success: statusMatch && isJson,
      status: response.status,
      isJson,
      path: test.path
    };
  } catch (error) {
    log(`  ❌ ${test.method.padEnd(6)} ${test.path}`, 'red');
    log(`     Error: ${error.message}`, 'red');
    log(`     ${test.description}`, 'gray');
    
    return {
      success: false,
      error: error.message,
      path: test.path
    };
  }
}

async function testServer(baseUrl) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`Testing Server: ${baseUrl}`, 'cyan');
  log('='.repeat(80), 'cyan');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: 0
  };
  
  for (const [category, tests] of Object.entries(ENDPOINTS)) {
    log(`\n${category}:`, 'blue');
    
    for (const test of tests) {
      results.total++;
      const result = await testEndpoint(baseUrl, test);
      
      if (result.error) {
        results.errors++;
      } else if (result.success) {
        results.passed++;
      } else {
        results.failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  // Summary
  log(`\n${'='.repeat(80)}`, 'cyan');
  log('Summary:', 'cyan');
  log(`  Total Tests: ${results.total}`, 'blue');
  log(`  ✅ Passed: ${results.passed}`, 'green');
  log(`  ❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'gray');
  log(`  ⚠️  Errors: ${results.errors}`, results.errors > 0 ? 'yellow' : 'gray');
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`  Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');
  log('='.repeat(80), 'cyan');
  
  return results;
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║              PicStar Server - Comprehensive Endpoint Test             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════╝', 'cyan');
  
  log('\nThis script tests all server endpoints to verify they are working correctly.');
  log('Expected behaviors:', 'gray');
  log('  • Health/status endpoints should return 200 OK with JSON', 'gray');
  log('  • Auth-required endpoints should return 401 with JSON (not HTML!)', 'gray');
  log('  • Upload endpoints without files should return 400 with JSON', 'gray');
  log('  • Non-existent endpoints should return 404 with JSON (not HTML!)', 'gray');
  
  let workingServer = null;
  
  for (const baseUrl of BASE_URLS) {
    const results = await testServer(baseUrl);
    
    if (results.passed > 0 && !workingServer) {
      workingServer = baseUrl;
    }
  }
  
  if (workingServer) {
    log(`\n✅ Server is accessible at: ${workingServer}`, 'green');
  } else {
    log('\n❌ No accessible servers found!', 'red');
    log('\nTroubleshooting:', 'yellow');
    log('  1. Make sure the server is running: cd C:\\Picstar\\PicStar_Server && npm start', 'gray');
    log('  2. Check if the server restarted with the latest code', 'gray');
    log('  3. Verify MongoDB connection in server logs', 'gray');
    log('  4. Check firewall settings if testing from network IP', 'gray');
  }
  
  log('\n');
}

main().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
