import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

export const isIphoneX = isIOS && (SCREEN_HEIGHT >= 812 || SCREEN_WIDTH >= 812);

export const STATUS_BAR_HEIGHT = Platform.select({
  ios: isIphoneX ? 44 : 20,
  android: StatusBar.currentHeight,
  default: 0,
});

export const deviceSizes = {
  small: SCREEN_WIDTH < 375,
  medium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768,
  large: SCREEN_WIDTH >= 768,
};

export const getResponsiveValue = (options) => {
  const { small, medium, large, default: defaultValue } = options;
  
  if (deviceSizes.small && small !== undefined) return small;
  if (deviceSizes.medium && medium !== undefined) return medium;
  if (deviceSizes.large && large !== undefined) return large;
  
  return defaultValue;
};

export const getResponsiveSpacing = (baseSize) => {
  if (deviceSizes.small) return baseSize * 0.8;
  if (deviceSizes.large) return baseSize * 1.2;
  return baseSize;
};

export const getResponsiveFontSize = (size) => {
  if (deviceSizes.small) return size * 0.9;
  if (deviceSizes.large) return size * 1.1;
  return size;
};

export const hitSlop = {
  small: { top: 5, right: 5, bottom: 5, left: 5 },
  medium: { top: 10, right: 10, bottom: 10, left: 10 },
  large: { top: 15, right: 15, bottom: 15, left: 15 },
};

export default {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  STATUS_BAR_HEIGHT,
  isIOS,
  isAndroid,
  isWeb,
  isIphoneX,
  deviceSizes,
  getResponsiveValue,
  getResponsiveSpacing,
  getResponsiveFontSize,
  hitSlop,
};