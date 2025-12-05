import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { getDefaultProfilePicture } from '../constants/defaultProfilePicture';
import { useSelector } from 'react-redux';
import { selectProfilePictureInfo, selectIsDefaultPicture } from '../store/slices/profilePictureSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomHeader = ({
  title,
  showBack = true,
  showBackButton = true,
  rightComponent,
  backgroundColor = COLORS.primary,
  titleColor = COLORS.white,
  onBackPress,
  showProfilePhoto = false,
}) => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isHome = route.name === 'HeroScreen';
  const shouldShowBack = showBackButton && showBack && !isHome && navigation.canGoBack();

  // Profile image from store (fallback to default)
  const profileInfo = useSelector(selectProfilePictureInfo);
  const isDefaultPicture = useSelector(selectIsDefaultPicture);
  const profileSource = (() => {
    try {
      if (profileInfo?.uri && !isDefaultPicture) {
        return { uri: profileInfo.uri };
      }
    } catch {}
    return getDefaultProfilePicture();
  })();

  const handleBackPress = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, onBackPress]);

  const handleProfilePress = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('AUTH_TOKEN');
      if (!token) {
        navigation.navigate('ProfileEntry');
        return;
      }
    } catch (e) {
      navigation.navigate('ProfileEntry');
      return;
    }
    navigation.navigate('ProfileScreen');
  }, [navigation]);

  const statusBarHeight = Platform.select({
    ios: insets.top,
    android: StatusBar.currentHeight,
  });

  return (
    <>
      <StatusBar
        barStyle={backgroundColor === COLORS.white ? 'dark-content' : 'light-content'}
        backgroundColor={backgroundColor}
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor,
            paddingTop: statusBarHeight,
          },
        ]}
      >
        <View style={[styles.content, { width }]}>
          <View style={styles.left}>
            {shouldShowBack && (
              <TouchableOpacity
                onPress={handleBackPress}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.backIcon, { color: titleColor }]}>←</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.center}>
            <Text
              style={[styles.title, { color: titleColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </View>

          <View style={styles.right}>
            {rightComponent ? rightComponent : (
              showProfilePhoto ? (
                <TouchableOpacity
                  onPress={handleProfilePress}
                  style={styles.profilePhotoContainer}
                  activeOpacity={0.8}
                >
                  <Image
                    source={profileSource}
                    style={styles.profilePhoto}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.placeholder} />
              )
            )}
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 100,
  },
  content: {
    height: 65, // Increased by ~30% (was 50)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  left: {
    width: 48,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    minHeight: 40,
  },
  right: {
    width: 48,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: SPACING.xs,
  },
  backIcon: {
    fontSize: 20, // Reduced to fit smaller header
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    ...TYPOGRAPHY.h6,
    fontSize: 24, // Reduced to 50% of previous (48 -> 24)
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    lineHeight: 28,
  },
  placeholder: {
    width: 24,
    height: 24,
  },
  profilePhotoContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.white,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
});

export default React.memo(CustomHeader);