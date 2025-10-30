/**
 * Debug script to check banner storage
 * 
 * Add this to a component to debug banner storage:
 * 
 * import BannerStorageService from './src/services/BannerStorageService';
 * import RNFS from 'react-native-fs';
 * 
 * // Add a button that calls this:
 * const debugBanners = async () => {
 *   try {
 *     console.log('🔍 DEBUG: Starting banner storage check...');
 *     
 *     // Check directory
 *     const bannersDir = `${RNFS.DocumentDirectoryPath}/banners`;
 *     console.log('📁 Banners directory:', bannersDir);
 *     
 *     const dirExists = await RNFS.exists(bannersDir);
 *     console.log('📁 Directory exists:', dirExists);
 *     
 *     if (dirExists) {
 *       const files = await RNFS.readDir(bannersDir);
 *       console.log('📂 Files in directory:', files.length);
 *       files.forEach((file, idx) => {
 *         console.log(`  [${idx}] ${file.name} - ${file.size} bytes - ${file.isFile() ? 'FILE' : 'DIR'}`);
 *       });
 *     }
 *     
 *     // Check AsyncStorage
 *     const list = await BannerStorageService.listBanners();
 *     console.log('💾 Banners in storage:', list.length);
 *     list.forEach((banner, idx) => {
 *       console.log(`  [${idx}] ID: ${banner.id}`);
 *       console.log(`       URI: ${banner.uri}`);
 *       console.log(`       Filename: ${banner.filename}`);
 *       console.log(`       Created: ${new Date(banner.createdAt).toLocaleString()}`);
 *     });
 *     
 *     // Test file access
 *     for (const banner of list) {
 *       const exists = await RNFS.exists(banner.uri);
 *       console.log(`📄 File ${banner.filename} exists:`, exists);
 *       if (exists) {
 *         const stat = await RNFS.stat(banner.uri);
 *         console.log(`   Size: ${stat.size} bytes`);
 *         console.log(`   Path: ${stat.path}`);
 *       }
 *     }
 *     
 *     console.log('✅ DEBUG: Banner storage check complete');
 *   } catch (error) {
 *     console.error('❌ DEBUG: Error checking banners:', error);
 *   }
 * };
 */

// Example usage in UserBannersScreen:
// Add this button temporarily:
/*
<TouchableOpacity
  style={{ padding: 20, backgroundColor: 'blue', margin: 10 }}
  onPress={async () => {
    const bannersDir = `${RNFS.DocumentDirectoryPath}/banners`;
    const dirExists = await RNFS.exists(bannersDir);
    console.log('Directory exists:', dirExists);
    if (dirExists) {
      const files = await RNFS.readDir(bannersDir);
      console.log('Files:', files.map(f => ({ name: f.name, size: f.size })));
    }
    const list = await BannerStorageService.listBanners();
    console.log('Banners list:', list);
  }}
>
  <Text style={{ color: 'white' }}>DEBUG BANNERS</Text>
</TouchableOpacity>
*/

module.exports = {};
