import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import ProfilePictureStorageService from '../services/ProfilePictureStorageService';

// Storage keys
const PROFILE_IMAGES_KEY = '@narayana_profile_images';
const TEMPLATES_STORAGE_KEY = '@narayana_templates';

/**
 * Clear all profile pictures and reset to default
 * This will:
 * 1. Clear Redux store state
 * 2. Clear AsyncStorage data
 * 3. Delete physical image files
 * 4. Reset to default black circle
 */
export const clearAllProfilePictures = async (dispatch) => {
  try {
    console.log('🧹 ProfilePictureManager: Starting complete profile picture cleanup...');
    
    // Step 1: Clear Redux store
    console.log('🔄 Step 1: Clearing Redux store...');
    dispatch({ type: 'profilePicture/resetToDefault' });
    dispatch({ type: 'profile/resetToDefault' });
    
    // Step 2: Clear AsyncStorage
    console.log('🗑️ Step 2: Clearing AsyncStorage...');
    await AsyncStorage.removeItem(PROFILE_IMAGES_KEY);
    await AsyncStorage.removeItem(TEMPLATES_STORAGE_KEY);
    
    // Step 3: Delete physical image files
    console.log('📁 Step 3: Deleting physical image files...');
    const userAssetsPath = `${RNFS.DocumentDirectoryPath}/assets/user`;
    
    try {
      const exists = await RNFS.exists(userAssetsPath);
      if (exists) {
        await RNFS.unlink(userAssetsPath);
        console.log('✅ Deleted user assets directory');
      }
    } catch (fileError) {
      console.log('⚠️ Could not delete user assets directory:', fileError.message);
    }
    
    // Step 4: Recreate empty directory
    try {
      await RNFS.mkdir(userAssetsPath);
      console.log('✅ Recreated empty user assets directory');
    } catch (mkdirError) {
      console.log('⚠️ Could not recreate user assets directory:', mkdirError.message);
    }
    
    console.log('✅ ProfilePictureManager: Complete profile picture cleanup finished');
    return { success: true, message: 'All profile pictures cleared successfully' };
    
  } catch (error) {
    console.error('❌ ProfilePictureManager: Error clearing profile pictures:', error);
    return { success: false, message: 'Failed to clear profile pictures', error };
  }
};

/**
 * COMPREHENSIVE: Clear ALL profile picture data from ALL storage systems
 * This clears:
 * 1. Redux store state
 * 2. AsyncStorage (all profile picture keys)
 * 3. UserAssetsService files (/assets/user)
 * 4. ProfilePictureStorageService files (/profile_pictures) 
 * 5. Any cached URIs
 */
export const clearAllProfileData = async (dispatch) => {
  try {
    console.log('🧹 ProfilePictureManager: Starting COMPREHENSIVE profile data cleanup...');
    
    // Step 1: Clear Redux store and cached data
    console.log('🔄 Step 1: Clearing Redux store and cached data...');
    // Import and use the thunk directly
    const { clearAllCachedProfileData } = require('../store/slices/profilePictureSlice');
    await dispatch(clearAllCachedProfileData());
    dispatch({ type: 'profile/resetToDefault' });
    
    // Step 2: Clear ALL AsyncStorage keys related to profile pictures
    console.log('🗑️ Step 2: Clearing ALL AsyncStorage keys...');
    const asyncStorageKeys = [
      PROFILE_IMAGES_KEY,
      TEMPLATES_STORAGE_KEY,
      '@narayana_profile_picture_uri',
      '@profile_picture_original',
      '@profile_picture_no_bg', 
      '@profile_picture_metadata',
      '@narayana_profile_images',
      '@narayana_templates'
    ];
    
    await Promise.all(asyncStorageKeys.map(key => 
      AsyncStorage.removeItem(key).catch(err => 
        console.log(`⚠️ Could not remove ${key}:`, err.message)
      )
    ));
    
    // Step 3: Clear UserAssetsService files (/assets/user)
    console.log('📁 Step 3: Clearing UserAssetsService files...');
    const userAssetsPath = `${RNFS.DocumentDirectoryPath}/assets/user`;
    
    try {
      const exists = await RNFS.exists(userAssetsPath);
      if (exists) {
        await RNFS.unlink(userAssetsPath);
        console.log('✅ Deleted UserAssetsService directory');
      }
    } catch (fileError) {
      console.log('⚠️ Could not delete UserAssetsService directory:', fileError.message);
    }
    
    // Step 4: Clear ProfilePictureStorageService files (/profile_pictures)
    console.log('📁 Step 4: Clearing ProfilePictureStorageService files...');
    try {
      await ProfilePictureStorageService.clearProfilePictures();
      console.log('✅ ProfilePictureStorageService cleared');
    } catch (serviceError) {
      console.log('⚠️ Could not clear ProfilePictureStorageService:', serviceError.message);
    }
    
    // Step 5: Recreate empty directories
    console.log('📁 Step 5: Recreating empty directories...');
    try {
      await RNFS.mkdir(userAssetsPath);
      console.log('✅ Recreated empty UserAssetsService directory');
    } catch (mkdirError) {
      console.log('⚠️ Could not recreate UserAssetsService directory:', mkdirError.message);
    }
    
    console.log('✅ ProfilePictureManager: COMPREHENSIVE profile data cleanup finished');
    return { success: true, message: 'All profile data cleared successfully' };
    
  } catch (error) {
    console.error('❌ ProfilePictureManager: Error during comprehensive cleanup:', error);
    return { success: false, message: 'Failed to clear all profile data', error };
  }
};

/**
 * Reset only Redux store to default (without deleting files)
 */
export const resetReduxToDefault = (dispatch) => {
  console.log('🔄 ProfilePictureManager: Resetting Redux store to default...');
  dispatch({ type: 'profilePicture/resetToDefault' });
  dispatch({ type: 'profile/resetToDefault' });
  console.log('✅ Redux store reset to default');
};

/**
 * Clear only stored profile images (keep Redux state)
 */
export const clearStoredProfileImages = async () => {
  try {
    console.log('🗑️ ProfilePictureManager: Clearing stored profile images...');
    
    // Clear AsyncStorage
    await AsyncStorage.removeItem(PROFILE_IMAGES_KEY);
    
    // Delete physical files
    const userAssetsPath = `${RNFS.DocumentDirectoryPath}/assets/user`;
    const exists = await RNFS.exists(userAssetsPath);
    if (exists) {
      await RNFS.unlink(userAssetsPath);
      await RNFS.mkdir(userAssetsPath);
    }
    
    console.log('✅ Stored profile images cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing stored profile images:', error);
    return { success: false, error };
  }
};
