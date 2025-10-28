import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const STORAGE_KEYS = {
  PROFILE_ORIGINAL: '@profile_picture_original',
  PROFILE_NO_BG: '@profile_picture_no_bg',
  PROFILE_METADATA: '@profile_picture_metadata',
};

class ProfilePictureStorageService {
  constructor() {
    this.appDirectory = `${RNFS.DocumentDirectoryPath}/profile_pictures`;
    this.initializeDirectory();
  }

  async initializeDirectory() {
    try {
      const dirExists = await RNFS.exists(this.appDirectory);
      if (!dirExists) {
        await RNFS.mkdir(this.appDirectory);
        console.log('📁 Profile pictures directory created');
      }
    } catch (error) {
      console.error('Error creating profile pictures directory:', error);
    }
  }

  // Save both original and no-bg versions
  async saveProfilePictures(originalUri, noBgUri = null) {
    try {
      console.log('💾 Saving profile pictures...');
      
      const timestamp = Date.now();
      const savedPaths = {};

      // Save original image
      if (originalUri) {
        const originalFileName = `profile_original_${timestamp}.jpg`;
        const originalPath = `${this.appDirectory}/${originalFileName}`;
        
        // Copy file to app directory
        await this.copyFile(originalUri, originalPath);
        savedPaths.original = `file://${originalPath}`;
        
        // Save path to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_ORIGINAL, savedPaths.original);
        console.log('✅ Original profile picture saved:', savedPaths.original);
      }

      // Save no-bg image if provided
      if (noBgUri) {
        const noBgFileName = `profile_nobg_${timestamp}.jpg`;
        const noBgPath = `${this.appDirectory}/${noBgFileName}`;
        
        await this.copyFile(noBgUri, noBgPath);
        savedPaths.noBg = `file://${noBgPath}`;
        
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_NO_BG, savedPaths.noBg);
        console.log('✅ No-bg profile picture saved:', savedPaths.noBg);
      }

      // Save metadata
      const metadata = {
        timestamp,
        hasOriginal: !!originalUri,
        hasNoBg: !!noBgUri,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_METADATA, JSON.stringify(metadata));
      
      // Clean up old files
      await this.cleanupOldFiles(timestamp);

      return savedPaths;
    } catch (error) {
      console.error('Error saving profile pictures:', error);
      throw error;
    }
  }

  // Copy file to app directory
  async copyFile(sourceUri, destinationPath) {
    try {
      // Handle different URI formats
      let sourcePath = sourceUri;
      
      if (sourceUri.startsWith('file://')) {
        sourcePath = sourceUri.replace('file://', '');
      } else if (sourceUri.startsWith('content://')) {
        // For content:// URIs (Android gallery), we need to copy differently
        await RNFS.copyFile(sourceUri, destinationPath);
        return;
      }

      // Check if source file exists
      const sourceExists = await RNFS.exists(sourcePath);
      if (!sourceExists) {
        console.error('Source file does not exist:', sourcePath);
        throw new Error('Source file not found');
      }

      // Copy file
      await RNFS.copyFile(sourcePath, destinationPath);
      console.log('📋 File copied successfully');
    } catch (error) {
      console.error('Error copying file:', error);
      throw error;
    }
  }

  // Get saved profile pictures
  async getProfilePictures() {
    try {
      const [originalUri, noBgUri, metadataStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE_ORIGINAL),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE_NO_BG),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE_METADATA),
      ]);

      const metadata = metadataStr ? JSON.parse(metadataStr) : null;

      // Verify files still exist
      const verifiedPaths = {};
      
      if (originalUri) {
        const originalPath = originalUri.replace('file://', '');
        const exists = await RNFS.exists(originalPath);
        if (exists) {
          verifiedPaths.original = originalUri;
        } else {
          console.warn('Original profile picture file missing');
          await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_ORIGINAL);
        }
      }

      if (noBgUri) {
        const noBgPath = noBgUri.replace('file://', '');
        const exists = await RNFS.exists(noBgPath);
        if (exists) {
          verifiedPaths.noBg = noBgUri;
        } else {
          console.warn('No-bg profile picture file missing');
          await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_NO_BG);
        }
      }

      return {
        ...verifiedPaths,
        metadata,
      };
    } catch (error) {
      console.error('Error getting profile pictures:', error);
      return { original: null, noBg: null, metadata: null };
    }
  }

  // Update only the no-bg version
  async updateNoBgVersion(noBgUri) {
    try {
      console.log('🔄 Updating no-bg profile picture...');
      
      const timestamp = Date.now();
      const noBgFileName = `profile_nobg_${timestamp}.jpg`;
      const noBgPath = `${this.appDirectory}/${noBgFileName}`;
      
      await this.copyFile(noBgUri, noBgPath);
      const savedPath = `file://${noBgPath}`;
      
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_NO_BG, savedPath);
      
      // Update metadata
      const metadataStr = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_METADATA);
      const metadata = metadataStr ? JSON.parse(metadataStr) : {};
      metadata.hasNoBg = true;
      metadata.lastUpdated = new Date().toISOString();
      metadata.noBgTimestamp = timestamp;
      
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_METADATA, JSON.stringify(metadata));
      
      console.log('✅ No-bg profile picture updated:', savedPath);
      
      // Clean up old no-bg files
      await this.cleanupOldNoBgFiles(timestamp);
      
      return savedPath;
    } catch (error) {
      console.error('Error updating no-bg version:', error);
      throw error;
    }
  }

  // Clean up old files to save space
  async cleanupOldFiles(currentTimestamp) {
    try {
      const files = await RNFS.readDir(this.appDirectory);
      
      for (const file of files) {
        // Skip current files
        if (file.name.includes(currentTimestamp.toString())) {
          continue;
        }
        
        // Delete old profile picture files
        if (file.name.startsWith('profile_')) {
          await RNFS.unlink(file.path);
          console.log('🗑️ Deleted old file:', file.name);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
    }
  }

  // Clean up only old no-bg files
  async cleanupOldNoBgFiles(currentTimestamp) {
    try {
      const files = await RNFS.readDir(this.appDirectory);
      
      for (const file of files) {
        // Skip current files
        if (file.name.includes(currentTimestamp.toString())) {
          continue;
        }
        
        // Delete only old no-bg files
        if (file.name.startsWith('profile_nobg_')) {
          await RNFS.unlink(file.path);
          console.log('🗑️ Deleted old no-bg file:', file.name);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old no-bg files:', error);
    }
  }

  // Clear all profile pictures
  async clearProfilePictures() {
    try {
      console.log('🗑️ Clearing all profile pictures...');
      
      // Remove from AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_ORIGINAL),
        AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_NO_BG),
        AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_METADATA),
      ]);
      
      // Delete all files in directory
      const files = await RNFS.readDir(this.appDirectory);
      for (const file of files) {
        if (file.name.startsWith('profile_')) {
          await RNFS.unlink(file.path);
        }
      }
      
      console.log('✅ All profile pictures cleared');
    } catch (error) {
      console.error('Error clearing profile pictures:', error);
    }
  }

  // Check if no-bg version exists
  async hasNoBgVersion() {
    try {
      const noBgUri = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_NO_BG);
      if (!noBgUri) return false;
      
      const path = noBgUri.replace('file://', '');
      return await RNFS.exists(path);
    } catch (error) {
      console.error('Error checking no-bg version:', error);
      return false;
    }
  }
}

export default new ProfilePictureStorageService();