import UserAssetsService from './UserAssetsService';
import RNFS from 'react-native-fs';

/**
 * Profile Image Status Service
 * Handles detection and management of profile image states for HeroScreen button logic
 */
class ProfileImageStatusService {
  
  /**
   * Check the availability status of profile images
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<Object>} Status object with image availability info
   */
  async checkProfileImageStatus(phoneNumber = 'default') {
    try {
      console.log('🔍 ProfileImageStatusService: Checking profile image status for:', phoneNumber);
      
      const latestImages = await UserAssetsService.getLatestProfileImages(phoneNumber);
      
      if (!latestImages) {
        console.log('❌ No profile images found');
        return {
          hasOriginalImage: false,
          hasUpdatedImage: false,
          status: 'NO_IMAGES',
          originalImagePath: null,
          updatedImagePath: null
        };
      }
      
      // Check if files actually exist
      const originalExists = latestImages.originalPath ? await RNFS.exists(latestImages.originalPath.replace('file://', '')) : false;
      const updatedExists = latestImages.processedPath ? await RNFS.exists(latestImages.processedPath.replace('file://', '')) : false;
      
      console.log('🔍 File existence check:', {
        originalExists,
        updatedExists,
        originalPath: latestImages.originalPath,
        processedPath: latestImages.processedPath
      });
      
      let status = 'UNKNOWN';
      
      if (originalExists && updatedExists) {
        status = 'BOTH_AVAILABLE';
      } else if (originalExists && !updatedExists) {
        status = 'ONLY_ORIGINAL';
      } else if (!originalExists && updatedExists) {
        status = 'ONLY_UPDATED';  // This shouldn't normally happen
      } else {
        status = 'NO_IMAGES';
      }
      
      const result = {
        hasOriginalImage: originalExists,
        hasUpdatedImage: updatedExists,
        status,
        originalImagePath: originalExists ? latestImages.originalPath : null,
        updatedImagePath: updatedExists ? latestImages.processedPath : null,
        timestamp: latestImages.timestamp
      };
      
      console.log('✅ ProfileImageStatusService: Status check complete:', result);
      return result;
      
    } catch (error) {
      console.error('❌ ProfileImageStatusService: Error checking status:', error);
      return {
        hasOriginalImage: false,
        hasUpdatedImage: false,
        status: 'ERROR',
        originalImagePath: null,
        updatedImagePath: null,
        error: error.message
      };
    }
  }
  
  /**
   * Determine button states based on current photo and profile image status
   * @param {string} currentPhotoUri - Current photo1 URI in HeroScreen
   * @param {Object} profileImageStatus - Status from checkProfileImageStatus
   * @returns {Object} Button state configuration
   */
  determineButtonStates(currentPhotoUri, profileImageStatus) {
    console.log('🎯 ProfileImageStatusService: Determining button states:', {
      currentPhotoUri: currentPhotoUri ? currentPhotoUri.substring(0, 50) + '...' : 'null',
      profileImageStatus
    });
    
    // Default state - both disabled
    let removeButtonState = {
      enabled: false,
      reason: 'No profile image available'
    };
    
    let restoreButtonState = {
      enabled: false,
      reason: 'No background-removed image to restore from'
    };
    
    // Case 1: No profile image set or error
    if (!currentPhotoUri || currentPhotoUri === 'default_profile_image' || 
        profileImageStatus.status === 'NO_IMAGES' || profileImageStatus.status === 'ERROR') {
      console.log('🚫 Case 1: No profile image or error - both buttons disabled');
      return {
        removeBg: removeButtonState,
        restoreBg: restoreButtonState
      };
    }
    
    // Check if current photo is the updated (bg-removed) image
    const isCurrentPhotoUpdatedImage = currentPhotoUri === profileImageStatus.updatedImagePath ||
                                      (profileImageStatus.updatedImagePath && 
                                       currentPhotoUri.includes(profileImageStatus.updatedImagePath.replace('file://', '').split('/').pop()));
    
    // Check if current photo is the original image  
    const isCurrentPhotoOriginalImage = currentPhotoUri === profileImageStatus.originalImagePath ||
                                       (profileImageStatus.originalImagePath && 
                                        currentPhotoUri.includes(profileImageStatus.originalImagePath.replace('file://', '').split('/').pop()));
    
    console.log('🔍 Image comparison:', {
      isCurrentPhotoUpdatedImage,
      isCurrentPhotoOriginalImage,
      currentPhotoUri,
      updatedImagePath: profileImageStatus.updatedImagePath,
      originalImagePath: profileImageStatus.originalImagePath
    });
    
    // Case 2: Both images available and current photo is updated image
    if (profileImageStatus.status === 'BOTH_AVAILABLE' && isCurrentPhotoUpdatedImage) {
      console.log('✅ Case 2: Updated image active - enable restore, disable remove');
      removeButtonState = {
        enabled: false,
        reason: 'Background already removed'
      };
      restoreButtonState = {
        enabled: true,
        reason: 'Original image available for restoration'
      };
    }
    // Case 3: Both images available and current photo is original image  
    else if (profileImageStatus.status === 'BOTH_AVAILABLE' && isCurrentPhotoOriginalImage) {
      console.log('✅ Case 3: Original image active - enable remove, disable restore');
      removeButtonState = {
        enabled: true,
        reason: 'Background can be removed'
      };
      restoreButtonState = {
        enabled: false,
        reason: 'Background not removed yet'
      };
    }
    // Case 4: Only original image available (no updated image due to technical issues)
    else if (profileImageStatus.status === 'ONLY_ORIGINAL') {
      console.log('⚠️ Case 4: Only original available - disable remove (no bg removal capability)');
      removeButtonState = {
        enabled: false,
        reason: 'Background removal not available (technical issues or no processed version)'
      };
      restoreButtonState = {
        enabled: false,
        reason: 'No background-removed version available'
      };
    }
    // Case 5: Only updated image available (shouldn't normally happen)
    else if (profileImageStatus.status === 'ONLY_UPDATED') {
      console.log('⚠️ Case 5: Only updated available - enable restore only');
      removeButtonState = {
        enabled: false,
        reason: 'Original image not available'
      };
      restoreButtonState = {
        enabled: true,
        reason: 'Can restore but original may be missing'
      };
    }
    // Case 6: Default fallback
    else {
      console.log('❓ Case 6: Fallback - current photo doesn\'t match known images');
      removeButtonState = {
        enabled: profileImageStatus.hasOriginalImage,
        reason: profileImageStatus.hasOriginalImage ? 'Original image available for processing' : 'No original image available'
      };
      restoreButtonState = {
        enabled: profileImageStatus.hasUpdatedImage,
        reason: profileImageStatus.hasUpdatedImage ? 'Updated image available for restoration' : 'No updated image available'
      };
    }
    
    const result = {
      removeBg: removeButtonState,
      restoreBg: restoreButtonState,
      profileImageStatus,
      analysis: {
        isCurrentPhotoUpdatedImage,
        isCurrentPhotoOriginalImage,
        currentPhotoUri: currentPhotoUri ? currentPhotoUri.substring(0, 50) + '...' : 'null'
      }
    };
    
    console.log('🎯 Button states determined:', result);
    return result;
  }
}

// Export singleton instance
export default new ProfileImageStatusService();