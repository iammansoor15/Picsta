/**
 * Test script to verify subcategory API calls are working correctly
 * Run this with: node test-subcategory.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'https://picstar-server.onrender.com';

async function testSubcategory(subcategory) {
  try {
    console.log(`\n🔍 Testing subcategory: ${subcategory}`);
    const url = `${BASE_URL}/api/templates?subcategory=${encodeURIComponent(subcategory)}`;
    console.log(`📡 Request URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const templates = data?.data?.templates || [];
    
    console.log(`✅ Found ${templates.length} templates for "${subcategory}"`);
    
    if (templates.length > 0) {
      console.log('📋 Template details:');
      templates.forEach((template, index) => {
        console.log(`  ${index + 1}. Serial: ${template.serial_no}, Subcategory: ${template.subcategory}, Main: ${template.main_category}`);
      });
    } else {
      console.log('⚠️  No templates found for this subcategory');
    }
    
    return templates;
  } catch (error) {
    console.error(`❌ Error testing ${subcategory}:`, error.message);
    return [];
  }
}

async function runTests() {
  console.log('🚀 Starting subcategory API tests...');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  // Test different subcategories
  const subcategories = ['congratulations', 'birthday', 'anniversary', 'wedding'];
  
  for (const subcategory of subcategories) {
    await testSubcategory(subcategory);
  }
  
  // Test the base API without filters
  console.log('\n🔍 Testing base API without filters');
  try {
    const response = await fetch(`${BASE_URL}/api/templates`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      const templates = data?.data?.templates || [];
      console.log(`✅ Base API returned ${templates.length} templates`);
      
      // Group by subcategory
      const bySubcategory = {};
      templates.forEach(template => {
        const sub = template.subcategory || 'unknown';
        if (!bySubcategory[sub]) bySubcategory[sub] = 0;
        bySubcategory[sub]++;
      });
      
      console.log('📊 Templates by subcategory:');
      Object.entries(bySubcategory).forEach(([sub, count]) => {
        console.log(`  - ${sub}: ${count} templates`);
      });
    }
  } catch (error) {
    console.error('❌ Error testing base API:', error.message);
  }
  
  console.log('\n🎉 Tests completed!');
}

runTests();