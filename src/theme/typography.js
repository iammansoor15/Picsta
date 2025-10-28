import { Platform } from 'react-native';
import { moderateScale } from './spacing';

// Professional typography system with responsive scaling

export const FONTS = {
  // Font families
  primary: Platform.OS === 'ios' ? 'System' : 'Roboto',
  secondary: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  
  // Font weights
  thin: '100',
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

export const TYPOGRAPHY = {
  // Headings
  h1: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(32),
    fontWeight: FONTS.bold,
    lineHeight: moderateScale(40),
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(28),
    fontWeight: FONTS.bold,
    lineHeight: moderateScale(36),
    letterSpacing: -0.25,
  },
  h3: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(24),
    fontWeight: FONTS.semiBold,
    lineHeight: moderateScale(32),
  },
  h4: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(20),
    fontWeight: FONTS.semiBold,
    lineHeight: moderateScale(28),
  },
  h5: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(18),
    fontWeight: FONTS.medium,
    lineHeight: moderateScale(24),
  },
  h6: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(16),
    fontWeight: FONTS.medium,
    lineHeight: moderateScale(22),
  },
  
  // Body text
  bodyLarge: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(16),
    fontWeight: FONTS.regular,
    lineHeight: moderateScale(24),
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(14),
    fontWeight: FONTS.regular,
    lineHeight: moderateScale(20),
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily: FONTS.primary,
    fontSize: moderateScale(12),
    fontWeight: FONTS.regular,
    lineHeight: moderateScale(16),
    letterSpacing: 0.4,
  },
  
  // Button text
  button: {
    fontFamily: FONTS.primary,
    fontSize: 14,
    fontWeight: FONTS.medium,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  
  // Caption and overline
  caption: {
    fontFamily: FONTS.primary,
    fontSize: 12,
    fontWeight: FONTS.regular,
    lineHeight: 16,
  },
  overline: {
    fontFamily: FONTS.primary,
    fontSize: 10,
    fontWeight: FONTS.medium,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
};

export default TYPOGRAPHY;