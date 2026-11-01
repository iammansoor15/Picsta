// Standalone script to fetch Hindu congratulations templates
// Uses the app's build environment.

const { baseUrl } = require('./scripts/app-env.cjs').readAppEnvironment();
const API_URLS = [`${baseUrl}/api/templates`];

async function testApiUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function findWorkingApiUrl() {
  console.log('🔍 Testing API URLs...\n');
  
  for (const url of API_URLS) {
    console.log(`Testing: ${url}`);
    const isWorking = await testApiUrl(url);
    if (isWorking) {
      console.log(`✅ Found working API: ${url}\n`);
      return url;
    }
  }
  
  throw new Error('❌ No working API URL found');
}

async function fetchHinduCongratulationsTemplates() {
  try {
    console.log('🔍 Fetching Hindu congratulations templates...\n');

    // Find working API URL
    const baseURL = await findWorkingApiUrl();
    
    // Build request URL
    const params = new URLSearchParams({
      page: '1',
      limit: '50',
      sort_by: 'created_at',
      order: 'desc'
    });
    
    const url = `${baseURL}/category/hindu/congratulations?${params.toString()}`;
    console.log(`📡 Fetching from: ${url}\n`);
    
    // Make request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }
    
    const templates = result.data?.templates || [];

    console.log(`✅ Found ${templates.length} templates\n`);
    console.log('='.repeat(80));

    templates.forEach((template, index) => {
      console.log(`\n${index + 1}. Template ID: ${template.id || template._id}`);
      console.log(`   Serial No: ${template.serial_no || 'N/A'}`);
      console.log(`   Name: ${template.name || 'N/A'}`);
      console.log(`   Resource Type: ${template.resource_type || 'image'}`);
      
      if (template.resource_type === 'video') {
        console.log(`   🎥 VIDEO_URL: ${template.video_url || 'N/A'}`);
        console.log(`   📷 Thumbnail: ${template.image_url || 'N/A'}`);
      } else {
        console.log(`   🖼️  IMAGE_URL: ${template.image_url || template.secure_url || template.url || 'N/A'}`);
      }
      
      console.log(`   Category: ${template.category || template.subcategory || 'N/A'}`);
      console.log(`   Main Category: ${template.main_category || 'N/A'}`);
      console.log(`   Ratio: ${template.ratio || 'N/A'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Total: ${templates.length} templates`);
    console.log(`📄 Pagination:`, JSON.stringify(result.data?.pagination || {}, null, 2));

    // Export URLs only
    console.log('\n\n📋 MEDIA URLs:\n');
    templates.forEach((template, index) => {
      const url = template.resource_type === 'video' 
        ? template.video_url 
        : (template.image_url || template.secure_url || template.url);
      const type = template.resource_type === 'video' ? '[VIDEO]' : '[IMAGE]';
      console.log(`${index + 1}. ${type} ${url}`);
    });

  } catch (error) {
    console.error('❌ Error fetching templates:', error.message);
    console.error(error);
  }
}

// Run the function
fetchHinduCongratulationsTemplates();
