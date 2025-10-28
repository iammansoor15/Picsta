import RNFS from 'react-native-fs';

/**
 * User Assets Helper
 * Provides easy access to user assets across the app
 */

class UserAssetsHelper {
  constructor() {
    this.ASSETS_DIR = `${RNFS.DocumentDirectoryPath}/assets/user`;
  }

  /**
   * Get the latest profile images for a user
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<Object|null>} Object with latest profile image paths or null
   */
  async getLatestProfileImages(phoneNumber = 'default') {
    try {
      const files = await RNFS.readDir(this.ASSETS_DIR);
      const userFiles = files.filter(file => 
        file.name.startsWith(`${phoneNumber}_`) && 
        (file.name.includes('_original_') || file.name.includes('_processed_'))
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
        
        if (file.name.includes('_original_')) {
          groupedByTimestamp[timestamp].original = file.path;
        } else if (file.name.includes('_processed_')) {
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
      const files = await RNFS.readDir(this.ASSETS_DIR);
      const userFiles = files.filter(file => 
        file.name.startsWith(`${phoneNumber}_`) && 
        (file.name.includes('_original_') || file.name.includes('_processed_'))
      );
      
      // Group by timestamp
      const groupedByTimestamp = {};
      userFiles.forEach(file => {
        const timestamp = file.name.split('_').pop().replace('.jpg', '');
        if (!groupedByTimestamp[timestamp]) {
          groupedByTimestamp[timestamp] = { timestamp };
        }
        
        if (file.name.includes('_original_')) {
          groupedByTimestamp[timestamp].original = file.path;
        } else if (file.name.includes('_processed_')) {
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
   * Check if user has profile images
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<boolean>} True if user has profile images
   */
  async hasProfileImages(phoneNumber = 'default') {
    const latest = await this.getLatestProfileImages(phoneNumber);
    return latest !== null;
  }

  /**
   * Get profile image source for Image component
   * @param {string} phoneNumber - User's phone number
   * @param {string} type - 'original' or 'processed'
   * @returns {Promise<Object>} Image source object for React Native Image component
   */
  async getProfileImageSource(phoneNumber = 'default', type = 'processed') {
    try {
      const latest = await this.getLatestProfileImages(phoneNumber);
      
      if (!latest) {
        // Import the default profile picture with error handling
        try {
          return require('../../assets/user/default_dp.png');
        } catch (error) {
          console.warn('⚠️ UserAssetsHelper: Could not load default_dp.png');
          return {
            uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iNjAiIGZpbGw9IiM4QjVDRjYiLz4KPHN2ZyB4PSIzMCIgeT0iMzAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Im0xMiAxMmMxLjY1NCAwIDMtMS4zNDYgMy0zcy0xLjM0Ni0zLTMtMy0zIDEuMzQ2LTMgM3MgMS4zNDYgMyAzIDNabTEuNSAwaCAxLjV2MTVoLTNjMCAwIDAtMS4zNDYtMS41LTMtMy0zLjMzNi0uNjQtNi42NzEtNC0xMGgyeiIvPgo8L3N2Zz4KPC9zdmc+Cg=='
          };
        }
      }
      
      const imagePath = type === 'original' ? latest.originalPath : latest.processedPath;
      
      if (!imagePath) {
        // Import the default profile picture with error handling
        try {
          return require('../../assets/user/default_dp.png');
        } catch (error) {
          console.warn('⚠️ UserAssetsHelper: Could not load default_dp.png fallback');
          return {
            uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iNjAiIGZpbGw9IiM4QjVDRjYiLz4KPHN2ZyB4PSIzMCIgeT0iMzAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Im0xMiAxMmMxLjY1NCAwIDMtMS4zNDYgMy0zcy0xLjM0Ni0zLTMtMy0zIDEuMzQ2LTMgM3MgMS4zNDYgMyAzIDNabTEuNSAwaCAxLjV2MTVoLTNjMCAwIDAtMS4zNDYtMS41LTMtMy0zLjMzNi0uNjQtNi42NzEtNC0xMGgyeiIvPgo8L3N2Zz4KPC9zdmc+Cg=='
          };
        }
      }
      
      return { uri: imagePath };
    } catch (error) {
      console.error('❌ Error getting profile image source:', error);
      // Import the default profile picture with error handling
      try {
        return require('../../assets/user/default_dp.png');
      } catch (fallbackError) {
        console.warn('⚠️ UserAssetsHelper: Could not load default_dp.png in catch block');
        return {
          uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iNjAiIGZpbGw9IiM4QjVDRjYiLz4KPHN2ZyB4PSIzMCIgeT0iMzAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Im0xMiAxMmMxLjY1NCAwIDMtMS4zNDYgMy0zcy0xLjM0Ni0zLTMtMy0zIDEuMzQ2LTMgM3MgMS4zNDYgMyAzIDNabTEuNSAwaCAxLjV2MTVoLTNjMCAwIDAtMS4zNDYtMS41LTMtMy0zLjMzNi0uNjQtNi42NzEtNC0xMGgyeiIvPgo8L3N2Zz4KPC9zdmc+Cg=='
        };
      }
    }
  }

  /**
   * Get the assets directory path
   * @returns {string} Path to assets directory
   */
  getAssetsDir() {
    return this.ASSETS_DIR;
  }
}

// Export singleton instance
export default new UserAssetsHelper();

