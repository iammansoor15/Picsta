import { Alert } from 'react-native';
import ImagePickerService from '../services/ImagePickerService';
import ProfilePhotoService from '../services/ProfilePhotoService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Helper class for profile photo upload operations
 */
class ProfilePhotoUploadHelper {
  /**
   * Pick and upload profile photo
   * @param {Function} onSuccess - Callback on successful upload (receives profilePhotoUrl)
   * @param {Function} onError - Callback on error (receives error)
   * @returns {Promise<string|null>} - Profile photo URL or null
   */
  async pickAndUploadProfilePhoto(onSuccess, onError) {
    try {
      console.log('📸 Starting profile photo selection...');

      // Pick image using ImagePickerService
      const imageUri = await ImagePickerService.pickImage();
      
      if (!imageUri) {
        console.log('No image selected');
        return null;
      }

      console.log('✅ Image selected:', imageUri);

      // Get auth token from storage
      const token = await this.getAuthToken();
      
      if (!token) {
        const error = new Error('Not authenticated. Please login first.');
        if (onError) onError(error);
        Alert.alert('Authentication Required', 'Please login to upload a profile photo.');
        return null;
      }

      // Show loading indicator (you can integrate with your loading state)
      console.log('⏳ Uploading profile photo...');

      // Upload to server
      const response = await ProfilePhotoService.uploadProfilePhoto(imageUri, token);

      if (response?.success && response?.data?.profilePhotoUrl) {
        const profilePhotoUrl = response.data.profilePhotoUrl;
        console.log('✅ Profile photo uploaded successfully:', profilePhotoUrl);

        // Call success callback
        if (onSuccess) {
          onSuccess(profilePhotoUrl);
        }

        return profilePhotoUrl;
      } else {
        throw new Error('Upload failed - no URL returned');
      }
    } catch (error) {
      console.error('❌ Profile photo upload error:', error);
      
      // Call error callback
      if (onError) {
        onError(error);
      }

      // Show error alert
      Alert.alert(
        'Upload Failed',
        error?.message || 'Failed to upload profile photo. Please try again.'
      );

      return null;
    }
  }

  /**
   * Pick, upload, and update Redux store
   * @param {Function} dispatch - Redux dispatch function
   * @param {Function} updateAction - Redux action creator to update profile photo
   * @returns {Promise<string|null>} - Profile photo URL or null
   */
  async pickAndUploadWithRedux(dispatch, updateAction) {
    return this.pickAndUploadProfilePhoto(
      (profilePhotoUrl) => {
        // Update Redux store
        if (dispatch && updateAction) {
          dispatch(updateAction(profilePhotoUrl));
        }
        Alert.alert('Success', 'Profile photo updated successfully!');
      },
      (error) => {
        console.error('Upload error:', error);
      }
    );
  }

  /**
   * Get profile photo from server
   * @returns {Promise<string|null>} - Profile photo URL or null
   */
  async getProfilePhoto() {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        console.warn('No auth token found');
        return null;
      }

      const profilePhotoUrl = await ProfilePhotoService.getProfilePhoto(token);
      return profilePhotoUrl;
    } catch (error) {
      console.error('❌ Error fetching profile photo:', error);
      return null;
    }
  }

  /**
   * Delete profile photo
   * @param {Function} onSuccess - Callback on successful deletion
   * @param {Function} onError - Callback on error
   * @returns {Promise<boolean>} - Success status
   */
  async deleteProfilePhoto(onSuccess, onError) {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      await ProfilePhotoService.deleteProfilePhoto(token);
      
      console.log('✅ Profile photo deleted');
      
      if (onSuccess) {
        onSuccess();
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting profile photo:', error);
      
      if (onError) {
        onError(error);
      }

      Alert.alert(
        'Delete Failed',
        error?.message || 'Failed to delete profile photo.'
      );

      return false;
    }
  }

  /**
   * Get auth token from AsyncStorage
   * @returns {Promise<string|null>} - Auth token or null
   */
  async getAuthToken() {
    try {
      // Try different possible token storage keys
      const possibleKeys = [
        '@auth_token',
        '@user_token',
        'authToken',
        'token',
      ];

      for (const key of possibleKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) {
          return token;
        }
      }

      console.warn('No auth token found in AsyncStorage');
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Show confirmation dialog before uploading
   * @param {Function} onConfirm - Callback when user confirms
   * @returns {void}
   */
  showUploadConfirmation(onConfirm) {
    Alert.alert(
      'Upload Profile Photo',
      'Choose a photo to set as your profile picture. It will be visible when you login.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Choose Photo',
          onPress: onConfirm,
        },
      ]
    );
  }

  /**
   * Show delete confirmation dialog
   * @param {Function} onConfirm - Callback when user confirms deletion
   * @returns {void}
   */
  showDeleteConfirmation(onConfirm) {
    Alert.alert(
      'Delete Profile Photo',
      'Are you sure you want to remove your profile photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: onConfirm,
          style: 'destructive',
        },
      ]
    );
  }
}

export default new ProfilePhotoUploadHelper();
