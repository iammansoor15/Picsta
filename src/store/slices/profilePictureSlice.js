import { createSlice, createSelector } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserAssetsService from '../../services/UserAssetsService';
import { DEFAULT_PROFILE_PICTURE, getDefaultProfilePicture } from '../../constants/defaultProfilePicture';

const STORAGE_KEY = '@narayana_profile_picture_uri';

const initialState = {
  profilePicture: getDefaultProfilePicture(),
  profilePictureUri: null,
  isLoading: true,
  lastUpdated: null,
  isForcedClear: false, // Flag to prevent reloading after comprehensive clear
};

const profilePictureSlice = createSlice({
  name: 'profilePicture',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setDefaultPicture: (state) => {
      console.log('📷 ProfilePictureSlice: Setting default picture');
      state.profilePicture = getDefaultProfilePicture();
      state.profilePictureUri = null;
      state.lastUpdated = new Date().toISOString();
      state.isLoading = false;
    },
    updateProfilePicture: (state, action) => {
      const { imageUri, isProcessed = false } = action.payload;
      try {
        console.log('📷 ProfilePictureSlice: Updating profile picture');
        console.log('📷 ProfilePictureSlice: Image URI:', imageUri);
        console.log('📷 ProfilePictureSlice: Is processed:', isProcessed);
        
        if (imageUri) {
          const newSource = { uri: imageUri };
          state.profilePicture = newSource;
          state.profilePictureUri = imageUri;
          state.lastUpdated = new Date().toISOString();
          console.log('✅ ProfilePictureSlice: Profile picture updated successfully');
        } else {
          console.log('⚠️ ProfilePictureSlice: No image URI provided, resetting to default');
          state.profilePicture = getDefaultProfilePicture();
          state.profilePictureUri = null;
          state.lastUpdated = new Date().toISOString();
        }
      } catch (error) {
        console.error('❌ ProfilePictureSlice: Error updating profile picture:', error);
        state.profilePicture = getDefaultProfilePicture();
        state.profilePictureUri = null;
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateProfilePictureWithRequire: (state, action) => {
      const { requireReference } = action.payload;
      try {
        console.log('📷 ProfilePictureSlice: Updating profile picture with require reference');
        state.profilePicture = requireReference;
        state.profilePictureUri = null;
        state.lastUpdated = new Date().toISOString();
        console.log('✅ ProfilePictureSlice: Profile picture updated with require reference');
      } catch (error) {
        console.error('❌ ProfilePictureSlice: Error updating profile picture with require:', error);
        state.profilePicture = getDefaultProfilePicture();
        state.profilePictureUri = null;
        state.lastUpdated = new Date().toISOString();
      }
    },
    clearProfilePicture: (state) => {
      console.log('📷 ProfilePictureSlice: Clearing profile picture');
      state.profilePicture = getDefaultProfilePicture();
      state.profilePictureUri = null;
      state.lastUpdated = new Date().toISOString();
    },
    resetToDefault: (state) => {
      console.log('📷 ProfilePictureSlice: Resetting to default profile picture');
      state.profilePicture = getDefaultProfilePicture();
      state.profilePictureUri = null;
      state.lastUpdated = new Date().toISOString();
      state.isLoading = false;
      state.isForcedClear = false;
    },
    setForcedClear: (state, action) => {
      state.isForcedClear = action.payload;
    },
    loadExistingProfilePictureSuccess: (state, action) => {
      const { imageUri } = action.payload;
      if (imageUri) {
        state.profilePicture = { uri: imageUri };
        state.profilePictureUri = imageUri;
        state.lastUpdated = new Date().toISOString();
        console.log('📷 ProfilePictureSlice: Loaded existing profile picture:', imageUri);
      }
      state.isLoading = false;
    },
    loadExistingProfilePictureFailure: (state) => {
      console.log('📷 ProfilePictureSlice: Failed to load existing profile picture, keeping default');
      state.isLoading = false;
    },
  },
});

// Thunks
export const loadExistingProfilePicture = (phoneNumber = 'default') => async (dispatch, getState) => {
  console.log('📷 ProfilePictureSlice: Loading existing profile picture...');
  try {
    const state = getState();
    const isForcedClear = state.profilePicture.isForcedClear;
    
    // If profile was force cleared, don't try to reload from storage
    if (isForcedClear) {
      console.log('⚠️ ProfilePictureSlice: Forced clear detected, skipping load from storage');
      dispatch(loadExistingProfilePictureFailure());
      return;
    }
    
    dispatch(setLoading(true));

    // Prefer the latest saved file in user assets
    const latest = await UserAssetsService.getLatestProfileImages(phoneNumber);
    if (latest && (latest.processedPath || latest.originalPath)) {
      const chosen = latest.processedPath || latest.originalPath;
      const uriWithPrefix = chosen.startsWith('file://') ? chosen : `file://${chosen}`;
      dispatch(loadExistingProfilePictureSuccess({ imageUri: uriWithPrefix }));
      // Persist to AsyncStorage for quick reloads
      await AsyncStorage.setItem(STORAGE_KEY, uriWithPrefix);
      return;
    }

    // Fallback to AsyncStorage cache
    const cachedUri = await AsyncStorage.getItem(STORAGE_KEY);
    if (cachedUri) {
      dispatch(loadExistingProfilePictureSuccess({ imageUri: cachedUri }));
      return;
    }

    // Nothing found
    dispatch(loadExistingProfilePictureFailure());
  } catch (err) {
    console.error('❌ Error loading existing profile picture:', err);
    dispatch(loadExistingProfilePictureFailure());
  }
};

export const updateAndPersistProfilePicture = ({ imageUri, isProcessed = false }) => async (dispatch) => {
  try {
    dispatch(updateProfilePicture({ imageUri, isProcessed }));
    if (imageUri) {
      await AsyncStorage.setItem(STORAGE_KEY, imageUri);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('❌ Error persisting profile picture:', err);
  }
};

export const clearPersistedProfilePicture = () => async (dispatch) => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    dispatch(resetToDefault());
  } catch (err) {
    console.error('❌ Error clearing persisted profile picture:', err);
    dispatch(resetToDefault());
  }
};

