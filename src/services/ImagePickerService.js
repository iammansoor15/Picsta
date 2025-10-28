import { launchImageLibrary } from 'react-native-image-picker';
import { Alert, PermissionsAndroid, Platform, Linking } from 'react-native';

class ImagePickerService {
  // Check if we already have permissions
  static async checkPermissions() {
    if (Platform.OS !== 'android') {
      return { hasPermission: true, canRequest: true };
    }

    try {
      // For Android 13+, we need READ_MEDIA_IMAGES and READ_MEDIA_VIDEO
      const permissions = Platform.Version >= 33 
        ? [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES, PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO]
        : [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE];
      
      // Check first permission (images)
      const permission = permissions[0];

      const hasPermission = await PermissionsAndroid.check(permission);
      
      if (hasPermission) {
        return { hasPermission: true, canRequest: true };
      }

      // Check if we can request permission (not permanently denied)
      const canRequest = await PermissionsAndroid.shouldShowRequestPermissionRationale(permission);
      
      return { hasPermission: false, canRequest: canRequest !== false };
    } catch (err) {
      console.warn('Permission check error:', err);
      return { hasPermission: false, canRequest: true };
    }
  }

  // Request permissions for Android
  static async requestStoragePermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Check current permission status first
      const { hasPermission, canRequest } = await this.checkPermissions();
      
      if (hasPermission) {
        return true;
      }

      if (!canRequest) {
        // Permission was permanently denied, guide user to settings
        Alert.alert(
          'Permission Required',
          'Photo access was permanently denied. Please go to Settings > Apps > Narayana > Permissions and enable Photos/Media access.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
        return false;
      }

      // For Android 13+, request both image and video permissions
      const permissions = Platform.Version >= 33 
        ? [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES, PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO]
        : [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE];

      const granted = await PermissionsAndroid.requestMultiple(
        permissions,
        {
          title: 'Media Access Required',
          message: 'This app needs access to your photos and videos to select media for templates. This allows you to create custom templates with your own images and videos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );
      
      // Check if all permissions were granted
      const allGranted = permissions.every(p => granted[p] === PermissionsAndroid.RESULTS.GRANTED);

      if (allGranted) {
        return true;
      } else {
        Alert.alert(
          'Permission Denied',
          'Media access is required to select images and videos for templates. You can enable it later in app settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (err) {
      console.warn('Storage permission error:', err);
      Alert.alert(
        'Permission Error',
        'There was an error requesting photo access. Please try again or check your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  // Preemptively request permissions (call this when modal opens)
  static async requestPermissionPreemptively() {
    try {
      console.log('Preemptively checking photo permissions...');
      const { hasPermission, canRequest } = await this.checkPermissions();
      
      if (hasPermission) {
        console.log('Photo permissions already granted');
        return true;
      }
      
      if (canRequest) {
        // Show informative dialog before requesting permission
        return new Promise((resolve) => {
          Alert.alert(
            'Photo Access Needed',
            'To add custom templates with your own images, this app needs access to your photos. Would you like to grant access now?',
            [
              { 
                text: 'Not Now', 
                style: 'cancel',
                onPress: () => resolve(false)
              },
              { 
                text: 'Grant Access',
                onPress: async () => {
                  const granted = await this.requestStoragePermission();
                  resolve(granted);
                }
              }
            ]
          );
        });
      } else {
        // Permission was permanently denied
        Alert.alert(
          'Photo Access Required',
          'To add custom templates, please enable photo access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('Error in preemptive permission request:', error);
      return false;
    }
  }

  // Pick image from gallery
  static async pickImageFromGallery() {
    try {
      console.log('Requesting media access permission...');
      
      // Request permission first
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        console.log('Media permission denied by user');
        // Don't show additional alert here since requestStoragePermission already handles it
        return null;
      }
      
      console.log('Media permission granted, opening gallery...');

      const options = {
        mediaType: 'mixed', // Allow both photos and videos
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 0.8,
        videoQuality: 'high',
        durationLimit: 7, // Max 7 seconds for videos
        selectionLimit: 1,
        storageOptions: {
          skipBackup: true,
          path: 'media',
        },
      };

      return new Promise((resolve, reject) => {
        launchImageLibrary(options, (response) => {
          if (response.didCancel) {
            console.log('User cancelled image picker');
            resolve(null);
            return;
          }

          if (response.errorMessage) {
            console.error('Image picker error:', response.errorMessage);
            Alert.alert(
              'Error',
              'Failed to select image: ' + response.errorMessage,
              [{ text: 'OK' }]
            );
            reject(new Error(response.errorMessage));
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const selectedMedia = response.assets[0];
            
            // Validate the selected media
            if (!selectedMedia.uri) {
              reject(new Error('No media URI found'));
              return;
            }
            
            const isVideo = selectedMedia.type?.startsWith('video/');

            console.log('Selected media:', {
              uri: selectedMedia.uri,
              width: selectedMedia.width,
              height: selectedMedia.height,
              fileSize: selectedMedia.fileSize,
              type: selectedMedia.type,
              duration: selectedMedia.duration,
              isVideo,
            });

            resolve({
              uri: selectedMedia.uri,
              width: selectedMedia.width || 0,
              height: selectedMedia.height || 0,
              fileSize: selectedMedia.fileSize || 0,
              type: selectedMedia.type || 'image/jpeg',
              fileName: selectedMedia.fileName || (isVideo ? 'template_video' : 'template_image'),
              duration: selectedMedia.duration || 0,
              isVideo,
            });
          } else {
            reject(new Error('No image selected'));
          }
        });
      });
    } catch (error) {
      console.error('Error in pickImageFromGallery:', error);
      Alert.alert(
        'Error',
        'Failed to open image picker. Please try again.',
        [{ text: 'OK' }]
      );
      throw error;
    }
  }

  // Pick image with category context
  static async pickImageForTemplate(category) {
    try {
      console.log(`Picking image for ${category} template`);
      const imageResult = await this.pickImageFromGallery();
      
      if (imageResult) {
        return {
          ...imageResult,
          category,
          selectedAt: new Date().toISOString(),
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error picking image for ${category}:`, error);
      throw error;
    }
  }

  // Validate image/video for template use
  static validateImageForTemplate(mediaData) {
    if (!mediaData || !mediaData.uri) {
      return { isValid: false, error: 'No media data provided' };
    }

    const isVideo = mediaData.isVideo || mediaData.type?.startsWith('video/');

    // Check file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (mediaData.fileSize && mediaData.fileSize > maxSize) {
      return { 
        isValid: false, 
        error: `${isVideo ? 'Video' : 'Image'} too large. Please select a file smaller than ${isVideo ? '50MB' : '10MB'}.` 
      };
    }

    // Check media type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/mpeg', 'video/webm'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    if (mediaData.type && !allowedTypes.includes(mediaData.type.toLowerCase())) {
      return { 
        isValid: false, 
        error: 'Unsupported format. Please select a JPEG, PNG, WebP image or MP4, MOV video.' 
      };
    }

    // Check video duration (max 7 seconds)
    if (isVideo && mediaData.duration && mediaData.duration > 7000) {
      return { 
        isValid: false, 
        error: 'Video too long. Please select a video shorter than 7 seconds.' 
      };
    }

    return { isValid: true, error: null };
  }
}

export default ImagePickerService;