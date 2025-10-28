import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_PROFILE_PICTURE, getDefaultProfilePicture } from '../../constants/defaultProfilePicture';

const initialState = {
  profileImage: getDefaultProfilePicture(),
  originalProfileImage: getDefaultProfilePicture(),
  isLoading: true,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    updateProfileImage: (state, action) => {
      const { processedUri, originalUri } = action.payload;
      console.log('🔄 ProfileSlice: Updating profile images:', { processedUri, originalUri });
      state.profileImage = processedUri;
      state.originalProfileImage = originalUri;
    },
    clearProfileImages: (state) => {
      state.profileImage = getDefaultProfilePicture();
      state.originalProfileImage = getDefaultProfilePicture();
    },
    resetToDefault: (state) => {
      console.log('🔄 ProfileSlice: Resetting to default profile images');
      state.profileImage = getDefaultProfilePicture();
      state.originalProfileImage = getDefaultProfilePicture();
      state.isLoading = false;
    },
    loadExistingProfileImagesSuccess: (state, action) => {
      const { processedPath, originalPath } = action.payload;
      if (processedPath && originalPath) {
        state.profileImage = processedPath;
        state.originalProfileImage = originalPath;
      }
      state.isLoading = false;
    },
    loadExistingProfileImagesFailure: (state) => {
      state.isLoading = false;
    },
  },
});

// Simple action to load existing profile images (simplified)
export const loadExistingProfileImages = () => (dispatch) => {
  console.log('📁 Loading existing profile images...');
  dispatch(setLoading(false));
};

export const {
  setLoading,
  updateProfileImage,
  clearProfileImages,
  resetToDefault,
  loadExistingProfileImagesSuccess,
  loadExistingProfileImagesFailure,
} = profileSlice.actions;

// Selectors
export const selectProfileImage = (state) => state.profile.profileImage;
export const selectOriginalProfileImage = (state) => state.profile.originalProfileImage;
export const selectIsLoading = (state) => state.profile.isLoading;

export default profileSlice.reducer;
