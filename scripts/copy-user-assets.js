const fs = require('fs');
const path = require('path');


const SOURCE_DIR = path.join(__dirname, '../android/app/src/main/assets/user_assets');
const TARGET_DIR = path.join(__dirname, '../assets/user');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log('📁 Created assets/user directory');
}

function copyUserAssets() {
  try {
    if (!fs.existsSync(SOURCE_DIR)) {
      console.log('📁 No user assets found to copy');
      return;
    }

    const files = fs.readdirSync(SOURCE_DIR);
    let copiedCount = 0;

    files.forEach(file => {
      const sourcePath = path.join(SOURCE_DIR, file);
      const targetPath = path.join(TARGET_DIR, file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`📁 Copied: ${file}`);
        copiedCount++;
      }
    });

    console.log(`✅ Copied ${copiedCount} user assets to assets/user`);
  } catch (error) {
    console.error('❌ Error copying user assets:', error);
  }
}
copyUserAssets();