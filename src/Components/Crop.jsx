import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
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
// Make crop area larger so user can see more of the image
const CROP_SIZE = Math.min(screenWidth * 0.9, screenHeight * 0.6);
// Set initial image size to fit nicely in crop area
const INITIAL_IMAGE_SIZE = CROP_SIZE * 1.2;

const Crop = ({ route, navigation }) => {
  const { uri, photoNumber, photoId, isDynamicPhoto, onCropDone, shape: initialShape } = route.params || {};
  const viewShotRef = useRef();

  // Gesture shared values - start with smaller scale so user can see full image
  const scale = useSharedValue(0.8);
  const savedScale = useSharedValue(0.8);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCircle, setShowCircle] = useState(initialShape === 'circle' || true);
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
      // Constrain scale between 0.3x and 3x for better usability
      scale.value = Math.min(Math.max(newScale, 0.3), 3);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      // Snap back to minimum scale if below 0.3
      if (scale.value < 0.3) {
        scale.value = withSpring(0.8);
        savedScale.value = 0.8;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      // Calculate new position
      const newTranslateX = savedTranslateX.value + event.translationX;
      const newTranslateY = savedTranslateY.value + event.translationY;
      
      // Calculate bounds based on current scale
      const currentImageSize = INITIAL_IMAGE_SIZE * scale.value;
      const maxTranslate = Math.max(0, (currentImageSize - CROP_SIZE) / 2);
      
      // Apply constraints
      translateX.value = Math.min(Math.max(newTranslateX, -maxTranslate), maxTranslate);
      translateY.value = Math.min(Math.max(newTranslateY, -maxTranslate), maxTranslate);
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
      console.log('Starting image capture...', { photoNumber, showCircle });
      
      if (!viewShotRef.current) {
        throw new Error('View reference is not available');
      }
      
      const captureOptions = { 
        format: 'png', 
        quality: 1,
        result: 'tmpfile'
      };
      
      const capturedUri = await viewShotRef.current.capture(captureOptions);
      console.log('Image captured successfully:', capturedUri);

      // Cache-bust the URI so Image reloads even if file path is reused
      const cacheSuffix = `t=${Date.now()}`;
      const finalUri = capturedUri.includes('?') ? `${capturedUri}&${cacheSuffix}` : `${capturedUri}?${cacheSuffix}`;

      // Try callback if provided
      if (typeof onCropDone === 'function') {
        try {
          onCropDone({ croppedUri: finalUri, photoNumber, photoId, isDynamicPhoto });
        } catch (callbackErr) {
          console.warn('onCropDone callback error (will still use manager):', callbackErr?.message || callbackErr);
        }
      }

      // Always also notify via the global manager to avoid any navigation param/function issues
      try {
        cropResultManager.setCropResult(finalUri, photoNumber, photoId, !!isDynamicPhoto);
      } catch (e) {
        console.warn('Failed to set crop result via manager:', e?.message || e);
      }

      // Give the result a moment to propagate before navigating back
      setTimeout(() => {
        navigation.goBack();
      }, 30);
    } catch (error) {
      console.error('Error capturing image:', error);
      setError(`Failed to crop image: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.content}>
        <Text style={styles.instructions}>Pinch to zoom • Drag to position • Circle shows preview only</Text>
        
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
                  onLoad={() => {
                    console.log('Image loaded successfully');
                    setImageLoaded(true);
                  }}
                  onError={(error) => {
                    console.error('Image load error:', error);
                    setError('Failed to load image');
                    setImageLoaded(false);
                  }}
                />
              </GestureDetector>
            </View>
          </ViewShot>
          
          {/* Visual crop border - outside ViewShot so it's not captured */}
          <View style={styles.cropBorderOverlay} pointerEvents="none" />
          
          {/* Circle guide overlay - outside ViewShot so it's not captured */}
          {showCircle && imageLoaded && (
            <View style={styles.circleGuide} pointerEvents="none">
              <View style={styles.circleBorder} />
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.shapeToggle}
            onPress={() => setShowCircle(prev => !prev)}
          >
            <Text style={styles.shapeToggleText}>
              {showCircle ? '⬛ Preview' : '⭕ Preview'}
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setImageLoaded(false);
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
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
            <Text style={styles.cropButtonText}>Crop & Apply</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Crop;

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
    width: CROP_SIZE,
    height: CROP_SIZE,
  },
  cropArea: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    overflow: 'hidden',
    // Removed border to prevent it appearing in cropped image
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
  circleGuide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBorder: {
    width: CROP_SIZE - 6, // Account for border thickness
    height: CROP_SIZE - 6,
    borderRadius: (CROP_SIZE - 6) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)', // More visible
    borderStyle: 'dashed',
  },
  image: {
    width: INITIAL_IMAGE_SIZE,
    height: INITIAL_IMAGE_SIZE,
  },
  shapeToggle: {
    position: 'absolute',
    top: -40,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.xs,
  },
  shapeToggleText: {
    color: COLORS.white,
    ...TYPOGRAPHY.bodySmall,
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
    color: COLORS.error || '#ff0000',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  cropBorderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderWidth: 3,
    borderColor: COLORS.primary || '#2962FF',
    borderRadius: SPACING.xs || 8,
    backgroundColor: 'transparent',
    zIndex: 15, // Above everything else but still allows interaction
  },
});
