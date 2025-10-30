import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNERS_DIRECTORY = `${RNFS.DocumentDirectoryPath}/banners`;
const BANNERS_LIST_KEY = '@user_banners_list';

class BannerStorageService {
  constructor() {
    this.ensureDirectoryExists();
  }

  // Ensure banners directory exists
  async ensureDirectoryExists() {
    try {
      const exists = await RNFS.exists(BANNERS_DIRECTORY);
      if (!exists) {
        await RNFS.mkdir(BANNERS_DIRECTORY);
        console.log('✅ Banners directory created:', BANNERS_DIRECTORY);
      }
    } catch (error) {
      console.error('❌ Error creating banners directory:', error);
    }
  }

  // Save a banner to storage
  async saveBanner(uri) {
    try {
      await this.ensureDirectoryExists();

      // Clean the source URI (remove file:// prefix if present for copyFile)
      const cleanUri = uri.replace(/^file:\/\//, '');
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `banner_${timestamp}.png`;
      const destPath = `${BANNERS_DIRECTORY}/${filename}`;

      console.log('💾 Saving banner:', {
        sourceUri: uri,
        cleanUri,
        destPath
      });

      // Copy file to banners directory
      await RNFS.copyFile(cleanUri, destPath);
      console.log('✅ Banner file copied successfully');
      
      // Verify the file was created
      const exists = await RNFS.exists(destPath);
      if (!exists) {
        throw new Error('Banner file was not created at destination');
      }
      
      const stat = await RNFS.stat(destPath);
      console.log('✅ Banner saved to:', destPath, 'Size:', stat.size, 'bytes');

      // Get existing list
      const list = await this.listBanners();
      
      // Add new banner to list
      const newBanner = {
        id: timestamp.toString(),
        uri: destPath,
        filename,
        createdAt: timestamp,
      };

      list.unshift(newBanner); // Add to beginning
      
      // Save updated list to AsyncStorage
      await AsyncStorage.setItem(BANNERS_LIST_KEY, JSON.stringify(list));
      console.log('✅ Banner added to list. Total banners:', list.length);

      return newBanner;
    } catch (error) {
      console.error('❌ Error saving banner:', error);
      throw error;
    }
  }

  // List all saved banners
  async listBanners() {
    try {
      const listJson = await AsyncStorage.getItem(BANNERS_LIST_KEY);
      const list = listJson ? JSON.parse(listJson) : [];
      
      // Verify each banner file still exists
      const validBanners = [];
      for (const banner of list) {
        try {
          const exists = await RNFS.exists(banner.uri);
          if (exists) {
            validBanners.push(banner);
          } else {
            console.warn('⚠️ Banner file not found, removing from list:', banner.uri);
          }
        } catch (e) {
          console.warn('⚠️ Error checking banner file:', e);
        }
      }

      // Update list if any banners were removed
      if (validBanners.length !== list.length) {
        await AsyncStorage.setItem(BANNERS_LIST_KEY, JSON.stringify(validBanners));
      }

      return validBanners;
    } catch (error) {
      console.error('❌ Error listing banners:', error);
      return [];
    }
  }

  // Remove a banner
  async removeBanner(bannerId) {
    try {
      const list = await this.listBanners();
      const banner = list.find(b => b.id === bannerId);
      
      if (!banner) {
        console.warn('⚠️ Banner not found:', bannerId);
        return false;
      }

      // Delete file
      try {
        const exists = await RNFS.exists(banner.uri);
        if (exists) {
          await RNFS.unlink(banner.uri);
          console.log('✅ Banner file deleted:', banner.uri);
        }
      } catch (e) {
        console.warn('⚠️ Error deleting banner file:', e);
      }

      // Remove from list
      const updatedList = list.filter(b => b.id !== bannerId);
      await AsyncStorage.setItem(BANNERS_LIST_KEY, JSON.stringify(updatedList));
      console.log('✅ Banner removed from list. Remaining:', updatedList.length);

      return true;
    } catch (error) {
      console.error('❌ Error removing banner:', error);
      throw error;
    }
  }

  // Clear all banners
  async clearAllBanners() {
    try {
      const list = await this.listBanners();
      
      // Delete all files
      for (const banner of list) {
        try {
          const exists = await RNFS.exists(banner.uri);
          if (exists) {
            await RNFS.unlink(banner.uri);
          }
        } catch (e) {
          console.warn('⚠️ Error deleting banner file:', e);
        }
      }

      // Clear list
      await AsyncStorage.removeItem(BANNERS_LIST_KEY);
      console.log('✅ All banners cleared');

      return true;
    } catch (error) {
      console.error('❌ Error clearing banners:', error);
      throw error;
    }
  }
}

export default new BannerStorageService();
