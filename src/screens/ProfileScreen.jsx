import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import CustomAlert from '../Components/CustomAlert';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import ImagePickerService from '../services/ImagePickerService';
import { cropResultManager } from '../utils/CropResultManager';
import { testProfilePictureState } from '../utils/profilePictureTest';
import UserAssetsService from '../services/UserAssetsService';
import NavigationService from '../services/NavigationService';
import AuthService from '../services/AuthService';
import SubscriptionService from '../services/SubscriptionService';
import ProfilePictureStorageService from '../services/ProfilePictureStorageService';
import BackgroundRemovalService from '../services/BackgroundRemovalService';
import { 
  selectProfileImage, 
  selectOriginalProfileImage, 
  updateProfileImage 
} from '../store/slices/profileSlice';
import { 
  selectProfilePicture, 
  selectProfilePictureUri,
  selectLastUpdated,
  selectIsDefaultPicture,
  updateAndPersistProfilePicture,
  updateProfilePictureWithRequire,
  loadExistingProfilePicture 
} from '../store/slices/profilePictureSlice';
import { setReligion as setGlobalReligion, saveMainSubToStorage } from '../store/slices/mainCategorySlice';
import { uploadTemplate, selectUploadLoading, selectUploadError } from '../store/slices/cloudinaryTemplateSlice';
import { DEFAULT_PROFILE_PICTURE, DEFAULT_PROFILE_PICTURE_FALLBACK, DEFAULT_PROFILE_PICTURE_DATA_URI, getDefaultProfilePicture } from '../constants/defaultProfilePicture';
import { clearAllProfilePictures, clearAllProfileData } from '../utils/ProfilePictureManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TemplatePreferences from '../services/TemplatePreferences';
import PaymentService from '../services/PaymentService';

