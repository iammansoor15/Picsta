// Test script to verify video template data is preserved correctly
const cloudinaryTemplateService = require('./src/services/CloudinaryTemplateService').default;

async function testVideoTemplates() {
  console.log('🧪 Testing Video Template Fixes\n');
  console.log('='.repeat(80));
  
  try {
    // Fetch Hindu congratulations templates
    console.log('📡 Fetching Hindu congratulations templates...\n');
    
    const result = await cloudinaryTemplateService.getTemplatesByCategory('congratulations', {
      religion: 'hindu',
      page: 1,
      limit: 21,
      useCache: false
    });
    
    const templates = result.templates || [];
    console.log(`✅ Fetched ${templates.length} templates\n`);
    
    // Find video templates
    const videoTemplates = templates.filter(t => t.resource_type === 'video' || t.video_url);
    const imageTemplates = templates.filter(t => !(t.resource_type === 'video' || t.video_url));
    
    console.log('📊 Template Breakdown:');
    console.log(`  - Video templates: ${videoTemplates.length}`);
    console.log(`  - Image templates: ${imageTemplates.length}`);
    console.log(`  - Total: ${templates.length}\n`);
    
    // Test video templates
    if (videoTemplates.length > 0) {
      console.log('🎥 VIDEO TEMPLATES TEST:\n');
      
      videoTemplates.forEach((template, idx) => {
        const hasVideoUrl = !!template.video_url;
        const hasImageUrl = !!template.image_url;
        const hasResourceType = !!template.resource_type;
        
        const passed = hasVideoUrl && hasResourceType && template.resource_type === 'video';
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} Video Template ${idx + 1} (Serial: ${template.serial_no}):`);
        console.log(`  - video_url: ${hasVideoUrl ? '✅ Present' : '❌ Missing'}`);
        console.log(`  - image_url: ${hasImageUrl ? '✅ Present (thumbnail)' : '⚠️ Missing'}`);
        console.log(`  - resource_type: ${hasResourceType ? `✅ ${template.resource_type}` : '❌ Missing'}`);
        
        if (hasVideoUrl) {
          console.log(`  - Video URL: ${template.video_url.substring(0, 70)}...`);
        }
        if (hasImageUrl) {
          console.log(`  - Image URL: ${template.image_url.substring(0, 70)}...`);
        }
        console.log('');
        
        if (!passed) {
          console.error('❌ TEST FAILED: Video template missing required fields!\n');
        }
      });
    } else {
      console.log('⚠️ No video templates found in response\n');
    }
    
    // Test image templates
    console.log('🖼️  IMAGE TEMPLATES SAMPLE:\n');
    const sampleImages = imageTemplates.slice(0, 3);
    
    sampleImages.forEach((template, idx) => {
      const hasImageUrl = !!template.image_url;
      const noVideoUrl = !template.video_url;
      
      const passed = hasImageUrl && noVideoUrl;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      
      console.log(`${status} Image Template ${idx + 1} (Serial: ${template.serial_no}):`);
      console.log(`  - image_url: ${hasImageUrl ? '✅ Present' : '❌ Missing'}`);
      console.log(`  - video_url: ${noVideoUrl ? '✅ Null (correct)' : '❌ Should be null'}`);
      console.log(`  - Image URL: ${template.image_url?.substring(0, 70)}...`);
      console.log('');
    });
    
    // Overall test result
    console.log('='.repeat(80));
    const allVideosPassed = videoTemplates.every(t => 
      t.video_url && t.resource_type === 'video'
    );
    const allImagesPassed = imageTemplates.every(t => 
      t.image_url && !t.video_url
    );
    
    if (allVideosPassed && allImagesPassed) {
      console.log('✅ ALL TESTS PASSED! Video templates are properly configured.\n');
      console.log('Next steps:');
      console.log('1. Run the React Native app');
      console.log('2. Navigate to HeroScreen');
      console.log('3. Swipe to video templates (Serial 15, 16)');
      console.log('4. Verify videos auto-play and loop');
    } else {
      console.log('❌ TESTS FAILED! Some templates have incorrect configuration.\n');
      if (!allVideosPassed) {
        console.log('- Video templates are missing video_url or resource_type');
      }
      if (!allImagesPassed) {
        console.log('- Image templates incorrectly have video_url set');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run tests
testVideoTemplates();
