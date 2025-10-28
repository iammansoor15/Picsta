import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';

// Import theme with fallbacks
let COLORS, TYPOGRAPHY, SPACING;
try {
  const theme = require('../theme');
  COLORS = theme.COLORS || {
    white: '#FFFFFF',
    black: '#000000',
    primary: '#2962FF',
    accent: '#FF6B6B',
    backgroundDark: '#1a1a1a',
    textSecondary: '#757575',
    error: '#F44336'
  };
  TYPOGRAPHY = theme.TYPOGRAPHY || {
    bodyMedium: { fontSize: 16 },
    bodySmall: { fontSize: 14 },
    button: { fontSize: 16, fontWeight: 'bold' }
  };
  SPACING = theme.SPACING || {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  };
} catch (error) {
  console.warn('Theme not available, using fallback values');
  COLORS = {
    white: '#FFFFFF',
    black: '#000000',
    primary: '#2962FF',
    accent: '#FF6B6B',
    backgroundDark: '#1a1a1a',
    textSecondary: '#757575',
    error: '#F44336'
  };
  TYPOGRAPHY = {
    bodyMedium: { fontSize: 16 },
    bodySmall: { fontSize: 14 },
    button: { fontSize: 16, fontWeight: 'bold' }
  };
  SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  };
}

// Import CropResultManager with fallback
let cropResultManager;
try {
  cropResultManager = require('../utils/CropResultManager').cropResultManager;
} catch (error) {
  console.warn('CropResultManager not available, creating fallback');
  cropResultManager = {
    setCropResult: (uri, photoNumber) => {
      console.log('Fallback: Setting crop result', { uri, photoNumber });
    }
  };
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 5:1 banner crop area
const CROP_WIDTH = Math.min(screenWidth * 0.95, screenWidth);
const CROP_HEIGHT = Math.min(screenHeight * 0.6, Math.round(CROP_WIDTH / 5));

// Image starts slightly larger than crop area so user can see edges
const INITIAL_IMAGE_WIDTH = CROP_WIDTH * 1.2;
const INITIAL_IMAGE_HEIGHT = INITIAL_IMAGE_WIDTH; // keep square base for simplicity

const BannerCrop = ({ route, navigation }) => {
  const { uri, onCropDone } = route.params || {};
  const viewShotRef = useRef();

  // Gesture shared values
  const scale = useSharedValue(0.9);
  const savedScale = useSharedValue(0.9);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newScale = savedScale.value * event.scale;
      // Constrain scale between 0.3x and 4x
      scale.value = Math.min(Math.max(newScale, 0.3), 4);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      if (scale.value < 0.3) {
        scale.value = withSpring(0.9);
        savedScale.value = 0.9;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // Pan gesture for dragging (clamp independently for rectangular area)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newTranslateX = savedTranslateX.value + event.translationX;
      const newTranslateY = savedTranslateY.value + event.translationY;

      const currentWidth = INITIAL_IMAGE_WIDTH * scale.value;
      const currentHeight = INITIAL_IMAGE_HEIGHT * scale.value;
      const maxTranslateX = Math.max(0, (currentWidth - CROP_WIDTH) / 2);
      const maxTranslateY = Math.max(0, (currentHeight - CROP_HEIGHT) / 2);

      translateX.value = Math.min(Math.max(newTranslateX, -maxTranslateX), maxTranslateX);
      translateY.value = Math.min(Math.max(newTranslateY, -maxTranslateY), maxTranslateY);
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combine gestures
  const combinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  }, []);

  const cropImage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!viewShotRef.current) {
        throw new Error('View reference is not available');
      }

      const capturedUri = await viewShotRef.current.capture({ format: 'png', quality: 1, result: 'tmpfile' });

      // Cache-bust the URI so Image reloads even if file path is reused
      const cacheSuffix = `t=${Date.now()}`;
      const finalUri = capturedUri.includes('?') ? `${capturedUri}&${cacheSuffix}` : `${capturedUri}?${cacheSuffix}`;

      // Try callback if provided
      if (typeof onCropDone === 'function') {
        try { onCropDone({ croppedUri: finalUri, cropType: 'banner' }); } catch {}
      }

      // Also notify via the manager for global listeners
      try { cropResultManager.setCropResult(finalUri, 'banner'); } catch {}

      setTimeout(() => { navigation.goBack(); }, 30);
    } catch (e) {
      console.error('Error capturing banner crop:', e);
      setError(`Failed to crop image: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.instructions}>Pinch to zoom • Drag to position • 5:1 Banner</Text>

        <View style={styles.cropContainer}>
          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1 }}>
            <View style={styles.cropArea}>
              {!imageLoaded && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.white} />
                  <Text style={styles.loadingText}>Loading image...</Text>
                </View>
              )}

              <GestureDetector gesture={combinedGesture}>
                <Animated.Image
                  source={{ uri }}
                  style={[styles.image, animatedStyle, !imageLoaded && { opacity: 0 }]}
                  resizeMode="contain"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setError('Failed to load image');
                    setImageLoaded(false);
                  }}
                />
              </GestureDetector>
            </View>
          </ViewShot>

          {/* Visual crop border - outside ViewShot so it's not captured */}
          <View style={styles.cropBorderOverlay} pointerEvents="none" />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.cropButton, isLoading && styles.cropButtonDisabled]}
          onPress={cropImage}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.cropButtonText}>Save Banner</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BannerCrop;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  instructions: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  cropContainer: {
    position: 'relative',
    width: CROP_WIDTH,
    height: CROP_HEIGHT,
  },
  cropArea: {
    width: CROP_WIDTH,
    height: CROP_HEIGHT,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  cropBorderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CROP_WIDTH,
    height: CROP_HEIGHT,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderStyle: 'dashed',
    borderRadius: SPACING.xs,
  },
  image: {
    width: INITIAL_IMAGE_WIDTH,
    height: INITIAL_IMAGE_HEIGHT,
  },
  cropButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.xs,
    marginTop: SPACING.xl,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cropButtonDisabled: {
    opacity: 0.6,
  },
  cropButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: SPACING.md,
    borderRadius: SPACING.xs,
    marginTop: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
});