const { width: screenWidth } = Dimensions.get('window');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  // Redux selectors
  const profileImage = useSelector(selectProfileImage);
  const originalProfileImage = useSelector(selectOriginalProfileImage);
  const profilePicture = useSelector(selectProfilePicture);
  const profilePictureUri = useSelector(selectProfilePictureUri);
  const lastUpdated = useSelector(selectLastUpdated);
  const isDefaultPicture = useSelector(selectIsDefaultPicture);
  
  const [userName, setUserName] = useState('User');
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalName, setOriginalName] = useState('User');
  const [isProcessingProfile, setIsProcessingProfile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Cloud upload state (local for banner)
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState(null);
  const [bannerCloudUrl, setBannerCloudUrl] = useState(null);

  // Banner state (5:1 cropped image)
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerUri, setBannerUri] = useState(null);
  const [isBannerFocused, setIsBannerFocused] = useState(false);

  // Custom alert state
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Template preference state
  const RELIGIONS = ['hindu', 'muslim', 'christian'];
  const RELIGION_OPTIONS = ['all', ...RELIGIONS];
  const SUBCATEGORIES = ['congratulations', 'birthday', 'anniversary', 'wedding', 'festival'];
  const [selectedReligions, setSelectedReligions] = useState(['hindu']);
  const [prefSubcategory, setPrefSubcategory] = useState(SUBCATEGORIES[0]);
  
  // Payment processing state (kept for future subscription flow)
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Debug: Log profile picture information
  console.log('📷 ProfileScreen: Profile picture from Redux:', profilePicture);
  console.log('📷 ProfileScreen: Profile picture uri:', profilePictureUri);
  console.log('📷 ProfileScreen: Last updated:', lastUpdated);
  console.log('📷 ProfileScreen: Is default picture:', isDefaultPicture);
  console.log('📷 ProfileScreen: Default profile picture constant:', DEFAULT_PROFILE_PICTURE);

  // Get the correct image source from Redux store with fallback
  const getImageSource = () => {
    try {
      console.log('🔄 ProfileScreen: Getting image source...');
      console.log('🔄 ProfileScreen: profilePictureUri:', profilePictureUri);
      console.log('🔄 ProfileScreen: isDefaultPicture:', isDefaultPicture);
      console.log('🔄 ProfileScreen: profilePicture:', profilePicture);
      console.log('🔄 ProfileScreen: profilePicture type:', typeof profilePicture);
      console.log('🔄 ProfileScreen: profilePictureUri type:', typeof profilePictureUri);
      
      // If we have a custom profile picture URI, use it
      if (profilePictureUri) {
        const source = { uri: profilePictureUri };
        console.log('✅ ProfileScreen: Using custom image URI:', profilePictureUri);
        console.log('✅ ProfileScreen: Final image source:', source);
        console.log('✅ ProfileScreen: Source URI type:', typeof source.uri);
        console.log('✅ ProfileScreen: Source URI starts with file://:', source.uri.startsWith('file://'));
        return source;
      }
      
      // Otherwise use the profilePicture from Redux (which should be the default)
      const source = profilePicture || getDefaultProfilePicture();
      console.log('⚪ ProfileScreen: Using default profile picture');
      console.log('⚪ ProfileScreen: Final image source:', source);
      console.log('⚪ ProfileScreen: Source type:', typeof source);
      if (source && source.uri) {
        console.log('⚪ ProfileScreen: Source URI:', source.uri);
        console.log('⚪ ProfileScreen: Source URI type:', typeof source.uri);
      }
      return source;
    } catch (error) {
      console.error('❌ ProfileScreen: Error getting image source:', error);
      console.log('🔄 ProfileScreen: Falling back to getDefaultProfilePicture()');
      try {
        return getDefaultProfilePicture();
      } catch (fallbackError) {
        console.error('❌ ProfileScreen: Error with getDefaultProfilePicture():', fallbackError);
        console.log('🔄 ProfileScreen: Using data URI as final fallback');
        return DEFAULT_PROFILE_PICTURE_DATA_URI;
      }
    }
  };

  // Handle image loading errors
  const handleImageError = (error) => {
    console.error('📷 ProfileScreen: Image load error:', error);
    console.log('📷 ProfileScreen: Error details:', error.nativeEvent);
    console.log('📷 ProfileScreen: Attempting fallback to default image');
    
    // Force update to fallback image - dispatch a reset action instead
    try {
      dispatch({ type: 'profilePicture/resetToDefault' });
      console.log('📷 ProfileScreen: Reset to default profile picture');
    } catch (resetError) {
      console.error('❌ ProfileScreen: Error resetting to default:', resetError);
    }
  };

  // Load user profile info from auth storage/server and prefill name/phone
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Check for both old and new token keys
        const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('AUTH_TOKEN');
        let userJson = await AsyncStorage.getItem('user') || await AsyncStorage.getItem('AUTH_USER');
        let user = null;
        if (userJson) {
          try { user = JSON.parse(userJson); } catch {}
        }
        if (!user && token) {
          try {
            const me = await AuthService.me(token);
            user = me?.user || me;
            if (user) {
              await AsyncStorage.setItem('user', JSON.stringify(user));
            }
          } catch (e) {
            console.warn('Failed to load user via /me:', e?.message || e);
          }
        }
        if (cancelled) return;
        if (user) {
          const nextName = typeof user.name === 'string' && user.name.trim() ? user.name.trim() : 'User';
          setUserName(nextName);
          setOriginalName(nextName);
        }
      } catch (e) {
        console.warn('Auth profile prefill failed:', e?.message || e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load template preferences on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rs, s] = await Promise.all([
          TemplatePreferences.getReligions(),
          TemplatePreferences.getSubcategory(),
        ]);
        if (!cancelled) {
          const arr = Array.isArray(rs) && rs.length ? rs : ['hindu'];
          setSelectedReligions(arr);
          setPrefSubcategory(SUBCATEGORIES.includes(s) ? s : SUBCATEGORIES[0]);
        }
      } catch (e) {
        console.warn('Failed to load template preferences:', e?.message || e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Watch for Redux store changes and re-render
  useEffect(() => {
    console.log('📷 ProfileScreen: Redux store changed:', {
      profilePicture,
      profilePictureUri,
      lastUpdated
    });
    console.log('📷 ProfileScreen: Current image source will be:', getImageSource());
  }, [profilePicture, profilePictureUri, lastUpdated]);

  // Listen for banner crop results (from BannerCrop)
  useEffect(() => {
    const remove = cropResultManager.addListener((payload) => {
      try {
        if (payload?.photoNumber === 'banner' && payload?.croppedUri) {
          setBannerUri(payload.croppedUri);
          setBannerEnabled(true);
        }
      } catch {}
    });
    return () => { try { remove && remove(); } catch {} };
  }, []);

  // Auto-upload banner to cloud when a new bannerUri is set
  useEffect(() => {
    const upload = async () => {
      if (!bannerUri) return;
      try {
        setIsBannerUploading(true);
        setBannerUploadError(null);
        setBannerCloudUrl(null);
        const res = await dispatch(uploadTemplate({
          imageUri: bannerUri,
          category: 'banners',
          templateData: { name: 'Profile Banner', ratio: '5:1' }
        })).unwrap();
        const tpl = res?.template || res;
        const cloudUrl = tpl?.image_url || tpl?.secure_url || tpl?.url || null;
        if (cloudUrl) setBannerCloudUrl(cloudUrl);
      } catch (e) {
        setBannerUploadError(e?.message || 'Upload failed');
      } finally {
        setIsBannerUploading(false);
      }
    };
    upload();
  }, [bannerUri, dispatch]);

  // Handle crop results when returning from crop screen - DISABLED (crop functionality removed)
  useEffect(() => {
    // const handleCropResult = async () => {
    //   const cropResult = cropResultManager.consumeCropResult(); // Use consumeCropResult to get and clear
    //   if (cropResult && cropResult.cropType === 'profile') {
    //     console.log('🎯 ProfileScreen: Received crop result:', cropResult);
    //     
    //     try {
    //       setIsProcessingProfile(true);
    //       // Process the cropped image
    //       await processProfileImage(cropResult.croppedUri);
    //       console.log('✅ Profile image updated with cropped result');
    //     } catch (error) {
    //       console.error('❌ Error updating profile image:', error);
    //       Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    //     } finally {
    //       setIsProcessingProfile(false);
    //     }
    //   }
    // };

    // // Only check for crop result when component mounts, not on every focus
    // handleCropResult();

    // // Add a focus listener that only processes crop results, not image picking
    // const unsubscribe = navigation.addListener('focus', () => {
    //   // Only check for crop results on focus, don't trigger image picking
    //   const cropResult = cropResultManager.getCropResult();
    //   if (cropResult && cropResult.cropType === 'profile') {
    //     handleCropResult();
    //   }
    // });

    // return unsubscribe;
  }, []); // Empty dependency array - only run on mount

// Process profile image: optionally send to BG removal service if not already done
  const processProfileImage = async (imageUri, backgroundAlreadyRemoved = false) => {
    if (!imageUri) {
      console.log('❌ No image URI provided for processing');
      return;
    }

    try {
      console.log('🎭 ProfileScreen: Processing profile picture:', imageUri);
      console.log('🎭 Background already removed in Crop screen:', backgroundAlreadyRemoved);
      
      // Normalize: strip any cache-busting query suffix and ensure file:// prefix
      const clean = (u) => {
        const noQuery = typeof u === 'string' ? u.split('?')[0] : u;
        return noQuery.startsWith('file://') ? noQuery : `file://${noQuery}`;
      };

      setIsProcessingProfile(true);
      const normalizedUri = clean(imageUri);
      
      let profileImageToUse = normalizedUri; // Default to original
      let bgRemovedUri = null;
      let bgRemovalSuccess = backgroundAlreadyRemoved; // If already removed in Crop, mark as success

      // Background removal is now ONLY done in Crop screen based on checkbox
      // If user selected "Remove background" in Crop, it's already done
      // If user didn't select it, we respect that choice and don't remove it
      if (backgroundAlreadyRemoved) {
        console.log('✅ Background was already removed in Crop screen');
        bgRemovedUri = normalizedUri; // The cropped image already has BG removed
        profileImageToUse = normalizedUri; // Use the BG-removed version
      } else {
        console.log('ℹ️ User chose not to remove background - using cropped image as-is');
        console.log('📸 Using cropped image with original background');
        // Just use the cropped image as-is (no BG removal)
        profileImageToUse = normalizedUri;
      }

      // Step 3: Save images to local storage
      setProcessingStatus('Saving images...');
      console.log('💾 Saving original and bg-removed images...');
      console.log('   Original URI:', normalizedUri);
      console.log('   BG-removed URI:', bgRemovedUri || 'N/A');
      console.log('   Profile photo will be:', bgRemovalSuccess ? 'BG-REMOVED' : 'ORIGINAL');

      const saved = await ProfilePictureStorageService.saveProfilePictures(
        normalizedUri,  // original image (profile_image)
        bgRemovedUri    // bg-removed image (bg_removed_profile_image) - can be null
      );

      console.log('✅ Images saved:', saved);

      // Step 4: Update Redux store with the appropriate image
      const finalOriginalUri = saved?.original || normalizedUri;
      const finalBgRemovedUri = saved?.noBg || bgRemovedUri;
      
      // Use bg-removed as profile photo if successful, otherwise use original
      const displayImageUri = bgRemovalSuccess && finalBgRemovedUri 
        ? finalBgRemovedUri 
        : finalOriginalUri;

      dispatch(updateProfileImage({ 
        processedUri: displayImageUri,  // Use bg-removed or original
        originalUri: finalOriginalUri 
      }));
      await dispatch(updateAndPersistProfilePicture({ 
        imageUri: displayImageUri, 
        isProcessed: bgRemovalSuccess 
      }));

      // Verify and notify
      testProfilePictureState();
      
      const successMessage = bgRemovalSuccess
        ? 'Your profile picture has been updated with background removed!'
        : 'Your profile picture has been updated!';
      
      setAlertConfig({
        visible: true,
        title: 'Profile Picture Updated',
        message: successMessage,
        buttons: [{ text: 'OK' }]
      });
      
      console.log('✅ Profile image update complete');
      console.log('   Display image:', displayImageUri);
      console.log('   Original image:', finalOriginalUri);
      console.log('   BG-removed image:', finalBgRemovedUri || 'N/A');
      console.log('   Using:', bgRemovalSuccess ? 'BG-REMOVED' : 'ORIGINAL');
    } catch (error) {
      console.error('❌ ProfileScreen: Error processing profile image:', error);
      
      // On complete failure, try to at least save the original image
      try {
        console.log('🔄 Attempting to save original image as fallback...');
        const normalizedUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
        const saved = await ProfilePictureStorageService.saveProfilePictures(normalizedUri, null);
        const finalUri = saved?.original || normalizedUri;
        
        dispatch(updateProfileImage({ 
          processedUri: finalUri,
          originalUri: finalUri 
        }));
        await dispatch(updateAndPersistProfilePicture({ 
          imageUri: finalUri, 
          isProcessed: false 
        }));
        
        setAlertConfig({
          visible: true,
          title: 'Profile Picture Updated',
          message: 'Your profile picture has been saved (background removal unavailable).',
          buttons: [{ text: 'OK' }]
        });
      } catch (fallbackError) {
        console.error('❌ Fallback save also failed:', fallbackError);
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: `Failed to save profile picture: ${error.message}. Please try again.`,
          buttons: [{ text: 'OK' }]
        });
      }
    } finally {
      setIsProcessingProfile(false);
      setProcessingStatus('');
    }
  };


  const handleProfileImagePress = async () => {
    console.log('📷 ProfileScreen: Profile image pressed');
    console.log('📷 ProfileScreen: isDefaultPicture:', isDefaultPicture);
    console.log('📷 ProfileScreen: profilePictureUri:', profilePictureUri);

    // If user is not signed in, navigate to sign-in page first
    try {
      // Check for both possible token keys
      const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('AUTH_TOKEN');
      if (!token) {
        console.log('🔐 No auth token found. Redirecting to ProfileEntry (Sign In)');
        navigation.navigate('ProfileEntry');
        return;
      }
    } catch (e) {
      console.log('🔐 Error reading auth token, redirecting to ProfileEntry:', e?.message || e);
      navigation.navigate('ProfileEntry');
      return;
    }
    
    // Check if user has a custom profile picture
    const hasCustomPhoto = !isDefaultPicture && profilePictureUri;
    
    if (hasCustomPhoto) {
      console.log('📷 ProfileScreen: Custom photo exists, showing options modal');
      setShowProfileModal(true);
    } else {
      console.log('📷 ProfileScreen: No custom photo, opening gallery directly');
      await openGalleryForProfilePicture();
    }
  };

  const openGalleryForProfilePicture = async () => {
    try {
      console.log('📷 ProfileScreen: Starting image picker...');
      // Clear any existing crop results when starting new selection - DISABLED (crop functionality removed)
      // cropResultManager.clearCropResult();
      let result = null;
      
      // Try only the main method first, don't use automatic fallbacks
      try {
        console.log('📷 ProfileScreen: Trying Main method...');
        result = await ImagePickerService.pickImageFromGallery();
        console.log('📷 ProfileScreen: Main method result:', result);
        
        if (result && result.uri) {
          console.log('📷 ProfileScreen: Main method succeeded!');
        } else {
          console.log('📷 ProfileScreen: Main method cancelled or failed, user cancelled selection');
          return; // User cancelled, don't try other methods
        }
      } catch (methodError) {
        console.error('📷 ProfileScreen: Main method failed:', methodError);
        
        let errorMessage = 'Failed to access photos. Please check your permissions and try again.';
        
        if (methodError.message.includes('permission')) {
          errorMessage = 'Photo access is required. Please enable photo permissions in your device settings.';
        } else if (methodError.message.includes('cancelled')) {
          return; // User cancelled, don't show error
        } else if (methodError.message.includes('timeout')) {
          errorMessage = 'The request timed out. Please try again.';
        }
        
        Alert.alert('Error', errorMessage);
        return;
      }
      
      if (result && result.uri) {
        console.log('📷 ProfileScreen: Valid image selected, navigating to crop screen');
        console.log('📷 ProfileScreen: Image URI:', result.uri);
        
        // Check if this is a require() reference (V4 fallback)
        if (result.isRequireReference) {
          console.log('📷 ProfileScreen: Using require() reference, updating profile directly');
          dispatch(updateProfileImage({ processedUri: result.uri, originalUri: result.uri }));
          return;
        }
        
        // Navigate to Crop screen and process the cropped result for profile picture
        const cropShape = 'circle';
        navigation.navigate('Crop', {
          uri: result.uri,
          image: result.uri,
          sourceUri: result.uri,
          photoNumber: 'profile',
          shape: cropShape,
          returnTo: 'ProfileScreen',
          cropType: 'profile',
          onCropDone: async (payload) => {
            try {
              const cropped = payload?.croppedUri || payload?.uri || result.uri;
              const bgRemoved = payload?.backgroundRemoved || false;
              console.log('📷 ProfileScreen: onCropDone received, applying cropped image:', cropped);
              console.log('📷 ProfileScreen: Background removed in Crop:', bgRemoved);
              await processProfileImage(cropped, bgRemoved);
            } catch (e) {
              console.warn('onCropDone error (profile):', e?.message || e);
              try { await processProfileImage(result.uri, false); } catch {}
            }
          }
        });
      } else {
        console.log('📷 ProfileScreen: All methods failed, no valid image selected');
        Alert.alert(
          'No Image Selected',
          'Unable to access your photos. Please check your permissions and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('📷 ProfileScreen: Error picking profile image:', error);
      
      let errorMessage = 'Failed to select image. Please try again.';
      
      if (error.message.includes('permission')) {
        errorMessage = 'Photo access is required. Please enable photo permissions in your device settings.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'The request timed out. Please try again.';
      } else if (error.message.includes('cancelled')) {
        return; // User cancelled, don't show error
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const openGalleryForBanner = async () => {
    try {
      const picked = await ImagePickerService.pickImageFromGallery();
      if (!picked || !picked.uri) return;
      navigation.navigate('BannerCrop', {
        uri: picked.uri,
        photoNumber: 'banner',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to select banner image.');
    }
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    checkForChanges();
  };

  const checkForChanges = () => {
    const nameChanged = userName !== originalName;
    setHasChanges(nameChanged);
  };

  const handleUpdate = () => {
    Alert.alert('Profile Updated', 'Your profile has been updated successfully!');
    setOriginalName(userName);
    setHasChanges(false);
  };

  const removeProfilePicture = async () => {
    try {
      console.log('🗑️ ProfileScreen: Removing profile picture (comprehensive)...');
      setShowProfileModal(false);
      
      const result = await clearAllProfileData(dispatch);
      
      if (result.success) {
        setAlertConfig({
          visible: true,
          title: 'Success',
          message: 'Profile picture has been removed!',
          buttons: [{ text: 'OK' }]
        });
      } else {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: result.message || 'Failed to remove profile picture',
          buttons: [{ text: 'OK' }]
        });
      }
    } catch (error) {
      console.error('❌ Error removing profile picture:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to remove profile picture',
        buttons: [{ text: 'OK' }]
      });
    }
  };

  const updateProfilePicture = async () => {
    try {
      console.log('🔄 ProfileScreen: Updating profile picture...');
      setShowProfileModal(false);
      
      // First, clear the existing profile picture (comprehensive)
      await clearAllProfileData(dispatch);
      
      // Reset the forcedClear flag to allow new uploads
      dispatch({ type: 'profilePicture/setForcedClear', payload: false });
      
      // Then open gallery to select new picture
      console.log('📷 ProfileScreen: Starting image picker for update...');
      // cropResultManager.clearCropResult(); // Crop functionality removed
      let result = null;
      
      try {
        console.log('📷 ProfileScreen: Trying Main method...');
        result = await ImagePickerService.pickImageFromGallery();
        console.log('📷 ProfileScreen: Main method result:', result);
        
        if (result && result.uri) {
          console.log('📷 ProfileScreen: Main method succeeded!');
        } else {
          console.log('📷 ProfileScreen: Main method cancelled or failed, user cancelled selection');
          return;
        }
      } catch (methodError) {
        console.error('📷 ProfileScreen: Main method failed:', methodError);
        
        let errorMessage = 'Failed to access photos. Please check your permissions and try again.';
        
        if (methodError.message.includes('permission')) {
          errorMessage = 'Photo access is required. Please enable photo permissions in your device settings.';
        } else if (methodError.message.includes('cancelled')) {
          return;
        } else if (methodError.message.includes('timeout')) {
          errorMessage = 'The request timed out. Please try again.';
        }
        
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: errorMessage,
          buttons: [{ text: 'OK' }]
        });
        return;
      }
      
      if (result && result.uri) {
        console.log('📷 ProfileScreen: Valid image selected, navigating to crop screen');
        console.log('📷 ProfileScreen: Image URI:', result.uri);
        
        if (result.isRequireReference) {
          console.log('📷 ProfileScreen: Using require() reference, updating profile directly');
          dispatch(updateProfileImage({ processedUri: result.uri, originalUri: result.uri }));
          return;
        }
        
        navigation.navigate('Crop', {
          uri: result.uri,
          image: result.uri,
          sourceUri: result.uri,
          photoNumber: 'profile',
          shape: 'circle',
          returnTo: 'ProfileScreen',
          cropType: 'profile',
          onCropDone: async (payload) => {
            try {
              const cropped = payload?.croppedUri || result.uri;
              const bgRemoved = payload?.backgroundRemoved || false;
              console.log('📷 ProfileScreen: Background removed in Crop:', bgRemoved);
              await processProfileImage(cropped, bgRemoved);
            } catch (e) {
              console.warn('onCropDone error (profile):', e?.message || e);
              try { await processProfileImage(result.uri, false); } catch {}
            }
          }
        });
        console.log('📷 ProfileScreen: Navigation completed');
      }
    } catch (error) {
      console.error('❌ ProfileScreen: Error updating profile picture:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to update profile picture. Please try again.',
        buttons: [{ text: 'OK' }]
      });
    }
  };

  const handleClearProfilePictures = () => {
    setAlertConfig({
      visible: true,
      title: 'Clear Profile Pictures',
      message: 'This will remove all profile pictures and reset to default black circle. Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🧹 ProfileScreen: Clearing all profile pictures...');
              const result = await clearAllProfilePictures(dispatch);
              
              if (result.success) {
                setAlertConfig({
                  visible: true,
                  title: 'Success',
                  message: 'All profile pictures have been cleared!',
                  buttons: [{ text: 'OK' }]
                });
              } else {
                setAlertConfig({
                  visible: true,
                  title: 'Error',
                  message: result.message || 'Failed to clear profile pictures',
                  buttons: [{ text: 'OK' }]
                });
              }
            } catch (error) {
              console.error('❌ Error clearing profile pictures:', error);
              setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Failed to clear profile pictures',
                buttons: [{ text: 'OK' }]
              });
            }
          },
        },
      ]
    });
  };

  const testPayment = async () => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🟢 [PROFILE SCREEN] Test Payment Button Clicked');
      console.log('='.repeat(60));
      console.log('👤 User Name:', userName);
      console.log('🕒 Timestamp:', new Date().toISOString());
      
      setPaymentLoading(true);
      console.log('⏳ [PROFILE SCREEN] Payment loading state: true');
      
      // Test payment of ₹1
      console.log('\n💸 [PROFILE SCREEN] Initiating PaymentService.processPayment()');
      
      const result = await PaymentService.processPayment(
        1, // Amount in rupees
        {
          name: userName,
          email: '',
          phone: '',
        },
        {
          description: 'Test Payment',
          test: true,
        },
        {
          onVerifyStart: () => {
            console.log('🛡️ [PROFILE SCREEN] onVerifyStart -> showing verification overlay');
            setPaymentProcessing(true);
          },
        }
      );

      // Payment successful! Show success message
      console.log('\n🎉 [PROFILE SCREEN] Payment flow completed successfully!');
      console.log('📊 [PROFILE SCREEN] Result:', JSON.stringify(result, null, 2));
      console.log('✅ [PROFILE SCREEN] Transaction ID:', result.transactionId);
      console.log('✅ [PROFILE SCREEN] Amount:', result.amount / 100, 'rupees');
      console.log('✅ [PROFILE SCREEN] Status:', result.status);
      console.log('\n⏰ [PROFILE SCREEN] Waiting before showing success alert...');
      
      // Small delay then show success
      setTimeout(() => {
        setPaymentProcessing(false); // Hide overlay
        console.log('🔔 [PROFILE SCREEN] Showing success alert to user');
        setAlertConfig({
          visible: true,
          title: 'Payment Successful! 🎉',
          message: `Transaction ID: ${result.transactionId}\nAmount: ₹${result.amount / 100}\nStatus: ${result.status}`,
          buttons: [{ text: 'OK' }]
        });
        console.log('✅ [PROFILE SCREEN] Success alert displayed');
        console.log('='.repeat(60) + '\n');
      }, 300);
    } catch (error) {
      console.error('\n❌ [PROFILE SCREEN] Payment error occurred!');
      console.error('🔴 [PROFILE SCREEN] Error type:', error.constructor.name);
      console.error('🔴 [PROFILE SCREEN] Error message:', error.message);
      console.error('🔴 [PROFILE SCREEN] Error code:', error.code);
      console.error('🔴 [PROFILE SCREEN] Full error:', JSON.stringify(error, null, 2));
      
      setPaymentProcessing(false); // Hide overlay on error
      const errorMsg = error.message || 'Payment failed';
      
      // User cancelled payment
      if (errorMsg.includes('cancel') || error.code === 2) {
        setAlertConfig({
          visible: true,
          title: 'Payment Cancelled',
          message: 'You cancelled the payment.',
          buttons: [{ text: 'OK' }]
        });
      // Server configuration error
      } else if (errorMsg.includes('unavailable') || errorMsg.includes('server configuration')) {
        setAlertConfig({
          visible: true,
          title: 'Service Unavailable',
          message: 'Payment service is currently unavailable. Please ensure the server is running and properly configured.\n\nError: ' + errorMsg,
          buttons: [{ text: 'OK' }]
        });
      } else {
        setAlertConfig({
          visible: true,
          title: 'Payment Failed',
          message: errorMsg,
          buttons: [{ text: 'OK' }]
        });
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleLogout = () => {
    setAlertConfig({
      visible: true,
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1) Clear auth token so app treats user as logged out everywhere
              try {
                // Clear both old and new auth token keys
                await AsyncStorage.removeItem('AUTH_TOKEN'); // Legacy
                await AsyncStorage.removeItem('AUTH_USER'); // Legacy
                await AsyncStorage.removeItem('authToken'); // OTP registration
                await AsyncStorage.removeItem('user'); // OTP registration
                await AsyncStorage.removeItem('tempAuthToken'); // Temp token from OTP check
                console.log('🔐 All auth tokens and user data removed');
              } catch (tokenErr) {
                console.warn('Could not remove auth storage:', tokenErr?.message || tokenErr);
              }

              // 2) Clear user-related local data (profile pics and caches)
              await clearAllProfileData(dispatch);

              // 3) Clear subscription cache
              await SubscriptionService.clearCache();
              console.log('🔐 Subscription cache cleared');

              // 4) Optionally clear any other auth-related caches here in future (user profile, etc.)

            } catch (e) {
              console.warn('Logout cleanup error:', e?.message || e);
            } finally {
              // Reset navigation stack to RegisterWithOTP (since ProfileEntry no longer exists)
              try {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'RegisterWithOTP' }],
                });
                console.log('✅ Logged out and navigated to RegisterWithOTP');
              } catch (navErr) {
                console.warn('Navigation reset error:', navErr?.message || navErr);
                // Fallback to goBack or manual navigation
                try {
                  navigation.navigate('RegisterWithOTP');
                } catch (fallbackErr) {
                  console.warn('Fallback navigation failed:', fallbackErr);
                }
              }
            }
          },
        },
      ]
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Banner Section */}
        {bannerEnabled && bannerUri && (
          <View style={styles.bannerContainer}>
            {isBannerUploading && (
              <View style={styles.bannerUploadingOverlay}>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.bannerUploadingText}>Uploading...</Text>
              </View>
            )}
            {!isBannerUploading && bannerCloudUrl && (
              <View style={styles.bannerUploadedBadge}>
                <Text style={styles.bannerUploadedText}>Saved</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.bannerCloseButton}
              onPress={() => {
                try {
                  setBannerUri(null);
                  setBannerEnabled(false);
                  setIsBannerFocused(false);
                } catch {}
              }}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Remove banner"
            >
              <Text style={styles.bannerCloseButtonText}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: bannerUri }}
              style={styles.bannerImage}
              resizeMode="cover"
              onError={() => {}}
            />
          </View>
        )}

        {/* Profile Picture Section */}
        <View style={styles.profileImageContainer}>
          <TouchableOpacity
            style={styles.profileImageWrapper}
            onPress={handleProfileImagePress}
            activeOpacity={0.8}
            disabled={isProcessingProfile}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image
              key={`profile-image-${profilePictureUri || 'default'}`}
              source={getImageSource()}
              style={styles.profileImage}
              resizeMode="cover"
              defaultSource={getDefaultProfilePicture()}
              onLoad={() => {
                console.log('📷 ProfileScreen: Profile image loaded successfully');
                console.log('📷 ProfileScreen: Image source:', getImageSource());
              }}
              onError={handleImageError}
            />
            {isProcessingProfile && (
              <View style={styles.processingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={COLORS.white} />
                <Text style={styles.processingText}>
                  {processingStatus || 'Processing...'}
                </Text>
              </View>
            )}
            <View style={styles.editIconContainer} pointerEvents="none">
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          <View style={styles.inputContainer}>
            {isEditingName ? (
              <TextInput
                style={styles.textInput}
                value={userName}
                onChangeText={setUserName}
                onBlur={handleNameSave}
                autoFocus
                placeholder="Enter your name"
                placeholderTextColor={COLORS.gray}
              />
            ) : (
              <TouchableOpacity
                style={styles.displayContainer}
                onPress={handleNameEdit}
                activeOpacity={0.7}
              >
                <Text style={styles.displayText}>{userName}</Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Template Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Template Preferences</Text>

          {/* Religion Multi-Select */}
          <Text style={[styles.prefLabel, { marginBottom: 6 }]}>Select Religion(s)</Text>
          <View style={[styles.inputContainer, { paddingVertical: 8 }]}>            
            {RELIGIONS.map((key) => (
              <TouchableOpacity
                key={key}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                onPress={() => {
                  setSelectedReligions(prev => {
                    const set = new Set(prev.map(v => v.toLowerCase()));
                    if (set.has(key)) set.delete(key); else set.add(key);
                    return Array.from(set);
                  });
                }}
              >
                {(() => {
                  const isSelected = selectedReligions.includes(key);
                  const label = key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <>
                      <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxSelected]} />
                      <Text style={styles.checkboxLabel}>{label}</Text>
                    </>
                  );
                })()}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.updateButton, { marginTop: 8 }]}
            onPress={async () => {
              try {
                // Persist to AsyncStorage (plural + primary)
                await TemplatePreferences.setReligions(selectedReligions);

                // Compute a primary religion to drive global selection and refresh logic
                const normalized = Array.isArray(selectedReligions)
                  ? selectedReligions.map(v => String(v).toLowerCase().trim())
                  : [];
                const allSpecific = ['hindu','muslim','christian'];
                const allSelected = allSpecific.every(k => normalized.includes(k));
                const primary = allSelected
                  ? 'all'
                  : (normalized[0] || 'all');

                // Update global store so other screens (e.g., Hero) react immediately
                dispatch(setGlobalReligion(primary));
                try { dispatch(saveMainSubToStorage()); } catch {}

                setAlertConfig({
                  visible: true,
                  title: 'Saved',
                  message: 'Preferences updated',
                  buttons: [{ text: 'OK' }]
                });
              } catch (e) {
                setAlertConfig({
                  visible: true,
                  title: 'Error',
                  message: 'Failed to save preferences',
                  buttons: [{ text: 'OK' }]
                });
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.updateButtonText}>Save Preferences</Text>
          </TouchableOpacity>

        </View>

        {/* Update Button - Show only when there are changes */}
        {hasChanges && (
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <Text style={styles.updateButtonText}>Update Profile</Text>
          </TouchableOpacity>
        )}



        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Profile Picture Options Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowProfileModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              {/* Update Profile Pic Button - White to Purple Horizontal Gradient */}
              <TouchableOpacity
                style={styles.gradientButton}
                onPress={updateProfilePicture}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={styles.updateButtonText}>📸 Update Profile Pic</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Remove Profile Pic Button - Purple to Red Horizontal Gradient */}
              <TouchableOpacity
                style={styles.gradientButton}
                onPress={removeProfilePicture}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={styles.removeButtonText}>🗑️ Remove Profile Pic</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
      />

      {/* Payment Processing Overlay - Covers Razorpay error screen */}
      <Modal
        visible={paymentProcessing}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.paymentProcessingOverlay}>
          <View style={styles.paymentProcessingCard}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.paymentProcessingTitle}>Verifying Payment</Text>
            <Text style={styles.paymentProcessingText}>
              Please wait while we confirm your transaction...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  editIcon: {
    fontSize: 12,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  displayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  displayText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    flex: 1,
  },
  textInput: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    paddingVertical: SPACING.xs,
  },
  phoneContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  countryCodeContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  countryCodeText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    color: COLORS.primary,
  },
  phoneInputContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  phoneDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  phoneDisplayText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    flex: 1,
  },
  phoneTextInput: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    paddingVertical: SPACING.xs,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  updateButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  clearButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    color: COLORS.white,
  },
  spacer: {
    flex: 1,
  },
  testPaymentButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  testPaymentButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  logoutButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    color: '#FF4444',
  },
  prefLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray,
  },
  prefSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
  },
  prefValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    marginRight: 8,
  },
  dropdown: {
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 6,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: SPACING.lg,
    width: screenWidth - (SPACING.lg * 2),
    maxWidth: 400,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalButtons: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },

  // Banner styles
  bannerContainer: {
    width: screenWidth - (SPACING.lg * 2),
    height: (screenWidth - (SPACING.lg * 2)) / 5,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerCloseButton: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bannerCloseButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  bannerAddButton: {
    alignSelf: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  bannerAddButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.white,
    fontWeight: '700',
  },
  bannerUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerUploadingText: {
    color: COLORS.white,
    marginTop: 6,
    ...TYPOGRAPHY.bodySmall,
  },
  bannerUploadedBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 9,
  },
  bannerUploadedText: {
    color: COLORS.white,
    fontSize: 12,
  },
  // Payment processing overlay styles
  paymentProcessingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentProcessingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    minWidth: 260,
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  paymentProcessingTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    color: '#10B981',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  paymentProcessingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '700',
  },

  // Gradient Button Container
  gradientButton: {
    marginBottom: SPACING.md,
    borderRadius: 16,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    overflow: 'hidden',
  },
  
  // LinearGradient Container
  gradientContainer: {
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  
  // Update Profile Pic Button Text (Purple to White Gradient)
  updateButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  
  // Remove Profile Pic Button Text (Purple to Red Gradient)
  removeButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  // Checkbox styles
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.text,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  checkboxBoxSelected: {
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
  },
  checkboxLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
  },
});

export default ProfileScreen;
