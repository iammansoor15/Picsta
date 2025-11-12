/**
 * Test script to verify payment endpoints are accessible
 * Run this to check if the server is properly configured
 */

const TEST_SERVERS = [
  'http://localhost:10000',
  'http://192.168.1.46:10000', // Your local network IP
  'https://picstar-server.onrender.com'
];

async function testEndpoint(baseUrl, endpoint) {
  try {
    const url = `${baseUrl}${endpoint}`;
    console.log(`\nTesting: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const contentType = response.headers.get('content-type');
    console.log(`  Status: ${response.status}`);
    console.log(`  Content-Type: ${contentType}`);

    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } catch (e) {
        console.log(`  JSON parse error: ${e.message}`);
      }
    } else {
      const text = await response.text();
      console.log(`  Response (first 100 chars): ${text.substring(0, 100)}...`);
    }

    return response.ok;
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function testServer(baseUrl) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing server: ${baseUrl}`);
  console.log('='.repeat(60));

  // Test health endpoint
  const healthOk = await testEndpoint(baseUrl, '/health');
  
  if (!healthOk) {
    console.log(`❌ Server not reachable at ${baseUrl}`);
    return false;
  }

  console.log(`✅ Server is running at ${baseUrl}`);
  
  // Test payment endpoint (should fail without auth, but should return JSON)
  console.log('\nTesting payment endpoints (expect 401 unauthorized):');
  await testEndpoint(baseUrl, '/api/payments/create-order');
  
  return true;
}

async function main() {
  console.log('Payment Endpoint Test Script');
  console.log('============================\n');
  console.log('This script tests if payment endpoints are properly configured.');
  console.log('Expected behavior:');
  console.log('  - /health should return 200 OK');
  console.log('  - /api/payments/* should return JSON (401 if not authenticated)');
  console.log('  - Should NOT return HTML error pages\n');

  let foundWorkingServer = false;

  for (const server of TEST_SERVERS) {
    const works = await testServer(server);
    if (works && !foundWorkingServer) {
      foundWorkingServer = true;
      console.log(`\n✅ Found working server: ${server}`);
      console.log(`\nTo use this server in your app, make sure BackgroundRemovalService`);
      console.log(`is configured with this URL.`);
    }
  }

  if (!foundWorkingServer) {
    console.log('\n❌ No working servers found!');
    console.log('\nTroubleshooting:');
    console.log('  1. Make sure the server is running: cd PicStar_Server && npm start');
    console.log('  2. Check your network IP in TEST_SERVERS array');
    console.log('  3. Verify firewall settings allow connections on port 10000');
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
