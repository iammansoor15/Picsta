import RNFS from 'react-native-fs';

/**
 * User Assets Service
 * Manages user-specific assets (profile pictures, etc.) that can be accessed across the app
 */
class UserAssetsService {
  constructor() {
    // Save to the app's assets/user directory
    this.USER_ASSETS_DIR = `${RNFS.DocumentDirectoryPath}/assets/user`;
    this.ensureUserAssetsDir();
  }

  /**
   * Ensure the user assets directory exists
   */
  async ensureUserAssetsDir() {
    try {
      const dirExists = await RNFS.exists(this.USER_ASSETS_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.USER_ASSETS_DIR);
        console.log('📁 Created user assets directory:', this.USER_ASSETS_DIR);
      } else {
        console.log('📁 User assets directory already exists:', this.USER_ASSETS_DIR);
      }
    } catch (error) {
      console.error('❌ Error creating user assets directory:', error);
    }
  }

  /**
   * Save a profile image (original and processed versions)
   * @param {string} originalUri - URI of the original image
   * @param {string} processedUri - URI of the processed image
   * @param {string} phoneNumber - User's phone number for naming
   * @returns {Promise<Object>} Object with paths to saved images
   */
  async saveProfileImages(originalUri, processedUri, phoneNumber = 'default') {
    try {
      console.log('💾 UserAssetsService: Starting to save profile images');
      console.log('💾 Original URI:', originalUri);
      console.log('💾 Processed URI:', processedUri);
      console.log('💾 Phone number:', phoneNumber);
      
      await this.ensureUserAssetsDir();
      
      const timestamp = Date.now();
      const originalFileName = `${phoneNumber}_original_image_${timestamp}.jpg`;
      const processedFileName = `${phoneNumber}_updated_image_${timestamp}.jpg`;
      
      const originalPath = `${this.USER_ASSETS_DIR}/${originalFileName}`;
      const processedPath = `${this.USER_ASSETS_DIR}/${processedFileName}`;
      
      console.log('💾 Saving original_image to:', originalPath);
      console.log('💾 Saving updated_image to:', processedPath);
      
      // Copy original image to assets/user
      await RNFS.copyFile(originalUri, originalPath);
      console.log('📁 Original profile image saved as original_image:', originalPath);
      
      // Copy processed image to assets/user
      await RNFS.copyFile(processedUri, processedPath);
      console.log('📁 Processed profile image saved as updated_image:', processedPath);
      
      return {
        originalPath,
        processedPath,
        originalFileName,
        processedFileName,
        timestamp
      };
    } catch (error) {
      console.error('❌ Error saving profile images:', error);
      throw error;
    }
  }

  /**
   * Get the latest profile images for a user
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<Object|null>} Object with latest profile image paths or null
   */
  async getLatestProfileImages(phoneNumber = 'default') {
    try {
      await this.ensureUserAssetsDir();
      
      const files = await RNFS.readDir(this.USER_ASSETS_DIR);
      const userFiles = files.filter(file => 
        file.name.startsWith(`${phoneNumber}_`) && 
        (file.name.includes('_original_image_') || file.name.includes('_updated_image_'))
      );
      
      if (userFiles.length === 0) {
        return null;
      }
      
      // Group by timestamp
      const groupedByTimestamp = {};
      userFiles.forEach(file => {
        const timestamp = file.name.split('_').pop().replace('.jpg', '');
        if (!groupedByTimestamp[timestamp]) {
          groupedByTimestamp[timestamp] = {};
        }
        
        if (file.name.includes('_original_image_')) {
          groupedByTimestamp[timestamp].original = file.path;
        } else if (file.name.includes('_updated_image_')) {
          groupedByTimestamp[timestamp].processed = file.path;
        }
      });
      
      // Get the latest timestamp
      const timestamps = Object.keys(groupedByTimestamp).sort((a, b) => parseInt(b) - parseInt(a));
      const latest = groupedByTimestamp[timestamps[0]];
      
      return {
        originalPath: latest.original,
        processedPath: latest.processed,
        timestamp: timestamps[0]
      };
    } catch (error) {
      console.error('❌ Error getting latest profile images:', error);
      return null;
    }
  }

  /**
   * Get all profile images for a user
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<Array>} Array of profile image objects
   */
  async getAllProfileImages(phoneNumber = 'default') {
    try {
      await this.ensureUserAssetsDir();
      
      const files = await RNFS.readDir(this.USER_ASSETS_DIR);
      const userFiles = files.filter(file => 
        file.name.startsWith(`${phoneNumber}_`) && 
        (file.name.includes('_original_image_') || file.name.includes('_updated_image_'))
      );
      
      // Group by timestamp
      const groupedByTimestamp = {};
      userFiles.forEach(file => {
        const timestamp = file.name.split('_').pop().replace('.jpg', '');
        if (!groupedByTimestamp[timestamp]) {
          groupedByTimestamp[timestamp] = { timestamp };
        }
        
        if (file.name.includes('_original_image_')) {
          groupedByTimestamp[timestamp].original = file.path;
        } else if (file.name.includes('_updated_image_')) {
          groupedByTimestamp[timestamp].processed = file.path;
        }
      });
      
      return Object.values(groupedByTimestamp).sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
    } catch (error) {
      console.error('❌ Error getting all profile images:', error);
      return [];
    }
  }

  /**
   * Delete old profile images (keep only the latest N sets)
   * @param {string} phoneNumber - User's phone number
   * @param {number} keepCount - Number of latest image sets to keep (default: 3)
   */
  async cleanupOldProfileImages(phoneNumber = 'default', keepCount = 3) {
    try {
      const allImages = await this.getAllProfileImages(phoneNumber);
      
      if (allImages.length <= keepCount) {
        return;
      }
      
      const imagesToDelete = allImages.slice(keepCount);
      
      for (const imageSet of imagesToDelete) {
        if (imageSet.original) {
          await RNFS.unlink(imageSet.original);
          console.log('🗑️ Deleted old original image:', imageSet.original);
        }
        if (imageSet.processed) {
          await RNFS.unlink(imageSet.processed);
          console.log('🗑️ Deleted old processed image:', imageSet.processed);
        }
      }
      
      console.log(`🧹 Cleaned up ${imagesToDelete.length} old profile image sets`);
    } catch (error) {
      console.error('❌ Error cleaning up old profile images:', error);
    }
  }


  /**
   * Get the user assets directory path
   * @returns {string} Path to user assets directory
   */
  getUserAssetsDir() {
    return this.USER_ASSETS_DIR;
  }
}

// Export singleton instance
export default new UserAssetsService();