// Clear all cached profile picture data and force reset
export const clearAllCachedProfileData = () => async (dispatch) => {
  try {
    console.log('🧹 ProfilePictureSlice: Clearing all cached profile data...');
    
    // Remove all AsyncStorage keys
    const keysToRemove = [
      STORAGE_KEY,
      '@profile_picture_original',
      '@profile_picture_no_bg',
      '@profile_picture_metadata',
      '@narayana_profile_images'
    ];
    
    await Promise.all(
      keysToRemove.map(key => 
        AsyncStorage.removeItem(key).catch(err => 
          console.log(`⚠️ Could not remove ${key}:`, err.message)
        )
      )
    );
    
    // Set forced clear flag and reset to default state
    dispatch(setForcedClear(true));
    dispatch(resetToDefault());
    console.log('✅ All cached profile data cleared');
  } catch (err) {
    console.error('❌ Error clearing all cached profile data:', err);
    dispatch(resetToDefault());
  }
};

export const {
  setLoading,
  setDefaultPicture,
  updateProfilePicture,
  updateProfilePictureWithRequire,
  clearProfilePicture,
  resetToDefault,
  setForcedClear,
  loadExistingProfilePictureSuccess,
  loadExistingProfilePictureFailure,
} = profilePictureSlice.actions;

// Selectors
export const selectProfilePicture = (state) => state.profilePicture.profilePicture;
export const selectProfilePictureUri = (state) => state.profilePicture.profilePictureUri;
export const selectIsLoading = (state) => state.profilePicture.isLoading;
export const selectLastUpdated = (state) => state.profilePicture.lastUpdated;
export const selectIsDefaultPicture = (state) => {
  const profilePicture = state.profilePicture.profilePicture;
  const profilePictureUri = state.profilePicture.profilePictureUri;
  
  // If we have a custom URI, it's not default
  if (profilePictureUri) {
    return false;
  }
  
  // Get the current default profile picture for comparison
  const currentDefault = getDefaultProfilePicture();
  
  // If profilePicture matches the current default, it's default
  if (profilePicture && currentDefault) {
    // Check if both are require references (same object)
    if (profilePicture === currentDefault) {
      return true;
    }
    // Check if both have URIs and they match
    if (profilePicture.uri && currentDefault.uri && profilePicture.uri === currentDefault.uri) {
      return true;
    }
  }
  
  // If no profilePicture, assume it's default
  if (!profilePicture) {
    return true;
  }
  
  return false;
};

// Memoized selector to prevent unnecessary re-renders
export const selectProfilePictureInfo = createSelector(
  [selectProfilePicture, selectProfilePictureUri, selectIsDefaultPicture, selectLastUpdated, selectIsLoading],
  (profilePicture, profilePictureUri, isDefault, lastUpdated, isLoading) => ({
    source: profilePicture,
    uri: profilePictureUri,
    isDefault,
    lastUpdated,
    isLoading,
  })
);

export default profilePictureSlice.reducer;
