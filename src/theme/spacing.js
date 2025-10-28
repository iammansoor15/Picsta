import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Professional spacing system for the app

export const SPACING = {
  // Base spacing units
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Screen dimensions
  screenWidth: width,
  screenHeight: height,
  
  // Common component sizes
  buttonHeight: 48,
  inputHeight: 56,
  borderRadius: 8,
  iconSize: 24,
  
  // Screen padding
  screenPadding: 16,
  
  // Content spacing
  sectionSpacing: 24,
  itemSpacing: 16,
};

// Responsive sizing helpers
export const responsiveSize = (size) => {
  const standardScreenWidth = 375;
  return (width / standardScreenWidth) * size;
};

export const moderateScale = (size, factor = 0.5) => {
  const scale = width / 375; // Based on standard iPhone 8 width
  return size + (scale - 1) * factor * size;
};

export default SPACING;