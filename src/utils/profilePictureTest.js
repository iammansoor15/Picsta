// Test utility for profile picture functionality
import { store } from '../store';
import { selectProfilePicture, selectProfilePictureUri, selectIsDefaultPicture } from '../store/slices/profilePictureSlice';

export const testProfilePictureState = () => {
  console.log('🧪 Testing Profile Picture State...');
  
  const state = store.getState();
  const profilePicture = selectProfilePicture(state);
  const profilePictureUri = selectProfilePictureUri(state);
  const isDefaultPicture = selectIsDefaultPicture(state);
  
  console.log('📊 Current Profile Picture State:');
  console.log('  - profilePicture:', profilePicture);
  console.log('  - profilePictureUri:', profilePictureUri);
  console.log('  - isDefaultPicture:', isDefaultPicture);
  
  // Test image source logic
  let imageSource;
  if (profilePictureUri) {
    imageSource = { uri: profilePictureUri };
    console.log('✅ Using custom image URI:', profilePictureUri);
  } else {
    imageSource = profilePicture;
    console.log('✅ Using default profile picture');
  }
  
  console.log('🖼️ Final Image Source:', imageSource);
  
  return {
    profilePicture,
    profilePictureUri,
    isDefaultPicture,
    imageSource
  };
};

export const testImageSourceLogic = (profilePictureUri, isDefaultPicture, profilePicture) => {
  console.log('🧪 Testing Image Source Logic...');
  console.log('  - Input profilePictureUri:', profilePictureUri);
  console.log('  - Input isDefaultPicture:', isDefaultPicture);
  console.log('  - Input profilePicture:', profilePicture);
  
  let imageSource;
  if (profilePictureUri) {
    imageSource = { uri: profilePictureUri };
    console.log('✅ Logic: Using custom image URI');
  } else {
    imageSource = profilePicture;
    console.log('✅ Logic: Using default profile picture');
  }
  
  console.log('🖼️ Logic Result:', imageSource);
  return imageSource;
};
