const getDefaultProfileImage = () => {
  try {
    return require('../../assets/user/default_dp.png');
  } catch (error) {
    return getDefaultProfilePicture();
  }
};

import React, { useRef, useState, useReducer, useLayoutEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  PanResponder,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  PermissionsAndroid,
  Platform,
  Modal,
  Share,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert from '../Components/CustomAlert';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { FlingGestureHandler, Directions, State } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import ViewShot from 'react-native-view-shot';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNShare from 'react-native-share';
import Video from 'react-native-video';
import { cropResultManager } from '../utils/CropResultManager';
import ShapeDropdown from '../Components/ShapeDropdown';
import ShapeDropdownDebug from '../Components/ShapeDropdownDebug';
import ShapeDropdownFixed from '../Components/ShapeDropdownFixed';
import DraggableText from '../Components/DraggableText';
import { COLORS } from '../theme/colors';
import backgroundRemovalService from '../services/BackgroundRemovalService';
import ImageMetadataService from '../services/ImageMetadataService';
import ImagePickerService from '../services/ImagePickerService';
import BackgroundToggleService from '../services/BackgroundToggleService';
import VideoPrefetchManager from '../services/VideoPrefetchManager';
// import BackgroundToggleDebugger from '../Components/BackgroundToggleDebugger';
import TemplatePreferences from '../services/TemplatePreferences';
import AuthService from '../services/AuthService';
import { useDispatch, useSelector } from 'react-redux';
import CustomHeader from '../Components/CustomHeader';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { Svg, Path, Rect, Circle, Line } from 'react-native-svg';
import { uploadTemplate } from '../store/slices/cloudinaryTemplateSlice';
import { computeDefaultPositions } from '../utils/DefaultPositions';
import { selectProfileImage, selectOriginalProfileImage, selectProfileDisplayName } from '../store/slices/profileSlice';
import ProfileImageStatusService from '../services/ProfileImageStatusService';
import { selectCategories, loadCategories, fetchCategoriesFromServer } from '../store/slices/categorySlice';
import { loadTemplatesByCategory } from '../store/slices/cloudinaryTemplateSlice';
import { selectReligion as selectGlobalReligion, selectSubcategory as selectGlobalSub, setSubcategory as setGlobalSub, setReligion as setGlobalReligion, loadMainSubFromStorage, saveMainSubToStorage } from '../store/slices/mainCategorySlice';
import TemplateService from '../services/TemplateService';
import UserTemplatesService from '../services/UserTemplatesService';
import AppConfig from '../config/AppConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VideoCompositeService from '../services/VideoCompositeService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MENU_BAR_HEIGHT = 113; // +15% from 98
const CONTAINER_PADDING = 35;

// Available space within padding and menu bar
const AVAILABLE_WIDTH = screenWidth - (CONTAINER_PADDING * 2);
const AVAILABLE_HEIGHT = screenHeight - MENU_BAR_HEIGHT - (CONTAINER_PADDING * 2);

// Minimal SVG icons for menu (requires react-native-svg)
const BannerSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 3h12a1 1 0 0 1 1 1v16l-7-3-7 3V4a1 1 0 0 1 1-1z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TextSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Capital A */}
    <Path d="M7 17L10 7h1l3 10M8 14h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    {/* Lowercase a */}
    <Path d="M16 17v-4a2 2 0 1 1 4 0v4M20 15h-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    {/* Cursor line */}
    <Path d="M22 8v9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const PhotoSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Camera body */}
    <Path d="M3 9a2 2 0 0 1 2-2h1l1-2h6l1 2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    {/* Camera lens circle */}
    <Circle cx="10" cy="13" r="3" stroke={color} strokeWidth={1.8} />
    {/* Plus sign */}
    <Path d="M19 3v4M17 5h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const WandSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Head circle */}
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    {/* Body/shoulders */}
    <Path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const RestoreSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v4l3-3M12 19a7 7 0 1 0-7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ResetSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 12a9 9 0 1 0 9-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 4v5h5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TemplateSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M9 7h6M9 11h6M9 15h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Bounds
const MIN_CONTAINER_WIDTH = 200;
const MIN_CONTAINER_HEIGHT = 300;
const MAX_CONTAINER_WIDTH = screenWidth * 0.9;
const MAX_CONTAINER_HEIGHT = screenHeight * 0.8;

// Helpers to derive dims from a ratio (width/height)
const parseRatio = (r) => {
  if (!r || typeof r !== 'string' || !r.includes(':')) return null;
  const [w, h] = r.split(':').map(Number);
  if (!w || !h) return null;
  return w / h;
};

const computeContainerDims = (ratioWOverH) => {
  const aspect = ratioWOverH || (9 / 16);
  let width, height;
  if (AVAILABLE_HEIGHT * aspect <= AVAILABLE_WIDTH) {
    height = AVAILABLE_HEIGHT;
    width = height * aspect;
  } else {
    width = AVAILABLE_WIDTH;
    height = width / aspect;
  }
  width = Math.max(MIN_CONTAINER_WIDTH, Math.min(MAX_CONTAINER_WIDTH, width));
  height = Math.max(MIN_CONTAINER_HEIGHT, Math.min(MAX_CONTAINER_HEIGHT, height));
  return { width, height };
};

// Default container dimensions used for initial static styles and calculations
const __DEFAULT_RATIO = 9 / 16;
const __DEFAULT_DIMS = computeContainerDims(__DEFAULT_RATIO);
const IMAGE_CONTAINER_WIDTH = __DEFAULT_DIMS.width;
const IMAGE_CONTAINER_HEIGHT = __DEFAULT_DIMS.height;

// Padding used for clamping photo container inside the template area
const BOUND_PADDING = 0;

// Photo state reducer for better state management
const photoStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_PHOTO_1':
      const newState1 = {
        ...state,
        photo1Uri: action.uri
      };
      return newState1;
    case 'SET_PHOTO_2':
      const newState2 = {
        ...state,
        photo2Uri: action.uri
      };
      return newState2;
    case 'CLEAR_PHOTO_1':
      return {
        ...state,
        photo1Uri: null
      };
    case 'CLEAR_PHOTO_2':
      return {
        ...state,
        photo2Uri: null
      };
    default:
      return state;
  }
};

// Draggable dynamic photo element using Reanimated for smooth movement
const DynamicPhotoElement = ({
  id,
  uri,
  x,
  y,
  size,
  shape,
  focused,
  onFocus,
  onPress,
  onDelete,
  onUpdatePosition,
  onUpdateSize,
  onDragStart,
  onDragEnd,
  containerWidth,
  containerHeight,
  minSize = 60,
  maxSize = 200,
}) => {
  const translateX = useSharedValue(x || 0);
  const translateY = useSharedValue(y || 0);
  const lastPropX = React.useRef(x || 0);
  const lastPropY = React.useRef(y || 0);

  // Keep local position in sync when props change (e.g., after programmatic updates)
  // BUT only if the prop change is significant (not just echo from our own update)
  React.useEffect(() => {
    const propX = x || 0;
    const propY = y || 0;
    
    // Only sync if props actually changed by a meaningful amount
    // This prevents echo-back from onUpdatePosition calls
    if (Math.abs(propX - lastPropX.current) > 1 || Math.abs(propY - lastPropY.current) > 1) {
      translateX.value = propX;
      translateY.value = propY;
      lastPropX.current = propX;
      lastPropY.current = propY;
    }
  }, [x, y]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  }, []);

  const startXRef = React.useRef(0);
  const startYRef = React.useRef(0);
  const isDraggingRef = React.useRef(false);
  const hasMovedRef = React.useRef(false);
  const gestureStartTimeRef = React.useRef(0);

  const panResponder = React.useRef(
    PanResponder.create({
      // Let taps fall through to onPress handler; only capture when moving
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        startXRef.current = translateX.value;
        startYRef.current = translateY.value;
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        gestureStartTimeRef.current = Date.now();
        try { onDragStart && onDragStart(id); } catch (e) {}
      },
      onPanResponderMove: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2) {
          hasMovedRef.current = true;
        }
        if (!isDraggingRef.current && hasMovedRef.current) {
          isDraggingRef.current = true;
        }

        // Constrain within container bounds
        const padding = 10;
        const minX = padding;
        const minY = padding;
        const maxX = Math.max(minX, containerWidth - size - padding);
        const maxY = Math.max(minY, containerHeight - size - padding);

        const newX = Math.max(minX, Math.min(maxX, startXRef.current + gestureState.dx));
        const newY = Math.max(minY, Math.min(maxY, startYRef.current + gestureState.dy));

        translateX.value = newX;
        translateY.value = newY;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const gestureTime = Date.now() - gestureStartTimeRef.current;
        const moved = Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;

        // Final clamp
        const padding = 10;
        const minX = padding;
        const minY = padding;
        const maxX = Math.max(minX, containerWidth - size - padding);
        const maxY = Math.max(minY, containerHeight - size - padding);

        const finalX = Math.max(minX, Math.min(maxX, translateX.value));
        const finalY = Math.max(minY, Math.min(maxY, translateY.value));

        translateX.value = finalX;
        translateY.value = finalY;

        if (!(moved || isDraggingRef.current || hasMovedRef.current) && gestureTime < 300) {
          // Quick tap
          if (focused) {
            onPress && onPress(id);
          } else {
            onFocus && onFocus(id);
          }
        } else {
          // Commit position update to parent state
          onUpdatePosition && onUpdatePosition(id, finalX, finalY);
        }

        isDraggingRef.current = false;
        hasMovedRef.current = false;
        gestureStartTimeRef.current = 0;
        try { onDragEnd && onDragEnd(id); } catch (e) {}
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        gestureStartTimeRef.current = 0;
        try { onDragEnd && onDragEnd(id); } catch (e) {}
      },
    })
  ).current;

  const toSource = (u) => {
    try {
      if (!u || u === 'default_profile_image') return getDefaultProfileImage();
      if (typeof u === 'string') return { uri: u };
      if (typeof u === 'object' && typeof u.uri === 'string') return { uri: u.uri };
      return getDefaultProfileImage();
    } catch (e) {
      return getDefaultProfileImage();
    }
  };

  const imageSource = toSource(uri);
  const isBgRemoved = (typeof uri === 'string' && uri.includes('bg_removed'));
  const resizeMode = isBgRemoved ? 'contain' : 'cover';

  // Center-anchored resize pan responder for dynamic photo
  const initialResizeRef = React.useRef({ size: size, cx: 0, cy: 0 });
  const resizeResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        const s = size || minSize;
        const startX = translateX.value;
        const startY = translateY.value;
        const cx = startX + s / 2;
        const cy = startY + s / 2;
        initialResizeRef.current = { size: s, cx, cy };
      },
      onPanResponderMove: (evt, gestureState) => {
        const delta = (gestureState.dx + gestureState.dy) / 2;
        // Match static behavior: invert direction
        let proposedSize = initialResizeRef.current.size - delta;

        const padding = BOUND_PADDING;
        const cx0 = initialResizeRef.current.cx;
        const cy0 = initialResizeRef.current.cy;

        const minHalf = (minSize || 60) / 2;
        // Clamp center so minHalf fits
        const cx = Math.max(padding + minHalf, Math.min(containerWidth - padding - minHalf, cx0));
        const cy = Math.max(padding + minHalf, Math.min(containerHeight - padding - minHalf, cy0));

        const maxHalf = Math.min(
          (maxSize || 200) / 2,
          cx - padding,
          cy - padding,
          (containerWidth - padding) - cx,
          (containerHeight - padding) - cy
        );

        const proposedHalf = proposedSize / 2;
        const clampedHalf = Math.max(minHalf, Math.min(maxHalf, proposedHalf));
        const newSize = clampedHalf * 2;

        // Compute new top-left and clamp
        let newX = cx - clampedHalf;
        let newY = cy - clampedHalf;
        const minX = padding;
        const minY = padding;
        const maxX = containerWidth - padding - newSize;
        const maxY = containerHeight - padding - newSize;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        translateX.value = newX;
        translateY.value = newY;
        if (onUpdatePosition) onUpdatePosition(id, newX, newY);
        if (onUpdateSize) onUpdateSize(id, newSize);
      },
      onPanResponderRelease: () => {
        // Final guard using current position
        const padding = BOUND_PADDING;
        const currSize = typeof size === 'number' ? size : initialResizeRef.current.size;
        const half = currSize / 2;
        const currX = translateX.value;
        const currY = translateY.value;
        const cx = currX + half;
        const cy = currY + half;
        const clampedCx = Math.max(padding + half, Math.min(containerWidth - padding - half, cx));
        const clampedCy = Math.max(padding + half, Math.min(containerHeight - padding - half, cy));
        const newX = Math.max(padding, Math.min(containerWidth - padding - currSize, clampedCx - half));
        const newY = Math.max(padding, Math.min(containerHeight - padding - currSize, clampedCy - half));
        translateX.value = newX;
        translateY.value = newY;
        if (onUpdatePosition) onUpdatePosition(id, newX, newY);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <Reanimated.View
      style={[
        styles.dynamicPhotoContainer,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : 8,
        },
        focused && styles.focusedPhotoContainer,
        animatedStyle,
      ]}
      {...panResponder.panHandlers}
    >
      {/* Capture taps to focus or open gallery when focused */}
      <TouchableOpacity
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1 }}
        activeOpacity={0.9}
        onPress={() => {
          // Tap behavior: focus first, then open gallery when focused
          if (focused) {
            onPress && onPress(id);
          } else {
            onFocus && onFocus(id);
          }
        }}
      >
        <Image
          source={imageSource}
          style={[
            styles.dynamicPhotoImage,
            { borderRadius: shape === 'circle' ? size / 2 : 8 },
          ]}
          resizeMode={resizeMode}
        />
      </TouchableOpacity>

      {focused && (
        <>
          {/* Resize handle for dynamic photo (top-left) */}
          <View
            style={styles.dynamicPhotoResize}
            {...resizeResponder.panHandlers}
          >
            <Text style={styles.dynamicPhotoResizeText}>⤢</Text>
          </View>
          <TouchableOpacity
            style={styles.photoDeleteButton}
            onPress={() => {
              // Delete the photo element without triggering underlying gallery tap
              onDelete && onDelete(id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.photoDeleteButtonText}>✖</Text>
          </TouchableOpacity>
        </>
      )}
    </Reanimated.View>
  );
};


// Separate component for video template items to use hooks properly
const VideoTemplateItem = ({ item, index, containerWidth, containerHeight, isCurrentVideo, onCached, hideVideoForCapture = false, captureBgColor = 'transparent' }) => {
  const [videoSource, setVideoSource] = React.useState(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(true);
  const [canPlay, setCanPlay] = React.useState(false);
  const videoRef = React.useRef(null);
  const hasInitialized = React.useRef(false);

  const videoUrl = item?.video_url;
  const imageUrl = item?.image_url || item?.url || item?.secure_url;
  const serialNo = item?.serial_no;
  const isVideo = item?.resource_type === 'video' ||
                  (videoUrl && (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.mov') ||
                   videoUrl.endsWith('.avi') || videoUrl.includes('/video/upload/')));

  // Initialize video source from cache or stream
  React.useEffect(() => {
    if (!isVideo || !videoUrl || hasInitialized.current) return;

    const initializeVideo = async () => {
      try {
        hasInitialized.current = true;

        // Check if already cached via VideoPrefetchManager
        const cachedUri = await VideoPrefetchManager.getCachedUri(videoUrl, serialNo, index);

        if (cachedUri) {
          console.log(`✅ Using cached video at index ${index}`);
          setVideoSource(cachedUri);
          try { onCached && onCached(cachedUri); } catch (_) {}
        } else {
          console.log(`🌐 Streaming video at index ${index}`);
          setVideoSource(videoUrl);
        }

        setIsReady(true);
      } catch (error) {
        console.error(`❌ Video initialization error at index ${index}:`, error);
        // Fallback to streaming
        setVideoSource(videoUrl);
        setIsReady(true);
      }
    };

    initializeVideo();
  }, [isVideo, videoUrl, index, serialNo]);

  // When video becomes current and is ready, seek to start
  React.useEffect(() => {
    if (isCurrentVideo && isReady && videoRef.current) {
      videoRef.current.seek(0);
      console.log(`🔄 Restarting video at index ${index}`);
    }
  }, [isCurrentVideo, isReady, index]);

  // For images, mark as ready immediately; for videos, allow initial play
  React.useEffect(() => {
    if (!isVideo) {
      setIsReady(true);
    } else if (videoSource) {
      // Allow video to start playing once source is available
      setCanPlay(true);
      setIsBuffering(false);
    }
  }, [isVideo, videoSource]);
  
  // Only show buffering on initial load, not during scroll transitions
  const showBuffering = false; // Disabled for smooth scroll experience

  return (
    <View style={{ width: containerWidth, height: containerHeight, backgroundColor: captureBgColor || 'transparent' }}>
      {isVideo ? (
        <>
          {videoSource && !hideVideoForCapture ? (
            <Video
              ref={videoRef}
              source={{ uri: videoSource }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              repeat={true}
              muted={!isCurrentVideo}
              volume={isCurrentVideo ? 1.0 : 0}
              paused={!isCurrentVideo}
              controls={false}
              ignoreSilentSwitch="ignore"
              posterResizeMode="cover"
              poster={imageUrl}
              bufferConfig={{
                minBufferMs: 3000,  // Optimized for instant playback
                maxBufferMs: 20000,  // Reduced for faster startup
                bufferForPlaybackMs: 500,  // Minimal buffer for instant start
                bufferForPlaybackAfterRebufferMs: 2000
              }}
              maxBitRate={2000000}
              progressUpdateInterval={250}
              onLoad={(data) => {
                console.log(`✅ Video loaded at index ${index}, duration: ${data.duration}s`);
                setIsReady(true);
                setCanPlay(true);
                setIsBuffering(false);
              }}
              onBuffer={({ isBuffering: buffering }) => {
                // Only log buffering, don't show UI
                if (buffering) {
                  console.log(`📊 Video buffering at index ${index}`);
                } else {
                  console.log(`✅ Video ready at index ${index}`);
                  setCanPlay(true);
                }
              }}
              onReadyForDisplay={() => {
                console.log(`✅ Video ready for display at index ${index}`);
                setIsReady(true);
                setCanPlay(true);
                setIsBuffering(false);
              }}
              onError={(error) => {
                console.error(`❌ Video playback error at index ${index}:`, error);
              }}
            />
          ) : null}

          {/* No buffering indicator for smooth scroll experience */}
        </>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onLoad={() => {
            console.log(`✅ Image loaded at index ${index}, serial: ${item?.serial_no}`);
          }}
          onError={(e) => {
            console.error(`❌ Image load error at index ${index}:`, e?.nativeEvent?.error);
          }}
        />
      )}
    </View>
  );
};

const HeroScreen = ({ route, navigation }) => {
  // Safe area insets to avoid overlapping the status bar (especially on notch devices)
  const insets = useSafeAreaInsets();
  const statusBarOffset = Platform.OS === 'android'
    ? (StatusBar.currentHeight || insets.top || 0)
    : (insets.top || 0);

  // Generate unique instance ID for this HeroScreen (used to track banner source)
  const instanceIdRef = useRef(`hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const instanceId = instanceIdRef.current;

  // Hide React Navigation header for this screen
  useLayoutEffect(() => {
    try {
      navigation.setOptions({ headerShown: false });
    } catch (e) {
      // no-op
    }
  }, [navigation]);
  const initialParams = route.params || {};
  const [templateImage, setTemplateImage] = useState(initialParams.image);

  // Local mode support for exact replica usage
  const localMode = !!initialParams.localMode;
  const initialLocalTemplates = Array.isArray(initialParams.initialTemplates) ? initialParams.initialTemplates : null;
  const initialLocalIndex = typeof initialParams.initialIndex === 'number' ? Math.max(0, Math.floor(initialParams.initialIndex)) : 0;
  
  // Reels templates across all categories
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);
  const [reelsTemplates, setReelsTemplates] = useState([]);
  
  const [isReelsLoading, setIsReelsLoading] = useState(false);
  
  // Initialize from local templates when localMode is enabled
  React.useEffect(() => {
    if (localMode && initialLocalTemplates) {
      const normalizeUri = (u) => {
        if (!u) return null;
        if (typeof u !== 'string') return u;
        let s = u.replace(/^"|"$/g, '');
        if (s.startsWith('/')) s = `file://${s}`;
        return s;
      };
      const mapped = initialLocalTemplates.map((t, idx) => ({
        ...t,
        serial_no: t?.serial_no || idx + 1,
        image_url: normalizeUri(t?.image_url || t?.url || t?.uri),
      }));
      setReelsTemplates(mapped);
      setSelectedCategory('local');
      // Set initial index/serial for starting position
      const safeIndex = Math.max(0, Math.min(mapped.length - 1, initialLocalIndex));
      setCurrentReelIndex(safeIndex);
      const startSerial = mapped[safeIndex]?.serial_no || 1;
      setCurrentSerial(startSerial);
      setIsReelsLoading(false);
    }
  }, [localMode, initialLocalTemplates, initialLocalIndex]);
  
  
// Selected category for filtering templates
  const [selectedCategory, setSelectedCategory] = useState(null); // Start with null to allow proper initialization
  const [isHeroLoading, setIsHeroLoading] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoProcessingStatus, setVideoProcessingStatus] = useState('');

  // Custom alert state
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Global main/sub selections
  const globalReligion = useSelector(selectGlobalReligion);
  const globalSubcategory = useSelector(selectGlobalSub);

  // Keep local selectedCategory in sync with global subcategory
  React.useEffect(() => {
    if (localMode) return;
    if (globalSubcategory && globalSubcategory !== selectedCategory) {
      setSelectedCategory(globalSubcategory);
    } else if (!selectedCategory && !globalSubcategory) {
      // Initialize to congratulations if both are null/empty
      setSelectedCategory('congratulations');
    }
  }, [globalSubcategory, selectedCategory]);

  // Persist selected subcategory; also persist to global slice storage (only if changed)
  const persistenceTimeoutRef = React.useRef(null);
  React.useEffect(() => {
    if (localMode) return;
    if (!selectedCategory) return;
    if (selectedCategory === globalSubcategory) return;
    
    // Clear any pending persistence
    if (persistenceTimeoutRef.current) {
      clearTimeout(persistenceTimeoutRef.current);
    }
    
    // Delay persistence slightly to avoid race conditions with rapid changes
    persistenceTimeoutRef.current = setTimeout(() => {
      try {
        TemplatePreferences.setSubcategory(selectedCategory);
        dispatch(setGlobalSub(selectedCategory));
        try { dispatch(saveMainSubToStorage()); } catch {}
      } catch (e) {
        // Silent fail - persistence error
      }
    }, 500); // 500ms delay
    
    return () => {
      if (persistenceTimeoutRef.current) {
        clearTimeout(persistenceTimeoutRef.current);
      }
    };
  }, [selectedCategory, globalSubcategory, dispatch]);

  // Centralized refresh when main/sub changes: fetch latest + category list with loading state
  const lastRefreshed = React.useRef({ main: null, sub: null });
  const lastNotified = React.useRef({ main: null, sub: null });
  const refreshForSelection = React.useCallback(async (main, sub) => {
    const m = String(main || 'all').toLowerCase();
    // Use the passed subcategory first, then selected category, then default to congratulations
    const s = String(sub || selectedCategory || 'congratulations').toLowerCase();
    if (lastRefreshed.current.main === m && lastRefreshed.current.sub === s) {
      return; // avoid duplicate refresh loops
    }
    lastRefreshed.current = { main: m, sub: s };

    setIsHeroLoading(true);
    try {
      // 1) Fast latest document to immediately show an image if any
      let doc = null;
      if (m === 'all') {
        try { doc = await TemplateService.getLatestTemplate(s); } catch {}
      } else {
        try { doc = await TemplateService.getLatestByMainAndSub(m, s); } catch {}
      }
      if (doc) {
        applyDocToTemplate(doc, Number(doc?.serial_no || 1));
      } else {
        // Optional: notify user once per selection when nothing found
        if (lastNotified.current.main !== m || lastNotified.current.sub !== s) {
          lastNotified.current = { main: m, sub: s };
          try {
            setAlertConfig({
              visible: true,
              title: 'No template found',
              message: `No latest template found for ${m}/${s}.`,
              buttons: [{ text: 'OK' }]
            });
          } catch {}
        }
      }
      // 2) Refresh category grid/list for this subcategory
      const optsBase = { page: 1, limit: 10, reset: true };
      const opts = (m && m !== 'all') ? { ...optsBase, religion: m } : optsBase;
      try {
        await dispatch(loadTemplatesByCategory({ category: s, options: opts })).unwrap();
      } catch (_) {
        // Non-fatal for the main image; grid may show its own error state
      }
    } finally {
      setIsHeroLoading(false);
    }
  }, [dispatch, applyDocToTemplate, selectedCategory]);

  // Trigger refresh whenever main/sub selection changes
  React.useEffect(() => {
    if (localMode) return; // skip all cloud refresh in local mode
    const main = (globalReligion || 'all');
    const sub = (globalSubcategory || selectedCategory || 'congratulations');
    
    // Don't trigger refresh if we're in the middle of a user selection
    const isUserSelecting = Date.now() - (lastUserSelectionRef.current || 0) < 1000;
    
    if (sub && !isUserSelecting) {
      refreshForSelection(main, sub);
    } else if (isUserSelecting) {
      // Defer the refresh until user selection settles
      setTimeout(() => {
        if (sub) refreshForSelection(main, sub);
      }, 1500);
    }
  }, [globalReligion, globalSubcategory, selectedCategory, refreshForSelection, localMode]);
  const [selectedReligions, setSelectedReligions] = useState(['hindu']);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Initialize selected religions from saved preferences
  React.useEffect(() => {
    if (localMode) return;
    (async () => {
      try {
        const arr = await TemplatePreferences.getReligions();
        if (Array.isArray(arr) && arr.length) setSelectedReligions(arr);
      } catch {}
    })();
  }, []);

  // On focus (e.g., after returning from Profile), re-hydrate global main/sub
  // But only if we don't already have a valid selection to avoid overriding user choices
  const hasLoaded = React.useRef(false);
  const lastUserSelectionRef = React.useRef(0);
  const previousReligionRef = React.useRef(globalReligion);
  const [screenResetKey, setScreenResetKey] = React.useState(0);

  // Comprehensive reset function for when religion changes
  const resetHeroScreen = React.useCallback(() => {
    
    // Reset all refs
    hasLoaded.current = false;
    lastUserSelectionRef.current = 0;
    lastRefreshed.current = { main: null, sub: null };
    lastNotified.current = { main: null, sub: null };
    previousReligionRef.current = globalReligion;
    defaultTextAddedRef.current = false;
    currentIndexRef.current = 0;
    
    // Clear all state
    setTemplateImage(null);
    setSelectedCategory(null); // Will re-initialize
    setReelsTemplates([]);
    setIsReelsLoading(false);
    setIsHeroLoading(false);
    setCurrentSerial(1);
    setTotalSerials(1);
    setCategorySerials([]);
    setAppliedAxisForUri(null);
    
    // Reset photo state
    dispatchPhotoState({ type: 'RESET' });
    
    // Reset text elements
    setTextElements([]);
    setFocusedTextId(null);
    setSelectedTextId(null);
    
    // Reset photo elements
    setPhotoElements([]);
    setFocusedPhotoId(null);
    
    // Reset background removal state
    setIsRemovingBackground(false);
    setBackgroundRemovalProgress(0);
    setBackgroundRemovalStatus('');
    setIsBackgroundRemoved(false);
    
    // Clear caches
    setCachedBgRemovedPhoto1(null);
    setCachedBgRemovedPhoto2(null);
    
    // Clear timeouts
    if (persistenceTimeoutRef.current) {
      clearTimeout(persistenceTimeoutRef.current);
      persistenceTimeoutRef.current = null;
    }
    
    // Force re-initialization by incrementing key
    setScreenResetKey(prev => prev + 1);
    
  }, [globalReligion, dispatchPhotoState]);

  // Detect religion changes and trigger reset
  React.useEffect(() => {
    if (localMode) return;
    const currentReligion = globalReligion;
    const previousReligion = previousReligionRef.current;
    
    // Skip on first mount (when previous is null/undefined)
    if (!previousReligion) {
      previousReligionRef.current = currentReligion;
      return;
    }
    
    // Check if religion actually changed
    const religionChanged = currentReligion !== previousReligion;
    
    if (religionChanged) {
      
      // Small delay to ensure any pending operations complete
      setTimeout(() => {
        resetHeroScreen();
        
        // After reset, trigger a fresh template load
        setTimeout(() => {
          const sub = selectedCategory || 'congratulations';
          refreshForSelection(currentReligion, sub);
        }, 500);
      }, 100);
    }
  }, [globalReligion, resetHeroScreen, refreshForSelection, selectedCategory]);
  useFocusEffect(
    React.useCallback(() => {
      if (localMode) return () => {};
      let active = true;
      (async () => {
        try {
          // Only load from storage on first focus or if we have no current selection
          const shouldLoadFromStorage = !hasLoaded.current || (!selectedCategory && !globalSubcategory);
          if (!shouldLoadFromStorage) {
            return;
          }
          const [r, s] = await Promise.all([
            TemplatePreferences.getReligion(),
            TemplatePreferences.getSubcategory(),
          ]);
          if (!active) return;
          hasLoaded.current = true;
          if (r) {
            const arr = Array.isArray(r) ? r : [r];
            if (JSON.stringify(arr) !== JSON.stringify(selectedReligions)) {
              setSelectedReligions(arr);
            }
            if (r !== globalReligion) {
              dispatch(setGlobalReligion(r));
            }
          }
          if (s) {
            if (s !== selectedCategory) setSelectedCategory(s);
            if (s !== globalSubcategory) dispatch(setGlobalSub(s));
          }
          try { dispatch(saveMainSubToStorage()); } catch {}
        } catch (err) {}
      })();
      return () => { active = false; };
    }, [dispatch, globalReligion, globalSubcategory, selectedReligions, selectedCategory, localMode])
  );
  const reelsListRef = useRef(null);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const currentIndexRef = useRef(0);
  React.useEffect(() => { currentIndexRef.current = currentReelIndex; }, [currentReelIndex]);
  const [backStack, setBackStack] = useState([]); // keep up to 10 previously seen indices
  const [page, setPage] = useState(1);
  
  // Log pagination state changes
  React.useEffect(() => {
    if (localMode) return;
    console.log('📊 Pagination State Changed:', {
      currentPage: page,
      templatesCount: reelsTemplates.length,
      currentIndex: currentReelIndex,
      backStackSize: backStack.length,
      isNearEnd: reelsTemplates.length > 0 && currentReelIndex >= reelsTemplates.length - 2,
      timestamp: new Date().toISOString()
    });
  }, [page, reelsTemplates.length, currentReelIndex, backStack.length]);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    // Ignore template switching while dragging overlays
    if (isDraggingRef.current) {
      return;
    }
    if (viewableItems && viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
      const newIndex = viewableItems[0].index;
      const prevIndex = currentIndexRef.current;
      
      console.log('\n' + '='.repeat(80));
      console.log('📱 SCROLL EVENT DETECTED - Viewable Items Changed');
      console.log('='.repeat(80));
      console.log('📱 Image Scroll Detected:', {
        previousIndex: prevIndex,
        newIndex: newIndex,
        direction: newIndex > prevIndex ? '⬆️ FORWARD (Swipe Up)' : '⬇️ BACKWARD (Swipe Down)',
        scrollDistance: Math.abs(newIndex - prevIndex),
        totalVisibleItems: viewableItems.length,
        visibilityThreshold: '80%',
        timestamp: new Date().toISOString()
      });
      console.log('-'.repeat(80));
      
      // Log the currently visible item details if available
      if (reelsTemplates && reelsTemplates[newIndex]) {
        const currentItem = reelsTemplates[newIndex];
        const viewingSerial = currentItem.serial_no;
        const isVideo = currentItem.resource_type === 'video' || !!currentItem.video_url;
        const mediaUrl = isVideo ? (currentItem.video_url || currentItem.image_url) : currentItem.image_url;
        
        console.log('🎬 NOW VIEWING:', {
          index: newIndex,
          serial_no: viewingSerial,
          category: currentItem.subcategory || currentItem.category,
          mediaType: isVideo ? '🎥 VIDEO' : '🖼️ IMAGE',
          videoUrl: currentItem.video_url ? currentItem.video_url.substring(0, 60) + '...' : 'N/A',
          imageUrl: currentItem.image_url?.substring(0, 60) + '...',
          displayUrl: mediaUrl?.substring(0, 60) + '...',
          hasVideo: !!currentItem.video_url,
          hasImage: !!currentItem.image_url,
          resourceType: currentItem.resource_type || 'unknown',
          isCurrentSerial: viewingSerial === currentSerial
        });
        console.log('='.repeat(80) + '\n');
        
        // Update currentSerial only if it's different and we're not in a fetch cycle
        if (viewingSerial !== currentSerial) {
          console.log('🔄 Updating currentSerial for display:', {
            from: currentSerial,
            to: viewingSerial,
            reason: 'User scrolled to different serial'
          });
          setCurrentSerial(viewingSerial);
        }
        
        // Update template image if it's different
        if (templateImage?.uri !== currentItem.image_url) {
          console.log('🖼️ Updating template image from scroll:', {
            serial: viewingSerial,
            imageUrl: currentItem.image_url?.substring(0, 50) + '...'
          });
          setTemplateImage({ uri: currentItem.image_url });
        }
      }
      
      if (newIndex > prevIndex) {
        console.log('📎 Adding to back stack:', { 
          addingIndex: prevIndex, 
          newBackStackSize: backStack.length + 1 
        });
        
        setBackStack(prev => {
          const next = [...prev, prevIndex];
          const trimmed = next.length > 10 ? next.slice(next.length - 10) : next;
          if (trimmed.length !== next.length) {
            console.log('📎 Back stack trimmed - keeping last 10 items');
          }
          return trimmed;
        });
        
        // Check if we're approaching the end and need to load more
        if (reelsTemplates && newIndex >= reelsTemplates.length - 2) {
          const currentTemplate = reelsTemplates[newIndex];
          const nextBatchStartSerial = Math.ceil((currentTemplate?.serial_no || 1) / 5) * 5 + 1;
          
          console.log('🚨 Approaching end of current batch:', {
            currentIndex: newIndex,
            totalTemplates: reelsTemplates.length,
            remainingItems: reelsTemplates.length - newIndex - 1,
            currentSerial: currentTemplate?.serial_no,
            nextBatchStartSerial,
            shouldTriggerLoadMore: true,
            threshold: 'Within 2 items of end'
          });
          
          // Check if next batch is already being fetched or exists
          const nextBatchExists = batchImages.some(img => 
            img && img.serial_no >= nextBatchStartSerial && img.serial_no < nextBatchStartSerial + 5
          );
          
          if (!nextBatchExists) {
            console.log('🚀 Auto-triggering next batch fetch:', {
              nextBatchRange: `${nextBatchStartSerial}-${nextBatchStartSerial + 4}`,
              reason: 'Approaching end of current batch'
            });
            
            // Set current serial to trigger the next batch fetch
            setTimeout(() => {
              setCurrentSerial(nextBatchStartSerial);
            }, 100);
          } else {
            console.log('📦 Next batch already cached:', {
              nextBatchRange: `${nextBatchStartSerial}-${nextBatchStartSerial + 4}`,
              action: 'No fetch needed'
            });
          }
        }
      }
      
      setCurrentReelIndex(newIndex);
      
      // Log comprehensive state summary on significant scroll events
      if (Math.abs(newIndex - prevIndex) >= 5 || newIndex === 0 || newIndex >= reelsTemplates.length - 1) {
        console.log('📊 Comprehensive State Summary (Major Scroll Event):', {
          scrollEvent: {
            type: newIndex === 0 ? 'START_OF_LIST' : 
                  newIndex >= reelsTemplates.length - 1 ? 'END_OF_LIST' : 'MAJOR_JUMP',
            previousIndex: prevIndex,
            newIndex: newIndex,
            jumpSize: Math.abs(newIndex - prevIndex)
          },
          templatesState: {
            totalTemplates: reelsTemplates.length,
            currentPage: page,
            batchImagesCount: batchImages.filter(Boolean).length,
            selectedCategory: selectedCategory
          },
          navigationState: {
            currentReelIndex,
            backStackSize: backStack.length,
            canGoBack: backStack.length > 0,
            canGoForward: newIndex < reelsTemplates.length - 1
          },
          systemState: {
            isLoading: isReelsLoading || isHeroLoading,
            timestamp: new Date().toISOString(),
            memoryUsageHint: `~${Math.round(reelsTemplates.length * 0.1)}MB estimated`
          }
        });
      }
      
      console.log('📱 Scroll State Updated:', {
        currentIndex: newIndex,
        backStackSize: backStack.length,
        totalItems: reelsTemplates?.length || 0
      });
    }
  }).current;
  
  // Stable ID for the primary static photo container
  const STATIC_PHOTO_ID = 'static-photo-1';

  // Container dimensions based on selected ratio or image
  const initialAspect = parseRatio(initialParams.ratio);
  const initialDims = computeContainerDims(initialAspect);
  const [containerWidth, setContainerWidth] = useState(initialDims.width);
  const [containerHeight, setContainerHeight] = useState(initialDims.height);
  
// Redux selectors for profile picture
  const profilePicture = useSelector(state => state.profilePicture?.profilePicture);
  const profilePictureUri = useSelector(state => state.profilePicture?.profilePictureUri);
  const isDefaultPicture = useSelector(state => state.profilePicture ? (state.profilePicture.profilePictureUri ? false : true) : true);
  
  // Redux selectors for profile images (for With BG functionality)
  const profileImageProcessed = useSelector(selectProfileImage);
  const profileImageOriginal = useSelector(selectOriginalProfileImage);
  const [photoState, dispatchPhotoState] = useReducer(photoStateReducer, {
    photo1Uri: null,
    photo2Uri: null
  });
  
  // Destructure for easier access - MOVED TO TOP
  const { photo1Uri, photo2Uri } = photoState;
  
  const [shape, setShape] = useState('square');
  const [userName, setUserName] = useState('Your Text');
  const [textElements, setTextElements] = useState([]);
  const lastUserNameRef = useRef('Your Text');
  const profileDisplayName = useSelector(selectProfileDisplayName);
  const [focusedTextId, setFocusedTextId] = useState(null);
  const [showTextCustomization, setShowTextCustomization] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const defaultTextAddedRef = useRef(false);
  
  // Dynamic photo containers state
  const [photoElements, setPhotoElements] = useState([]);
  const [focusedPhotoId, setFocusedPhotoId] = useState(null);
  // Visibility for the primary static photo container
  const [isPhoto1Visible, setIsPhoto1Visible] = useState(true);
  // Focus state for the primary static photo container (controls showing ✕)
  const [isPhoto1Focused, setIsPhoto1Focused] = useState(false);
  
  // Background removal state
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemovalProgress, setBackgroundRemovalProgress] = useState(0);
  const [backgroundRemovalStatus, setBackgroundRemovalStatus] = useState('');
  
  // Store original images before background removal for undo functionality
  const [originalPhoto1Uri, setOriginalPhoto1Uri] = useState(null);
  const [originalPhoto2Uri, setOriginalPhoto2Uri] = useState(null);
  
  // Persistent backup of original images (never cleared for continuous restoration)
  const [persistentOriginalPhoto1Uri, setPersistentOriginalPhoto1Uri] = useState(null);
  const [persistentOriginalPhoto2Uri, setPersistentOriginalPhoto2Uri] = useState(null);
  
  // Simple toggle flag for button states - only one enabled at a time
  const [isBackgroundRemoved, setIsBackgroundRemoved] = useState(false);
  
  // Derived button states from the toggle flag
  const removeBgEnabled = !isBackgroundRemoved;
  const restoreBgEnabled = isBackgroundRemoved;
  
  // Cache for background removed images to avoid reprocessing
  const [cachedBgRemovedPhoto1, setCachedBgRemovedPhoto1] = useState(null);
  const [cachedBgRemovedPhoto2, setCachedBgRemovedPhoto2] = useState(null);
  
  // Track original URIs to detect when new photos are selected
  const [trackedPhoto1Uri, setTrackedPhoto1Uri] = useState(null);
  const [trackedPhoto2Uri, setTrackedPhoto2Uri] = useState(null);
  
  // Photo container size state - simplified
  const [photo1Size, setPhoto1Size] = useState(100); // Default size 100px
  const [photo2Size, setPhoto2Size] = useState(100);
  const minPhotoSize = 60; // Minimum photo container size
  const maxPhotoSize = 200; // Maximum photo container size







  // Text rotation state - store rotation for each text element
  const [textRotations, setTextRotations] = useState({});
  
  // Keyboard visibility state
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Listen for keyboard events
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Video prefetching hook - prefetch videos around current index for smooth scrolling
  React.useEffect(() => {
    if (!reelsTemplates || reelsTemplates.length === 0) return;

    const prefetchVideos = async () => {
      const PREFETCH_RANGE = 4; // Prefetch 4 videos ahead and 4 behind (±4)
      const startIndex = Math.max(0, currentReelIndex - PREFETCH_RANGE);
      const endIndex = Math.min(reelsTemplates.length - 1, currentReelIndex + PREFETCH_RANGE);

      console.log(`🎬 Prefetching videos: range [${startIndex}-${endIndex}], current: ${currentReelIndex}`);

      // Prefetch videos in order of priority (current -> adjacent -> further)
      const prefetchOrder = [];

      // Add current video first
      prefetchOrder.push(currentReelIndex);

      // Add videos in expanding circles around current
      for (let distance = 1; distance <= PREFETCH_RANGE; distance++) {
        if (currentReelIndex + distance <= endIndex) {
          prefetchOrder.push(currentReelIndex + distance);
        }
        if (currentReelIndex - distance >= startIndex) {
          prefetchOrder.push(currentReelIndex - distance);
        }
      }

      // Prefetch each video
      for (const index of prefetchOrder) {
        const item = reelsTemplates[index];
        if (!item) continue;

        const videoUrl = item?.video_url;
        const isVideo = item?.resource_type === 'video' ||
                        (videoUrl && (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.mov') ||
                         videoUrl.endsWith('.avi') || videoUrl.includes('/video/upload/')));

        if (isVideo && videoUrl) {
          // Check if already cached or downloading
          const isCached = await VideoPrefetchManager.isCached(videoUrl, item?.serial_no, index);
          const isDownloading = VideoPrefetchManager.isDownloading(videoUrl);

          if (!isCached && !isDownloading) {
            // Calculate priority: higher for videos closer to current
            const distance = Math.abs(index - currentReelIndex);
            const priority = PREFETCH_RANGE - distance;

            console.log(`📥 Initiating prefetch: index ${index}, serial ${item?.serial_no}, priority ${priority}`);

            // Fire and forget - don't await
            VideoPrefetchManager.prefetchVideo(videoUrl, item?.serial_no, index, priority)
              .catch(error => {
                console.error(`❌ Prefetch failed for index ${index}:`, error.message);
              });
          }
        }
      }
    };

    // Trigger prefetch
    prefetchVideos();
  }, [currentReelIndex, reelsTemplates]);

  // Resolve the user name purely from Redux so it reacts instantly to ProfileScreen updates
  const resolveAndApplyUserName = React.useCallback(() => {
    try {
      const trimmed = (profileDisplayName || '').trim();
      const finalName = trimmed.length > 0 ? trimmed : 'Your Text';
      console.log('🔍 HeroScreen resolveAndApplyUserName -> using name from Redux:', finalName);

      setUserName(finalName);
      lastUserNameRef.current = finalName;

      // Keep the default text element (user name container) in sync as well
      // BUT skip if user has manually edited the text
      setTextElements(prev => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        return prev.map((el, idx) => {
          // Prefer matching the explicit default-text-* id, fall back to first element
          const isDefault = (el.id && el.id.startsWith('default-text-')) || (!el.id && idx === 0);
          // Skip updating if this text has been manually edited by user
          if (isDefault && editedTextIdsRef.current.has(el.id)) {
            console.log('⏭️ Skipping profile name sync for manually edited text:', el.id);
            return el;
          }
          return isDefault ? { ...el, text: finalName } : el;
        });
      });
    } catch (e) {
      console.warn('❌ Failed to resolve user name from Redux:', e);
    }
  }, [profileDisplayName, setTextElements]);

  // Load user name initially
  React.useEffect(() => {
    resolveAndApplyUserName();
  }, [resolveAndApplyUserName]);

  // Refresh user name whenever HeroScreen gains focus (e.g., after returning from Profile)
  useFocusEffect(
    React.useCallback(() => {
      resolveAndApplyUserName();
      return () => {};
    }, [resolveAndApplyUserName])
  );

  // Whenever Redux displayName changes, immediately update userName and the default text element
  React.useEffect(() => {
    console.log('🔔 HeroScreen profileDisplayName changed:', profileDisplayName);
    resolveAndApplyUserName();
  }, [profileDisplayName, resolveAndApplyUserName]);
  
  // Force container to always use 9:16 aspect ratio
  React.useEffect(() => {
    try {
      // Always use 9:16 aspect ratio regardless of route params or image dimensions
      const aspect = 9 / 16;
      const dims = computeContainerDims(aspect);
      setContainerWidth(dims.width);
      setContainerHeight(dims.height);
    } catch (e) {
    }
  }, []); // Run only once on mount, no dependencies
  
// Load template preferences (religion + subcategory) and hydrate global slice
  React.useEffect(() => {
    if (localMode) return;
    let cancelled = false;
    (async () => {
      try {
        // Hydrate slice from storage first
        try { dispatch(loadMainSubFromStorage()); } catch {}

        const [r, s] = await Promise.all([
          TemplatePreferences.getReligion(),
          TemplatePreferences.getSubcategory(),
        ]);
        if (!cancelled) {
          if (r) {
            // Maintain local array state for existing logic while syncing global slice
            setSelectedReligions(Array.isArray(r) ? r : [r]);
            dispatch(setGlobalReligion(r));
          }
          if (s) {
            setSelectedCategory(s);
            dispatch(setGlobalSub(s));
          }
          try { dispatch(saveMainSubToStorage()); } catch {}
        }
      } catch (e) {
      }
    })();
    return () => { cancelled = true; };
  }, [dispatch]);

// Fetch latest template image and set it as background template
  React.useEffect(() => {
    if (localMode) return;
    let cancelled = false;
    (async () => {
      try {
        const latest = await ImageMetadataService.getLatestImage({});
        if (cancelled || !latest) return;
        const url = latest.image_url || latest.url || latest.secure_url;
        if (url) {
          setTemplateImage({ uri: url });
          // Optionally set default positions for photo/text in future
        }
      } catch (e) {
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Initialize single photo container with profile photo
  React.useEffect(() => {
    // Always update photo1 when profile picture changes in Redux
    // This ensures the default photo container stays in sync with ProfileScreen changes
    
    // Set the single photo container to use the user's profile photo if available
    if (profilePictureUri) {
      dispatchPhotoState({ type: 'SET_PHOTO_1', uri: profilePictureUri });
    } else if (profileImageProcessed) {
      const imageUri = typeof profileImageProcessed === 'string' ? profileImageProcessed : profileImageProcessed.uri;
      dispatchPhotoState({ type: 'SET_PHOTO_1', uri: imageUri });
    } else {
      dispatchPhotoState({ type: 'SET_PHOTO_1', uri: 'default_profile_image' });
    }
    
    // Clear the second container (not needed anymore)
    dispatchPhotoState({ type: 'CLEAR_PHOTO_2' });
    
  }, [profilePictureUri, profileImageProcessed]); // React to profile picture changes only

  // Simple logging for photo size changes
  React.useEffect(() => {
  }, [photo1Size]);

  
  // Debug text elements state
  React.useEffect(() => {
  }, [textElements]);
  
  // Debug profile image state changes
  React.useEffect(() => {
  }, [profilePictureUri, profileImageProcessed, profileImageOriginal, isDefaultPicture, originalPhoto1Uri, persistentOriginalPhoto1Uri]);
  
  // Integrate BackgroundToggleService with local state
  React.useEffect(() => {
    
    // Listen to BackgroundToggleService state changes
    const unsubscribe = BackgroundToggleService.addListener((newState) => {
      setIsBackgroundRemoved(newState.isBackgroundRemoved);
      
      // Force log the resulting button states
      setTimeout(() => {
      }, 100);
    });
    
    // Initialize local state from service
    const currentServiceState = BackgroundToggleService.getCurrentState();
    setIsBackgroundRemoved(currentServiceState.isBackgroundRemoved);
    
    return unsubscribe;
  }, []);
  
  // Legacy functions that now use the service (for compatibility)
  const enableRemoveBg = () => {
    const result = BackgroundToggleService.enableRemoveBackground();
  };
  
  const enableRestoreBg = () => {
    const result = BackgroundToggleService.enableRestoreBackground();
  };
  
  // Initialize button state based on photos - removed to prevent conflicts with BackgroundToggleService
  // The service will manage button states automatically
  
  // Debug: Monitor button state changes
  React.useEffect(() => {
    
    // Also log the service state for comparison
    const serviceState = BackgroundToggleService.getCurrentState();
    
    if (serviceState.isBackgroundRemoved !== isBackgroundRemoved) {
    }
  }, [photo1Uri, photo2Uri, isBackgroundRemoved, removeBgEnabled, restoreBgEnabled]);
  
  // Destructuring moved to top for proper access in functions
  
  // Serial navigation state
  const [currentSerial, setCurrentSerial] = useState(1);
  const [isSerialLoading, setIsSerialLoading] = useState(false);
  const [totalSerials, setTotalSerials] = useState(1);
  const [categorySerials, setCategorySerials] = useState([]);
  // Batch images array where index = serial_no - 1
  const [batchImages, setBatchImages] = useState([]);
  // Track which batches are currently being fetched to prevent duplicates
  const fetchingBatches = useRef(new Set());

  // Fetch a template document by category and serial number (no pagination; load all then pick by serial)
  const fetchDocBySerial = React.useCallback(async (category, serialNo) => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const allowProd = (AppConfig?.DEVELOPMENT?.USE_PRODUCTION_FALLBACK === true) || (typeof __DEV__ !== 'boolean' || __DEV__ === false);
    const candidates = uniq([
      AppConfig?.DEVELOPMENT?.DEV_SERVER_URL,
      'http://10.0.2.2:10000',
      'http://127.0.0.1:10000',
      'http://localhost:10000',
      allowProd ? AppConfig?.PRODUCTION_SERVER_URL : null,
    ]).map(u => u && u.replace(/\/$/, ''));

    // Preferred: fetch all templates for category without limit and select by serial
    for (const baseURL of candidates) {
      // Try new API with religion + subcategory first
      const rels = Array.isArray(selectedReligions) ? selectedReligions : [selectedReligions];
      const hasAll = rels.map(r => String(r).toLowerCase()).includes('all');
      const relParam = hasAll ? null : rels.join(',');
      let url = `${baseURL}/api/templates?${relParam ? `religion=${encodeURIComponent(relParam)}&` : ''}subcategory=${encodeURIComponent(category)}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(url, { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-store' } });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const json = await resp.json();
          const list = json?.data?.templates || [];
          const found = list.find(t => Number(t?.serial_no) === Number(serialNo));
          if (found) return found;
          // Fallback: choose the first or the lowest serial_no if no exact match
          if (list.length > 0) {
            const sorted = list.slice().sort((a, b) => Number(a?.serial_no || 0) - Number(b?.serial_no || 0));
            return sorted[0];
          }
        }
        // Fallback older API: category only
        url = `${baseURL}/api/templates?category=${encodeURIComponent(category)}`;
        const resp2 = await fetch(url, { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-store' } });
        if (resp2.ok) {
          const json2 = await resp2.json();
          const list2 = json2?.data?.templates || [];
          const found2 = list2.find(t => Number(t?.serial_no) === Number(serialNo));
          if (found2) return found2;
          if (list2.length > 0) {
            const sorted2 = list2.slice().sort((a, b) => Number(a?.serial_no || 0) - Number(b?.serial_no || 0));
            return sorted2[0];
          }
        }
      } catch (e) {
        // try next candidate
      }
    }

    // Fallback: try the old by-serial endpoint if available
    for (const baseURL of candidates) {
      const bySerialUrl = `${baseURL}/api/templates/by-serial/${encodeURIComponent(category)}/${encodeURIComponent(serialNo)}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const resp = await fetch(bySerialUrl, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const json = await resp.json();
          const doc = json?.data || null;
          if (doc) return doc;
        }
      } catch (_) {}
    }

    return null;
  }, [getTemplateUri, selectedReligions]);

  // Fetch all templates for a category (no limit); return list for serial navigation
  const fetchCategoryTemplatesList = React.useCallback(async (category) => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const allowProd = (AppConfig?.DEVELOPMENT?.USE_PRODUCTION_FALLBACK === true) || (typeof __DEV__ !== 'boolean' || __DEV__ === false);
    const candidates = uniq([
      AppConfig?.DEVELOPMENT?.DEV_SERVER_URL,
      'http://10.0.2.2:10000',
      'http://127.0.0.1:10000',
      'http://localhost:10000',
      allowProd ? AppConfig?.PRODUCTION_SERVER_URL : null,
    ]).map(u => u && u.replace(/\/$/, ''));

    for (const baseURL of candidates) {
      // Try new API with religion + subcategory first
      const rels = Array.isArray(selectedReligions) ? selectedReligions : [selectedReligions];
      const hasAll = rels.map(r => String(r).toLowerCase()).includes('all');
      const relParam = hasAll ? null : rels.join(',');
      let url = `${baseURL}/api/templates?${relParam ? `religion=${encodeURIComponent(relParam)}&` : ''}subcategory=${encodeURIComponent(category)}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(url, { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-store' } });
        clearTimeout(timeoutId);
        if (!resp.ok) continue;
        const json = await resp.json();
        const list = Array.isArray(json?.data?.templates) ? json.data.templates : [];
        return list;
      } catch (_) {
        // Fallback older API: category only
        try {
          url = `${baseURL}/api/templates?category=${encodeURIComponent(category)}`;
          const resp2 = await fetch(url, { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-store' } });
          if (!resp2.ok) continue;
          const json2 = await resp2.json();
          const list2 = Array.isArray(json2?.data?.templates) ? json2.data.templates : [];
          return list2;
        } catch (__) {}
      }
    }
    return [];
  }, [selectedReligions]);

  const applyDocToTemplate = React.useCallback((doc, fallbackSerial = null) => {
    if (!doc) return false;
    try {
      // Check if this is a video template
      const isVideo = doc?.resource_type === 'video' || !!doc?.video_url;
      
      // For videos, use video_url; for images, use image_url
      const mediaUrl = isVideo ? (doc?.video_url || doc?.image_url) : doc?.image_url;
      const resolved = getTemplateUri(doc) || getTemplateUri({ image_url: mediaUrl }) || mediaUrl;
      
      if (resolved || mediaUrl) {
        // Create normalized template object with all video/image fields preserved
        const normalizedDoc = {
          ...doc,
          image_url: doc?.image_url,
          video_url: doc?.video_url,
          resource_type: doc?.resource_type || (isVideo ? 'video' : 'image'),
          secure_url: doc?.secure_url || resolved || mediaUrl,
          url: doc?.url || resolved || mediaUrl
        };
        
        // Set template image (for static display)
        setTemplateImage({ uri: resolved || mediaUrl });
        
        // Pass normalized doc to reels templates array (preserves video_url)
        setReelsTemplates([normalizedDoc]);
        setCurrentSerial(Number(doc?.serial_no || fallbackSerial || 1));
        

        // Apply saved photo container axis from MongoDB, if present
        // Coordinates are scaled from reference canvas to actual container size
        // If coordinate_reference exists, scale from that reference
        // If not (old templates), use coordinates as-is (they were saved at similar device resolution)
        try {
          const axis = doc?.photo_container_axis || doc?.photoAxis || doc?.photo_position;
          const coordRef = doc?.coordinate_reference;
          const hasReference = coordRef && Number(coordRef?.width) > 0 && Number(coordRef?.height) > 0;

          // Default reference dimensions (9:16 aspect ratio matching website editor)
          const refW = hasReference ? Number(coordRef.width) : containerWidth;
          const refH = hasReference ? Number(coordRef.height) : containerHeight;

          // Scale factor from reference to actual container
          // If no reference (old template), scale factor is 1 (no scaling)
          const scaleX = containerWidth / refW;
          const scaleY = containerHeight / refH;

          const rawX = Number(axis?.x);
          const rawY = Number(axis?.y);
          const currentSerial = doc?.serial_no;

          if (Number.isFinite(rawX) && Number.isFinite(rawY)) {
            // Scale coordinates from reference canvas to actual container
            const scaledX = Math.round(rawX * scaleX);
            const scaledY = Math.round(rawY * scaleY);

            const padding = 10;
            const maxX = Math.max(padding, containerWidth - photo1Size - padding);
            const maxY = Math.max(padding, containerHeight - photo1Size - padding);
            const clampedX = Math.max(padding, Math.min(maxX, scaledX));
            const clampedY = Math.max(padding, Math.min(maxY, scaledY));

            // Apply axis only if switching to a different template (different serial number)
            const isDifferentTemplate = lastAppliedPhotoAxisSerial.current !== currentSerial;

            if (isDifferentTemplate) {
              try {
                if (pan1X && typeof pan1X.value !== 'undefined') pan1X.value = clampedX;
                if (pan1Y && typeof pan1Y.value !== 'undefined') pan1Y.value = clampedY;
                lastAppliedPhotoAxisSerial.current = currentSerial;
                // Reset the manual movement flag for this new template
                hasUserMovedStaticPhotoRef.current = false;
                console.log('📍 Applied photo axis from template schema:', {
                  raw: { x: rawX, y: rawY },
                  scaled: { x: scaledX, y: scaledY },
                  clamped: { x: clampedX, y: clampedY },
                  scale: { x: scaleX.toFixed(2), y: scaleY.toFixed(2) },
                  ref: { w: refW, h: refH },
                  container: { w: containerWidth, h: containerHeight },
                  serial: currentSerial
                });
              } catch (e) {
                console.error('❌ Error setting photo position:', e);
              }
            } else {
              console.log('🔒 Same template - keeping user-adjusted photo position:', { serial: currentSerial });
            }
          }
        } catch (e) {
          console.error('❌ Error processing photo position:', e);
        }

        // Apply saved text container axis if present (position the default/first text)
        // Coordinates are scaled from reference canvas to actual container size
        // If coordinate_reference exists, scale from that reference
        // If not (old templates), use coordinates as-is (they were saved at similar device resolution)
        try {
          const tAxis = doc?.text_container_axis || doc?.textAxis || doc?.text_position || doc?.text_axis;
          const coordRef = doc?.coordinate_reference;
          const hasReference = coordRef && Number(coordRef?.width) > 0 && Number(coordRef?.height) > 0;

          // Default reference dimensions (9:16 aspect ratio matching website editor)
          const refW = hasReference ? Number(coordRef.width) : containerWidth;
          const refH = hasReference ? Number(coordRef.height) : containerHeight;

          // Scale factor from reference to actual container
          // If no reference (old template), scale factor is 1 (no scaling)
          const scaleX = containerWidth / refW;
          const scaleY = containerHeight / refH;

          const tRawX = Number(tAxis?.x);
          const tRawY = Number(tAxis?.y);
          const tRawW = Number(tAxis?.width);
          const tRawH = Number(tAxis?.height);
          const currentSerial = doc?.serial_no;

          if (Number.isFinite(tRawX) && Number.isFinite(tRawY)) {
            // Scale coordinates from reference canvas to actual container
            const scaledX = Math.round(tRawX * scaleX);
            const scaledY = Math.round(tRawY * scaleY);

            const padding = 10;
            // Use existing first text element size if available, else scale from reference
            const first = Array.isArray(textElements) && textElements.length > 0 ? textElements[0] : null;
            const tWidth = Number.isFinite(tRawW) ? Math.round(tRawW * scaleX) : (Number(first?.width) || 160);
            const tHeight = Number.isFinite(tRawH) ? Math.round(tRawH * scaleY) : (Number(first?.height) || 42);
            const tMaxX = Math.max(padding, containerWidth - tWidth - padding);
            const tMaxY = Math.max(padding, containerHeight - tHeight - padding);
            const tX = Math.max(padding, Math.min(tMaxX, scaledX));
            const tY = Math.max(padding, Math.min(tMaxY, scaledY));

            // Apply axis only if switching to a different template (different serial number)
            const isDifferentTemplate = lastAppliedTextAxisSerial.current !== currentSerial;

            if (isDifferentTemplate) {
              setTextElements(prev => {
                // Clear the moved and edited text IDs tracking for the new template
                movedTextIdsRef.current.clear();
                editedTextIdsRef.current.clear();

                if (!Array.isArray(prev) || prev.length === 0) {
                  // No text exists - create default at backend position
                  // Use Redux name if available, else userName state, else default
                  const displayName = (profileDisplayName && profileDisplayName.trim()) || userName || 'Your Text';
                  const newEl = {
                    id: `default-text-${Date.now()}`,
                    text: displayName,
                    x: tX,
                    y: tY,
                    width: tWidth,
                    height: tHeight,
                    color: COLORS.primary,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)'
                  };
                  try { if (defaultTextAddedRef && defaultTextAddedRef.current !== undefined) defaultTextAddedRef.current = true; } catch {}
                  lastAppliedTextAxisSerial.current = currentSerial;
                  console.log('📍 Created text at template axis:', {
                    raw: { x: tRawX, y: tRawY },
                    scaled: { x: scaledX, y: scaledY },
                    final: { x: tX, y: tY, w: tWidth, h: tHeight },
                    scale: { x: scaleX.toFixed(2), y: scaleY.toFixed(2) },
                    serial: currentSerial,
                    text: displayName
                  });
                  return [newEl];
                } else {
                  // Text exists - update FIRST text element to new template's axis
                  lastAppliedTextAxisSerial.current = currentSerial;
                  console.log('📍 Applied text axis from template schema:', {
                    raw: { x: tRawX, y: tRawY },
                    scaled: { x: scaledX, y: scaledY },
                    final: { x: tX, y: tY, w: tWidth, h: tHeight },
                    scale: { x: scaleX.toFixed(2), y: scaleY.toFixed(2) },
                    serial: currentSerial
                  });
                  return prev.map((el, idx) =>
                    idx === 0 ? { ...el, x: tX, y: tY, width: tWidth, height: tHeight } : el
                  );
                }
              });
            } else {
              console.log('🔒 Same template - keeping user-adjusted text position:', { serial: currentSerial });
            }
          }
        } catch (e) {
          console.error('❌ Error applying text position:', e);
        }

        return true;
      }
    } catch (e) {
      console.error('❌ Error in applyDocToTemplate:', e);
    }
    return false;
  }, [getTemplateUri, setTemplateImage, setReelsTemplates, containerWidth, containerHeight, photo1Size, pan1X, pan1Y, textElements, setTextElements, userName, profileDisplayName]);

  // const CATEGORY_KEY = 'congratulations'; // replaced by selectedCategory state

  const handleSerialUp = React.useCallback(() => {
    const serials = Array.isArray(categorySerials) ? categorySerials : [];
    if (!serials.length) return;
    const idx = Math.max(0, serials.findIndex(s => Number(s) === Number(currentSerial)));
    const nextIdx = (idx + 1) % serials.length;
    setCurrentSerial(serials[nextIdx]);
  }, [categorySerials, currentSerial]);

  const handleSerialDown = React.useCallback(() => {
    const serials = Array.isArray(categorySerials) ? categorySerials : [];
    if (!serials.length) return;
    const idx = Math.max(0, serials.findIndex(s => Number(s) === Number(currentSerial)));
    const prevIdx = (idx - 1 + serials.length) % serials.length;
    setCurrentSerial(serials[prevIdx]);
  }, [categorySerials, currentSerial]);

  // Swipe handlers (up = next, down = previous)
  const onSwipeUp = React.useCallback(() => {
    handleSerialUp();
  }, [handleSerialUp]);

  const onSwipeDown = React.useCallback(() => {
    handleSerialDown();
  }, [handleSerialDown]);


// Load categories from local storage, then fetch from server for new subcategories
  React.useEffect(() => {
    try {
      dispatch(loadCategories());
      // After loading local, fetch from server to get any new categories (force refresh)
      dispatch(fetchCategoriesFromServer(true));
    } catch {}
  }, [dispatch]);

React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const category = selectedCategory || 'congratulations';
        const list = await fetchCategoryTemplatesList(category);
        if (cancelled) return;
        // Build sorted, unique serial list
        const serials = Array.from(new Set((list || [])
          .map(t => Number(t?.serial_no))
          .filter(n => Number.isFinite(n))))
          .sort((a, b) => a - b);
        setCategorySerials(serials);
        setTotalSerials(Math.max(1, serials.length || 1));
        // Initialize current serial to the first available
        if (serials.length) {
          setCurrentSerial(serials[0]);
        } else {
          setCurrentSerial(1);
        }
      } catch (err) {
      }
    })();

    return () => { cancelled = true; };
  }, [fetchCategoryTemplatesList, selectedCategory]);

// Fetch template whenever currentSerial or selected category changes
React.useEffect(() => {
  if (localMode) return;
  let canceled = false;
  const load = async () => {
    setIsSerialLoading(true);
    try {
      const category = selectedCategory || 'congratulations';
      const doc = await fetchDocBySerial(category, currentSerial);
      if (!canceled && doc) {
        applyDocToTemplate(doc, currentSerial);
      } else if (!canceled) {
      }
    } catch (err) {
    } finally {
      setIsSerialLoading(false);
    }
  };
  if (currentSerial && selectedCategory) {
    load();
  } else {
  }
  return () => { canceled = true; };
}, [currentSerial, selectedCategory, fetchDocBySerial, applyDocToTemplate]);

// Fetch batches of 5 images in order using (category, subcategory, image_url, serial_no)
React.useEffect(() => {
  if (localMode) return;
  let canceled = false;
  (async () => {
    try {
      if (!selectedCategory || !currentSerial) {
        console.log('📦 Batch Fetch: Skipping - missing category or serial:', { selectedCategory, currentSerial });
        return;
      }
      
      const category = selectedCategory;
      const windowSize = 5;
      const startSerial = Math.floor((Number(currentSerial) - 1) / windowSize) * windowSize + 1;
      const endSerial = startSerial + windowSize - 1;
      
      // Check if we already have this batch cached
      const arr = Array.isArray(batchImages) ? batchImages.slice() : [];
      const batchExists = [];
      let needsFetch = false;
      
      // Track which items exist and which are missing
      for (let serial = startSerial; serial <= endSerial; serial++) {
        const idx = serial - 1;
        const exists = arr[idx] && arr[idx].serial_no === serial;
        const isEndOfData = arr[idx] === null; // Explicitly marked as end of data
        batchExists.push({ serial, idx, exists, isEndOfData });
        if (!exists && !isEndOfData) {
          needsFetch = true;
        }
      }
      
      console.log('📦 Batch availability check:', {
        category,
        currentSerial,
        windowSize,
        startSerial,
        endSerial,
        batchWindow: `${startSerial}-${endSerial}`,
        needsFetch,
        cachedItems: batchExists.filter(b => b.exists).length,
        missingItems: batchExists.filter(b => !b.exists && !b.isEndOfData).length,
        endOfDataItems: batchExists.filter(b => b.isEndOfData).length,
        availability: batchExists
      });
      
      // Check if this batch is already being fetched
      const batchKey = `${startSerial}-${endSerial}`;
      if (fetchingBatches.current.has(batchKey)) {
        console.log('📦 🔄 Batch already being fetched - skipping:', {
          batchWindow: batchKey,
          reason: 'Duplicate request prevention'
        });
        return;
      }
      
      if (!needsFetch) {
        console.log('📦 ✨ Batch already cached - skipping fetch:', {
          batchWindow: `${startSerial}-${endSerial}`,
          allItemsCached: true,
          timestamp: new Date().toISOString()
        });
        
        // Update the current template from cache
        const currentIdx = currentSerial - 1;
        if (arr[currentIdx]) {
          const cachedTemplate = arr[currentIdx];
          const isVideo = cachedTemplate.resource_type === 'video' || !!cachedTemplate.video_url;
          const displayUrl = isVideo ? (cachedTemplate.video_url || cachedTemplate.image_url) : cachedTemplate.image_url;
          
          console.log('📦 Using cached template for serial:', {
            serial: currentSerial,
            isVideo,
            displayUrl: displayUrl?.substring(0, 60)
          });
          
          setTemplateImage({ uri: displayUrl });
        }
        return;
      }
      
      // Mark this batch as being fetched
      fetchingBatches.current.add(batchKey);
      
      console.log('📦 Starting batch fetch (missing items detected):', {
        category,
        currentSerial,
        windowSize,
        startSerial,
        endSerial,
        batchWindow: `${startSerial}-${endSerial}`,
        missingSerials: batchExists.filter(b => !b.exists && !b.isEndOfData).map(b => b.serial),
        activeFetches: Array.from(fetchingBatches.current),
        timestamp: new Date().toISOString()
      });

      // Respect selected religions if present (omit when "all")
      const rels = Array.isArray(selectedReligions) ? selectedReligions : [selectedReligions].filter(Boolean);
      const hasAll = rels.map(r => String(r || '').toLowerCase()).includes('all');
      const main = hasAll ? undefined : (rels.length ? rels.join(',') : undefined);
      
      console.log('📦 Batch fetch parameters:', {
        religion: main || 'all',
        subcategory: category,
        start_serial: startSerial,
        limit: windowSize,
        order: 'asc',
        reason: 'Missing items in cache'
      });

      const fetchStartTime = performance.now();
      
      try {
        const items = await TemplateService.fetchBatch({ 
          subcategory: category, 
          main, 
          start_serial: startSerial, 
          limit: windowSize, 
          order: 'asc' 
        });
        const fetchEndTime = performance.now();
        
        if (canceled) {
          console.log('📦 Batch fetch canceled');
          fetchingBatches.current.delete(batchKey);
          return;
        }
      
      console.log('\n' + '✅'.repeat(40));
      console.log('📦 BATCH FETCH COMPLETED');
      console.log('✅'.repeat(40));
      console.log('📦 Batch fetch completed:', {
        requestedCount: windowSize,
        receivedCount: items.length,
        fetchTime: `${(fetchEndTime - fetchStartTime).toFixed(2)}ms`,
        success: true,
        serialsReceived: items.map(item => item.serial_no).sort((a, b) => a - b),
        isPartialBatch: items.length < windowSize
      });
      
      // Log video detection for each item
      console.log('\n🎥 VIDEO DETECTION IN BATCH:');
      items.forEach((item, idx) => {
        const hasVideoUrl = !!item.video_url;
        const hasImageUrl = !!item.image_url;
        const resourceType = item.resource_type;
        const isVideo = resourceType === 'video' || hasVideoUrl;
        
        console.log(`  [${idx}] Serial ${item.serial_no}:`, {
          type: isVideo ? '🎥 VIDEO' : '🖼️ IMAGE',
          hasVideoUrl,
          hasImageUrl,
          resourceType,
          videoUrl: item.video_url ? item.video_url.substring(0, 60) + '...' : 'N/A',
          imageUrl: item.image_url ? item.image_url.substring(0, 60) + '...' : 'N/A'
        });
      });
      console.log('✅'.repeat(40) + '\n');

      const beforeCount = arr.filter(Boolean).length;
      const logs = [];
      let newItemsAdded = 0;
      
      // Process received items
      for (const it of items) {
        const idx = Math.max(0, Number(it.serial_no) - 1);
        const wasEmpty = !arr[idx];
        if (wasEmpty) newItemsAdded++;
        arr[idx] = it;
        logs.push({ 
          serial_no: it.serial_no, 
          arrayIndex: idx,
          image_url: it.image_url?.substring(0, 50) + '...',
          isNewEntry: wasEmpty,
          action: wasEmpty ? 'added' : 'updated'
        });
      }
      
      // Mark missing items as end of data if we received fewer items than requested
      if (items.length < windowSize) {
        const receivedSerials = new Set(items.map(item => item.serial_no));
        let markedEndOfData = 0;
        
        for (let serial = startSerial; serial <= endSerial; serial++) {
          if (!receivedSerials.has(serial)) {
            const idx = serial - 1;
            if (!arr[idx]) { // Only mark if not already occupied
              arr[idx] = null; // Mark as end of data
              markedEndOfData++;
              logs.push({
                serial_no: serial,
                arrayIndex: idx,
                image_url: 'END_OF_DATA',
                isNewEntry: true,
                action: 'marked_end'
              });
            }
          }
        }
        
        console.log('📚 End of data detected:', {
          requestedWindow: `${startSerial}-${endSerial}`,
          receivedCount: items.length,
          requestedCount: windowSize,
          markedEndOfData,
          reason: 'API returned fewer items than requested'
        });
      }
      
      setBatchImages(arr);
      const afterCount = arr.filter(Boolean).length;
      
      console.log('📦 Batch images array updated:', {
        beforeCount,
        afterCount,
        newItemsAdded,
        totalArraySize: arr.length,
        itemDetails: logs,
        cacheEfficiency: `${((beforeCount / (beforeCount + newItemsAdded)) * 100).toFixed(1)}% cached`
      });
      
      console.log('📦 Individual batch items:');
      logs.forEach((x, i) => {
        const icon = x.action === 'marked_end' ? '🚫' : '📷';
        const status = x.action === 'marked_end' ? 'END_OF_DATA' : x.action;
        console.log(`  ${icon} #${i + 1}: serial=${x.serial_no} | idx=${x.arrayIndex} | ${status} | url=${x.image_url}`);
      });
      
      // Update current template from fetched/cached data
      const currentIdx = currentSerial - 1;
      if (arr[currentIdx]) {
        const currentTemplate = arr[currentIdx];
        const isVideo = currentTemplate.resource_type === 'video' || !!currentTemplate.video_url;
        const displayUrl = isVideo ? (currentTemplate.video_url || currentTemplate.image_url) : currentTemplate.image_url;
        
        console.log('📦 Setting template for current serial:', {
          serial: currentSerial,
          isVideo,
          displayUrl: displayUrl?.substring(0, 60)
        });
        
        setTemplateImage({ uri: displayUrl });
      }
      
      // Update reelsTemplates with available batch images for scrolling
      const availableTemplates = arr.filter(Boolean).sort((a, b) => a.serial_no - b.serial_no);
      if (availableTemplates.length > 0) {
        console.log('📦 Updating reelsTemplates from batch cache:', {
          availableCount: availableTemplates.length,
          serialRange: `${availableTemplates[0].serial_no}-${availableTemplates[availableTemplates.length - 1].serial_no}`,
          currentReelsCount: reelsTemplates.length
        });
        
        // Only update if we have more templates than currently in reelsTemplates
        if (availableTemplates.length > reelsTemplates.length) {
          setReelsTemplates(availableTemplates);
          console.log('📦 reelsTemplates updated with', availableTemplates.length, 'items');
        }
      }
      
      } catch (e) {
        console.error('📦 Batch fetch failed:', {
          error: e.message,
          category: selectedCategory,
          currentSerial,
          batchWindow: batchKey,
          timestamp: new Date().toISOString()
        });
      } finally {
        // Always remove from fetching set when done
        fetchingBatches.current.delete(batchKey);
      }
      
    } catch (e) {
      console.error('📦 Batch fetch setup failed:', {
        error: e.message,
        category: selectedCategory,
        currentSerial,
        timestamp: new Date().toISOString()
      });
    }
  })();
  return () => { 
    canceled = true;
    // Clean up any pending fetches for this effect
    fetchingBatches.current.clear();
  };
}, [selectedCategory, currentSerial]);

// Sync reelsTemplates with batchImages cache for smooth scrolling
React.useEffect(() => {
  const availableTemplates = batchImages.filter(Boolean).sort((a, b) => a.serial_no - b.serial_no);
  
  if (availableTemplates.length > 0) {
    console.log('🌊 Syncing reelsTemplates with batchImages cache:', {
      batchImagesCount: availableTemplates.length,
      currentReelsCount: reelsTemplates.length,
      serialRange: availableTemplates.length > 0 ? 
        `${availableTemplates[0].serial_no}-${availableTemplates[availableTemplates.length - 1].serial_no}` : 'empty',
      shouldUpdate: availableTemplates.length !== reelsTemplates.length
    });
    
    // Update reelsTemplates if the count or content has changed
    const currentSerials = new Set(reelsTemplates.map(t => t.serial_no));
    const availableSerials = new Set(availableTemplates.map(t => t.serial_no));
    const setsEqual = currentSerials.size === availableSerials.size && 
      [...currentSerials].every(s => availableSerials.has(s));
    
    if (!setsEqual) {
      setReelsTemplates(availableTemplates);
      console.log('🌊 Updated reelsTemplates from batchImages:', {
        newCount: availableTemplates.length,
        serials: availableTemplates.map(t => t.serial_no)
      });
    }
  }
}, [batchImages]);

// Keep currentSerial aligned to valid serials if list changes
React.useEffect(() => {
  if (!categorySerials || categorySerials.length === 0) return;
  if (!categorySerials.includes(Number(currentSerial))) {
    setCurrentSerial(categorySerials[0]);
  }
}, [categorySerials]);

// Fallback: when a template image URI is set directly (e.g., from grid), try to fetch its doc by URL and apply axis
const [appliedAxisForUri, setAppliedAxisForUri] = useState(null);
React.useEffect(() => {
  const uri = templateImage && (templateImage.uri || templateImage.url || templateImage.secure_url);
  if (!uri || typeof uri !== 'string') return;
  if (appliedAxisForUri === uri) return;
  if (!selectedCategory) return;

  let canceled = false;
  (async () => {
    try {
      // Page through docs in the default CATEGORY_KEY to find a matching image_url
      const limit = 100;
      const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
      const allowProd = (AppConfig?.DEVELOPMENT?.USE_PRODUCTION_FALLBACK === true) || (typeof __DEV__ !== 'boolean' || __DEV__ === false);
      const candidates = uniq([
        AppConfig?.DEVELOPMENT?.DEV_SERVER_URL,
        'http://10.0.2.2:10000',
        'http://127.0.0.1:10000',
        'http://localhost:10000',
        allowProd ? AppConfig?.PRODUCTION_SERVER_URL : null,
      ]).map(u => u && u.replace(/\/$/, ''));

      for (const baseURL of candidates) {
        let pageNum = 1;
        // Avoid infinite loops by capping pages
        for (let i = 0; i < 10; i++) {
          const url = `${baseURL}/api/templates?category=${encodeURIComponent(selectedCategory)}&limit=${limit}&page=${pageNum}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);
          try {
            const resp = await fetch(url, { method: 'GET', signal: controller.signal });
            clearTimeout(timeoutId);
            if (!resp.ok) break;
            const json = await resp.json();
            const list = json?.data?.templates || [];
            const found = list.find(t => (t?.image_url && typeof t.image_url === 'string' && t.image_url.replace(/\u200B/g, '').trim() === uri.replace(/\u200B/g, '').trim()));
            if (found) {
              if (!canceled) {
                applyDocToTemplate(found, found?.serial_no);
                setAppliedAxisForUri(uri);
              }
              return;
            }
            const total = json?.data?.pagination?.total || 0;
            const pages = json?.data?.pagination?.pages || Math.ceil(total / limit) || 1;
            pageNum += 1;
            if (pageNum > pages) break;
          } catch (_) {
            clearTimeout(timeoutId);
            break;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  })();

  return () => { canceled = true; };
}, [templateImage, selectedCategory, applyDocToTemplate, appliedAxisForUri]);

// Component lifecycle tracking
  React.useEffect(() => {

    // Listen for crop results from the global manager
    const mySourceType = localMode ? 'localMode' : 'normal';
    console.log('📷 HeroScreen: Setting up photo crop listener for sourceType:', mySourceType);
    const unsubscribeCropResults = cropResultManager.addListener((cropResult) => {
      try {
        const { croppedUri, photoNumber, photoId, isDynamicPhoto, sourceScreen } = cropResult || {};
        // Skip banner events - they are handled by a separate listener
        if (photoNumber === 'banner') {
          return;
        }

        // Filter by sourceScreen to ensure only the correct HeroScreen instance handles the event
        console.log('📷 HeroScreen: Received photo crop event:', {
          sourceScreen,
          mySourceType,
          match: sourceScreen === mySourceType || !sourceScreen,
          photoId
        });

        // If sourceScreen is set, only the matching HeroScreen type should handle it
        if (sourceScreen && sourceScreen !== mySourceType) {
          console.log('🚫 HeroScreen: Ignoring photo crop - source mismatch', { sourceScreen, mySourceType });
          return;
        }

        console.log('✅ HeroScreen: Processing photo crop for this instance');
        // Prefer explicit photoId targeting if present
        if (photoId) {
          handleCropComplete({ croppedUri, photoId, isDynamicPhoto });
        } else if (isDynamicPhoto && photoId) {
          handleCropComplete(croppedUri, null, photoId, true);
        } else if (photoNumber) {
          handleCropComplete(croppedUri, photoNumber);
        } else {
          handleCropComplete(croppedUri, 1);
        }
      } catch (e) {
      }
    });
    
    // Check for crop results when screen comes into focus
    const unsubscribeFocus = navigation.addListener('focus', () => {
      // Check if we're returning from Crop screen with results
      const p = route.params || {};
      // IMPORTANT: Only treat explicit crop-related params as incoming cropped results.
      // Do NOT treat template "image" or "imageUri" as a cropped photo, to avoid overriding Photo 1.
      const incomingCroppedUri = p.croppedUri 
        || p.resultUri 
        || p.croppedImageUri 
        || (p.croppedImage && p.croppedImage.uri);

      if (incomingCroppedUri) {
        const { photoNumber, photoId, isDynamicPhoto } = p;
        
        // Prefer explicit photoId targeting if present
        if (photoId) {
          handleCropComplete({ croppedUri: incomingCroppedUri, photoId, isDynamicPhoto });
        } else if (isDynamicPhoto && photoId) {
          handleCropComplete(incomingCroppedUri, null, photoId, true);
        } else if (photoNumber) {
          handleCropComplete(incomingCroppedUri, photoNumber);
        } else {
          // Default fallback to first container
          handleCropComplete(incomingCroppedUri, 1);
        }
        
        // Clear the crop result params
        navigation.setParams({
          croppedUri: undefined,
          resultUri: undefined,
          croppedImageUri: undefined,
          croppedImage: undefined,
          imageUri: undefined,
          image: undefined,
          photoNumber: undefined,
          photoId: undefined,
          isDynamicPhoto: undefined
        });
      }
    });
    
    // Unfocus text elements when navigating away from screen
    const unsubscribeBlur = navigation.addListener('blur', () => {
      setFocusedTextId(null);
      setSelectedTextId(null);
    });
    
    return () => {
      unsubscribeCropResults();
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, localMode]);
  
  // Preserve initial route params
  const [initialRouteParams] = useState(initialParams);
  
  // Use refs to track photo state and prevent loss during navigation
  const photo1StateRef = useRef(null);
  const photo2StateRef = useRef(null);
  const viewShotRef = useRef(null);

  // Track the last tapped crop target (by photoId or photoNumber) to disambiguate returns
  const lastCropTargetRef = useRef({ photoId: null, photoNumber: null, isDynamicPhoto: false });
  
  // Update refs when photo state changes
  React.useEffect(() => {
    photo1StateRef.current = photo1Uri;
  }, [photo1Uri]);
  
  React.useEffect(() => {
    photo2StateRef.current = photo2Uri;
  }, [photo2Uri]);

  // Position single photo container initially at bottom-right
  const padding = 10; // Consistent with pan responder
  const photo1X = Math.max(padding, containerWidth - photo1Size - padding);
  const photo1Y = Math.max(padding, containerHeight - photo1Size - padding);
  
  const pan1X = useSharedValue(photo1X);
  const pan1Y = useSharedValue(photo1Y);

  // Ensure photo position stays within the container when size changes
  const clampPhoto1PositionForSize = (newSize) => {
    try {
      const padding = BOUND_PADDING;
      const minX = padding;
      const minY = padding;
      const maxX = Math.max(minX, containerWidth - newSize - padding);
      const maxY = Math.max(minY, containerHeight - newSize - padding);
      if (pan1X && typeof pan1X.value === 'number') {
        pan1X.value = Math.max(minX, Math.min(maxX, pan1X.value));
      }
      if (pan1Y && typeof pan1Y.value === 'number') {
        pan1Y.value = Math.max(minY, Math.min(maxY, pan1Y.value));
      }
    } catch (e) {
    }
  };

  // Simple resize handler for Photo 1: tap to increase, long-press to decrease
  const handleResizePhoto1 = (delta) => {
    setPhoto1Size((prev) => {
      const target = Math.max(minPhotoSize, Math.min(maxPhotoSize, prev + delta));
      try { clampPhoto1PositionForSize(target); } catch (e) {}
      return target;
    });
  };

  // Track dragging state to prevent swipe/navigation and template changes while dragging
  const isDraggingRef = React.useRef(false);
  const hasUserMovedStaticPhotoRef = React.useRef(false);
  const movedTextIdsRef = React.useRef(new Set());
  // Track text IDs that have been manually edited by user (to prevent overwriting with profile name)
  const editedTextIdsRef = React.useRef(new Set());
  // Track the last template serial number whose axis was applied
  const lastAppliedPhotoAxisSerial = React.useRef(null);
  const lastAppliedTextAxisSerial = React.useRef(null);

  // Animated style for single photo container
  const animatedStyle1 = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: pan1X.value },
        { translateY: pan1Y.value },
      ],
    };
  }, []);

  const handleCropComplete = React.useCallback(async (cropResult, photoNumber, photoId = null, isDynamicPhoto = false) => {
    // Accept flexible formats: string URI, or object with croppedUri/photoId/isDynamicPhoto
    const isObj = typeof cropResult === 'object' && cropResult !== null;
    const croppedUri = isObj ? (cropResult.croppedUri || cropResult.uri) : cropResult;
    let incomingPhotoId = isObj && cropResult.photoId ? cropResult.photoId : photoId;
    let incomingIsDynamic = isObj && typeof cropResult.isDynamicPhoto === 'boolean' ? cropResult.isDynamicPhoto : isDynamicPhoto;

    // Fallback to last tapped target if identifiers are missing
    if (!incomingPhotoId && (photoNumber == null)) {
      const last = lastCropTargetRef.current || {};
      if (last.photoId || last.photoNumber != null) {
        incomingPhotoId = last.photoId || incomingPhotoId;
        photoNumber = last.photoNumber != null ? last.photoNumber : photoNumber;
        incomingIsDynamic = typeof last.isDynamicPhoto === 'boolean' ? last.isDynamicPhoto : incomingIsDynamic;
      }
    }

    // If we have an explicit target ID, route by ID first
    if (incomingPhotoId) {
      const isKnownDynamic = photoElements.some(el => el.id === incomingPhotoId);
      if (isKnownDynamic || incomingIsDynamic) {
        updatePhotoUri(incomingPhotoId, croppedUri);
        // Clear focus so next tap shows delete instead of reopening gallery
        try { setFocusedPhotoId(null); } catch (e) {}
        return;
      }
      if (incomingPhotoId === STATIC_PHOTO_ID) {
        dispatchPhotoState({ type: 'SET_PHOTO_1', uri: croppedUri });
        setIsPhoto1Visible(true);
        return;
      }
      // If ID is unknown, continue to fallback by number
    }

    // Fallback by photo number (legacy path)

    // Handle cropped photo for static photos
    if (photoNumber === 1 || photoNumber == null) {
      // Default to first container when photoNumber is missing
      dispatchPhotoState({ type: 'SET_PHOTO_1', uri: croppedUri });
      setIsPhoto1Visible(true);
    } else if (photoNumber === 2) {
      dispatchPhotoState({ type: 'SET_PHOTO_2', uri: croppedUri });
    }
  }, [photo1Uri, photo2Uri, updatePhotoUri, photoElements]);
  
  // Background removal state management is defined elsewhere in the component
  

  // Ensure template image is preserved from initial params
  React.useEffect(() => {
    if (initialRouteParams.image && !templateImage) {
      setTemplateImage(initialRouteParams.image);
    }
  }, [initialRouteParams.image, templateImage]);

  // Debug: Log state changes with detailed info
  React.useEffect(() => {
  }, [templateImage, photo1Uri, photo2Uri, shape, route.params]);
  
  // Helper to resolve template image URL from various API shapes
  const getTemplateUri = React.useCallback((item) => {
    if (!item || typeof item !== 'object') return null;

    const sanitize = (v) => {
      if (typeof v !== 'string') return null;
      // Remove common invisible spaces and any whitespace accidentally stored in DB
      let s = v.replace(/\u200B/g, '').trim().replace(/\s+/g, '');
      s = s.replace(/^"|"$/g, ''); // strip surrounding quotes if present
      return /^https?:\/\//i.test(s) ? s : null;
    };

    // Common fields first (also include image_url from server docs)
    const directs = [item.secure_url, item.url, item.imageUrl, item.image_url, item.uri];
    for (const d of directs) {
      const u = sanitize(d);
      if (u) return u;
    }

    // Nested fields
    const nesteds = [
      item.image?.secure_url, item.image?.url,
      item.asset?.secure_url, item.asset?.url,
      item.source?.secure_url, item.source?.url,
    ];
    for (const n of nesteds) {
      const u = sanitize(n);
      if (u) return u;
    }

    // Cloudinary public_id fallback (requires cloud name)
    if (item.public_id && typeof item.public_id === 'string') {
      const CLOUD_NAME = null; // e.g., 'demo' | wire into AppConfig if needed
      if (CLOUD_NAME) {
        return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${item.public_id}`;
      }
    }
    return null;
  }, []);
  
  // Load more templates for 'congratulations' category
  const handleLoadMore = React.useCallback(async () => {
    if (localMode) return;
    const loadStartTime = performance.now();
    console.log('📚 Load More Triggered:', {
      currentPage: page,
      nextPage: page + 1,
      currentTemplatesCount: reelsTemplates.length,
      selectedReligions,
      category: 'congratulations',
      requestedLimit: 1,
      timestamp: new Date().toISOString()
    });
    
    try {
      const nextPage = page + 1;
      
      console.log('📚 Dispatching loadTemplatesByCategory:', {
        category: 'congratulations',
        page: nextPage,
        limit: 1,
        reset: false,
        religion: selectedReligions
      });
      
      const res = await dispatch(loadTemplatesByCategory({
        category: 'congratulations',
        options: { page: nextPage, limit: 1, reset: false, religion: selectedReligions }
      })).unwrap();
      
      const loadEndTime = performance.now();
      const more = res?.templates || [];
      
      console.log('📚 Load More Response:', {
        receivedTemplates: more.length,
        loadTime: `${(loadEndTime - loadStartTime).toFixed(2)}ms`,
        newTemplatesSerials: more.map(t => t.serial_no),
        hasMore: more.length > 0,
        responseKeys: Object.keys(res || {})
      });
      
      if (more.length) {
        const beforeCount = reelsTemplates.length;
        setReelsTemplates(prev => {
          const updated = [...prev, ...more];
          console.log('📚 Templates Array Updated:', {
            beforeCount,
            afterCount: updated.length,
            addedCount: more.length,
            newTemplateDetails: more.map(t => ({
              serial_no: t.serial_no,
              category: t.subcategory || t.category,
              imageUrl: t.image_url?.substring(0, 50) + '...'
            }))
          });
          return updated;
        });
        
        setPage(nextPage);
        
        console.log('📚 Load More Completed Successfully:', {
          newPage: nextPage,
          totalTemplatesNow: reelsTemplates.length + more.length,
          success: true
        });
      } else {
        console.log('📚 Load More: No additional templates received:', {
          possibleReasons: ['End of data reached', 'No matching templates', 'API returned empty'],
          currentPage: nextPage,
          shouldStopPagination: true
        });
      }
    } catch (e) {
      const loadEndTime = performance.now();
      console.error('📚 Load More Failed:', {
        error: e.message,
        errorType: e.name,
        currentPage: page,
        attemptedPage: page + 1,
        loadTime: `${(loadEndTime - loadStartTime).toFixed(2)}ms`,
        selectedReligions,
        timestamp: new Date().toISOString()
      });
    }
  }, [page, dispatch, reelsTemplates.length, selectedReligions]);
  
  // Debug: Log actual rendering values when shape changes
  React.useEffect(() => {
  }, [shape, photo1Size, photo1Uri]);


  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [savedTemplateUri, setSavedTemplateUri] = useState(null);
  // Hide UI chrome (share/download/menu) during capture
  const [isCapturing, setIsCapturing] = useState(false);
  // Video overlay capture state and cache
  const [isOverlayCapture, setIsOverlayCapture] = useState(false);
  const [currentVideoLocalUri, setCurrentVideoLocalUri] = useState(null);
  
  // Banner toggle state
  const [bannerEnabled, setBannerEnabled] = useState(false);
  // Cropped banner image URI
  const [bannerUri, setBannerUri] = useState(null);
  // Focus state for banner (controls showing ✕)
  const [isBannerFocused, setIsBannerFocused] = useState(false);

  // Restore stored banner on mount (handles remount after navigation)
  React.useEffect(() => {
    const mySourceType = localMode ? 'localMode' : 'normal';
    const storedBanner = cropResultManager.getStoredBanner(mySourceType);
    if (storedBanner && !bannerUri) {
      console.log('🔄 HeroScreen: Restoring stored banner for', mySourceType, ':', storedBanner?.substring(0, 50) + '...');
      setBannerUri(storedBanner);
      setBannerEnabled(true);
    }
  }, [localMode]); // Only run on mount (localMode doesn't change)

  // Restore stored photo on mount (handles remount after navigation)
  React.useEffect(() => {
    const mySourceType = localMode ? 'localMode' : 'normal';
    const storedPhoto = cropResultManager.getStoredPhoto(mySourceType);
    if (storedPhoto && storedPhoto.croppedUri) {
      console.log('🔄 HeroScreen: Restoring stored photo for', mySourceType, ':', {
        photoId: storedPhoto.photoId,
        photoNumber: storedPhoto.photoNumber
      });
      // Apply the stored photo using the same logic as handleCropComplete
      const { croppedUri, photoId, photoNumber, isDynamicPhoto } = storedPhoto;
      if (photoId === STATIC_PHOTO_ID || photoNumber === 1) {
        dispatchPhotoState({ type: 'SET_PHOTO_1', uri: croppedUri });
        setIsPhoto1Visible(true);
      } else if (photoNumber === 2) {
        dispatchPhotoState({ type: 'SET_PHOTO_2', uri: croppedUri });
      } else if (isDynamicPhoto && photoId) {
        updatePhotoUri(photoId, croppedUri);
      }
      // Clear the stored photo after restoring
      cropResultManager.clearStoredPhoto(mySourceType);
    }
  }, [localMode]); // Only run on mount (localMode doesn't change)

  // Debug: Log banner state changes
  React.useEffect(() => {
    console.log('🏷️ HeroScreen: Banner state changed:', {
      bannerEnabled,
      bannerUri: bannerUri ? bannerUri.substring(0, 80) + '...' : null,
      uriLength: bannerUri?.length || 0,
      isBannerFocused
    });
  }, [bannerEnabled, bannerUri, isBannerFocused]);

  // Listen for banner crop results via global manager (fallback if route callback is dropped)
  React.useEffect(() => {
    const mySourceType = localMode ? 'localMode' : 'normal';
    console.log('📥 HeroScreen: Setting up banner listener for localMode:', localMode, 'sourceType:', mySourceType);
    try {
      const remove = cropResultManager.addListener(async (payload) => {
        try {
          console.log('🎯 HeroScreen: Received cropResultManager event:', {
            photoNumber: payload?.photoNumber,
            sourceScreen: payload?.sourceScreen,
            hasUri: !!payload?.croppedUri,
            myLocalMode: localMode,
            mySourceType
          });
          if (!payload) {
            console.warn('⚠️ HeroScreen: Payload is empty');
            return;
          }
          const { croppedUri, photoNumber, sourceScreen } = payload;
          // Only handle banner events - other events are handled by the main listener
          if (photoNumber !== 'banner') {
            console.log('⏭️ HeroScreen: Skipping non-banner event, photoNumber:', photoNumber);
            return;
          }

          // Check if this banner event is for this HeroScreen type (localMode vs normal)
          // Use sourceScreen from payload first, then fall back to global tracker
          const expectedSource = sourceScreen || cropResultManager.getSourceScreen();
          console.log('🔍 HeroScreen: Checking source match:', {
            expectedSource,
            mySourceType,
            match: expectedSource === mySourceType,
            noSourceSet: !expectedSource
          });

          // If expectedSource is set, only the matching HeroScreen type should handle it
          if (expectedSource && expectedSource !== mySourceType) {
            console.log('🚫 HeroScreen: Ignoring banner event - source mismatch', {
              expectedSource,
              mySourceType,
              localMode
            });
            return;
          }

          console.log('✅ HeroScreen: Processing banner for this instance:', {
            photoNumber,
            croppedUri: croppedUri?.substring(0, 80) + '...',
            uriLength: croppedUri?.length,
            localMode,
            mySourceType
          });

          if (croppedUri) {
            console.log('✅ HeroScreen: Setting banner URI');
            setBannerUri(croppedUri);
            setBannerEnabled(true);
            // Clear the source screen after successfully handling the event
            cropResultManager.clearSourceScreen();
            console.log('✅ HeroScreen: Banner enabled and URI set successfully');

            try {
              await dispatch(uploadTemplate({
                imageUri: croppedUri,
                category: 'banners',
                templateData: { name: 'Banner', ratio: '5:1' }
              })).unwrap();
              console.log('✅ HeroScreen: Banner uploaded to cloud');
            } catch (err) {
              console.warn('⚠️ Banner cloud upload failed:', err?.message || err);
            }
          } else {
            console.warn('⚠️ HeroScreen: Banner missing URI');
          }
        } catch (e) {
          console.error('❌ HeroScreen: Error processing banner:', e);
        }
      });
      return () => {
        console.log('📤 HeroScreen: Removing banner listener for localMode:', localMode);
        try { remove && remove(); } catch (e) {}
      };
    } catch (e) {
      console.error('❌ HeroScreen: Error setting up banner listener:', e);
    }
  }, [dispatch, localMode]);
  
  // Menu bar visibility
  const [menuVisible, setMenuVisible] = useState(false);

  // Banner choice dialog
  const [showBannerDialog, setShowBannerDialog] = useState(false);

  // Text color options
  const TEXT_COLORS = [
    COLORS.black,
    COLORS.white,
    COLORS.primary,
    COLORS.accent,
    COLORS.success,
    COLORS.warning,
    COLORS.error,
    '#FF6B35', // Orange
    '#7B68EE', // Purple
    '#20B2AA', // Turquoise
    '#FFD700', // Gold
    '#FF1493', // Deep Pink
  ];

  
  // Font weight options
  const FONT_WEIGHTS = [
    { label: 'Light', value: '300' },
    { label: 'Normal', value: 'normal' },
    { label: 'Medium', value: '500' },
    { label: 'Bold', value: 'bold' },
    { label: 'Extra Bold', value: '800' },
  ];

  // Text management functions
  const addTextElement = () => {
    // Calculate safe positioning within container bounds with variation
    const padding = 20;
    const estimatedTextWidth = 120;
    const estimatedTextHeight = 40;
    
    // Get current number of text elements to vary positioning
    const currentCount = textElements.length;
    
    // Create more varied positions to prevent overlapping
    const cols = 3; // Number of columns
    const col = currentCount % cols;
    const row = Math.floor(currentCount / cols);
    
    // Spacing between text elements
    const spacingX = 140; // More horizontal spacing
    const spacingY = 80;  // More vertical spacing
    
    // Starting position (bottom-left corner of container)
    const startX = padding;
    const startY = containerHeight - estimatedTextHeight - padding;
    
    // Calculate position with proper spacing to cover full container (move upward by rows)
    const safeX = Math.max(padding, Math.min(containerWidth - estimatedTextWidth - padding, startX + (col * spacingX)));
    const rawY = startY - (row * spacingY);
    const safeY = Math.max(padding, Math.min(containerHeight - estimatedTextHeight - padding, rawY));
    
    
    // Vary colors to make each text more distinct
    const textColors = [COLORS.white, '#FFD700', '#FF6B35', '#7B68EE', '#20B2AA', '#FF1493'];
    const textColor = textColors[currentCount % textColors.length];
    
    const newTextElement = {
      id: Date.now().toString(),
      text: `Text ${currentCount + 1}`,
      x: safeX,
      y: safeY,
      width: estimatedTextWidth,
      height: estimatedTextHeight,
      color: textColor,
      fontWeight: 'bold',
      textAlign: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker background for better contrast
    };
    
    
    setTextElements(prev => {
      const newElements = [...prev, newTextElement];
      return newElements;
    });
    
    // Auto-focus the new text element (but don't auto-open modal - let user decide)
    setTimeout(() => {
      setSelectedTextId(newTextElement.id);
      setFocusedTextId(newTextElement.id);
      // Don't auto-open customization modal - let user tap the style button if needed
      // setShowTextCustomization(true);
    }, 100);
  };

  // Add a default first text container like the first photo container
  // The text here MUST come from the ProfileScreen Redux displayName so it updates live
  const addDefaultTextElement = () => {
    if (defaultTextAddedRef.current) return;

    const padding = 20;
    const estimatedTextWidth = 160;
    const estimatedTextHeight = 42;
    const safeX = padding;
    const safeY = Math.max(padding, containerHeight - estimatedTextHeight - padding);

    // Prefer the Redux name, then local state, then fallback
    const resolvedName = (profileDisplayName && profileDisplayName.trim()) || userName || 'Your Text';

    const newTextElement = {
      id: `default-text-${Date.now()}`,
      text: resolvedName,
      x: safeX,
      y: safeY,
      width: estimatedTextWidth,
      height: estimatedTextHeight,
      color: COLORS.primary,
      fontWeight: 'bold',
      textAlign: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)'
    };
    setTextElements(prev => (prev && prev.length > 0 ? prev : [newTextElement]));
    defaultTextAddedRef.current = true;
  };

  // Initialize a default text container once when no texts exist
  React.useEffect(() => {
    try {
      if (!defaultTextAddedRef.current && Array.isArray(textElements) && textElements.length === 0) {
        addDefaultTextElement();
      }
    } catch (e) {
    }
    // Only run when textElements emptiness changes or dimensions ready
  }, [textElements.length, containerWidth, containerHeight]);

  // The default text element is now fully controlled by Redux (ProfileScreen),
  // so we no longer fetch the name from the backend or AsyncStorage here.

  const updateTextContent = (textId, newText) => {
    // Mark this text as manually edited so it won't be overwritten by profile name sync
    try { editedTextIdsRef.current.add(textId); } catch (e) {}
    console.log('✏️ Text manually edited:', { textId, newText, editedIds: Array.from(editedTextIdsRef.current) });
    setTextElements(prev =>
      prev.map(element =>
        element.id === textId ? { ...element, text: newText } : element
      )
    );
  };

  const updateTextPosition = (textId, x, y) => {
    // Mark that this text has been manually moved
    try { movedTextIdsRef.current.add(textId); } catch (e) {}
    setTextElements(prev => 
      prev.map(element => 
        element.id === textId ? { ...element, x, y } : element
      )
    );
  };

  const updateTextSize = (textId, width, height) => {
    setTextElements(prev => 
      prev.map(element => 
        element.id === textId ? { ...element, width, height } : element
      )
    );
  };

  const updateTextStyle = (textId, styleUpdates) => {
    setTextElements(prev => 
      prev.map(element => 
        element.id === textId ? { ...element, ...styleUpdates } : element
      )
    );
  };

  const deleteTextElement = (textId) => {
    
    setTextElements(prev => {
      const filtered = prev.filter(element => element.id !== textId);
      return filtered;
    });
    
    // Unfocus if the deleted element was focused
    if (focusedTextId === textId) {
      setFocusedTextId(null);
      setSelectedTextId(null);
    }
    
    // Close customization modal if it's open for the deleted element
    if (selectedTextId === textId && showTextCustomization) {
      setShowTextCustomization(false);
    }
  };

  const handleTextFocus = (textId) => {
    setFocusedTextId(textId);
  };

  const handleTextUnfocus = (textId) => {
    if (focusedTextId === textId) {
      setFocusedTextId(null);
      setSelectedTextId(null);
    }
  };

  const handleBackgroundPress = () => {
    // Unfocus both text and photo elements when background is pressed
    if (focusedTextId) {
      setFocusedTextId(null);
      setSelectedTextId(null);
    }
    if (focusedPhotoId) {
      setFocusedPhotoId(null);
    }
    if (isPhoto1Focused) {
      setIsPhoto1Focused(false);
    }
    if (isBannerFocused) {
      setIsBannerFocused(false);
    }
  };

  // Simple photo container tap handler - directly opens gallery
  const handlePhotoContainerPress = (photoNumber) => {
    // Record target for static container
    lastCropTargetRef.current = { photoId: STATIC_PHOTO_ID, photoNumber, isDynamicPhoto: false };
    openGallery(photoNumber);
  };

  // Text rotation handler (keeping text functionality intact)
  const handleTextRotation = (textId) => {
    setTextRotations(prev => ({
      ...prev,
      [textId]: ((prev[textId] || 0) + 90) % 360
    }));
  };

  // Photo container management functions
  const addPhotoElement = () => {
    // Calculate safe positioning within container bounds with variation
    const padding = 20;
    const photoSize = 100; // Default photo size
    
    // Get current number of photo elements to vary positioning
    const currentCount = photoElements.length;
    
    // Create more varied positions to prevent overlapping
    const cols = 2; // Number of columns for photos (less than text for better spacing)
    const col = currentCount % cols;
    const row = Math.floor(currentCount / cols);
    
    // Spacing between photo elements
    const spacingX = 160; // More horizontal spacing for photos
    const spacingY = 120;  // More vertical spacing for photos
    
    // Starting position (offset from text elements)
    const startX = padding + 50; // Slightly offset from text start
    const startY = padding + 50;
    
    // Calculate position with proper spacing
    const safeX = Math.max(padding, Math.min(containerWidth - photoSize - padding, startX + (col * spacingX)));
    const safeY = Math.max(padding, Math.min(containerHeight - photoSize - padding, startY + (row * spacingY)));
    
    
    const newPhotoElement = {
      id: Date.now().toString(),
      uri: 'default_profile_image', // Start with default
      x: safeX,
      y: safeY,
      size: photoSize,
      shape: shape // Use current shape setting
    };
    
    
    setPhotoElements(prev => {
      const newElements = [...prev, newPhotoElement];
      return newElements;
    });
    
    // Auto-focus the new photo element
    setTimeout(() => {
      setFocusedPhotoId(newPhotoElement.id);
    }, 100);
  };

  const deletePhotoElement = (photoId) => {
    
    setPhotoElements(prev => {
      const filtered = prev.filter(element => element.id !== photoId);
      return filtered;
    });
    
    // Unfocus if the deleted element was focused
    if (focusedPhotoId === photoId) {
      setFocusedPhotoId(null);
    }
  };

  const updatePhotoPosition = (photoId, x, y) => {
    try { console.log('🧭 updatePhotoPosition', { photoId, x, y }); } catch {}
    setPhotoElements(prev => 
      prev.map(element => 
        element.id === photoId ? { ...element, x, y } : element
      )
    );
  };

  const updatePhotoSize = (photoId, size) => {
    setPhotoElements(prev => 
      prev.map(element => 
        element.id === photoId ? { ...element, size } : element
      )
    );
  };

  const updatePhotoUri = (photoId, uri) => {
    setPhotoElements(prev => 
      prev.map(element => 
        element.id === photoId ? { ...element, uri } : element
      )
    );
  };


  const handlePhotoElementPress = (photoId) => {
    // Record target for dynamic container
    lastCropTargetRef.current = { photoId, photoNumber: null, isDynamicPhoto: true };
    // Find the photo element to get its index for navigation
    const photoElement = photoElements.find(p => p.id === photoId);
    if (photoElement) {
      // Use a unique identifier for dynamic photos
      openGalleryForDynamicPhoto(photoId);
    }
  };

  const handlePhotoFocus = (photoId) => {
    setFocusedPhotoId(photoId);
    if (isPhoto1Focused) setIsPhoto1Focused(false);
  };

  const handlePhotoUnfocus = (photoId) => {
    if (focusedPhotoId === photoId) {
      setFocusedPhotoId(null);
    }
  };

  // Template button handler - show options to create new or view existing templates
  const handleTemplateButtonPress = async () => {
    try {
      // Check if user has any templates
      const templates = await UserTemplatesService.getAllTemplates();
      
      if (templates.length > 0) {
        // Show dialog with options
        setAlertConfig({
          visible: true,
          title: 'Template Options',
          message: 'What would you like to do?',
          buttons: [
            { 
              text: 'View My Templates', 
              onPress: () => navigation.navigate('UserTemplates')
            },
            { 
              text: 'Create New Template', 
              onPress: () => openGalleryForNewTemplate()
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        });
      } else {
        // No templates yet, directly open gallery
        openGalleryForNewTemplate();
      }
    } catch (error) {
      console.error('Error checking templates:', error);
      // On error, just open gallery
      openGalleryForNewTemplate();
    }
  };

  // Open gallery to create new template
  const openGalleryForNewTemplate = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }

      if (result.errorCode) {
        console.error('ImagePicker Error:', result.errorMessage);
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Failed to open gallery',
          buttons: [{ text: 'OK' }]
        });
        return;
      }

      const asset = result.assets?.[0];
      if (asset?.uri) {
        // Navigate to TemplateCrop screen
        navigation.navigate('TemplateCrop', { uri: asset.uri });
      }
    } catch (error) {
      console.error('Error opening gallery for template:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to open gallery',
        buttons: [{ text: 'OK' }]
      });
    }
  };


  // Request storage permission for Android
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // For Android 13+ (API 33+), we need READ_MEDIA_IMAGES
      // For Android 10-12 (API 29-32), we need READ_EXTERNAL_STORAGE  
      // For Android 9 and below (API 28-), we need WRITE_EXTERNAL_STORAGE
      
      const androidVersion = Platform.Version;
      
      let permission;
      let permissionName;
      
      if (androidVersion >= 33) {
        // Android 13+
        permission = 'android.permission.READ_MEDIA_IMAGES';
        permissionName = 'Media Images Access';
      } else if (androidVersion >= 29) {
        // Android 10-12
        permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        permissionName = 'Storage Access';
      } else {
        // Android 9 and below
        permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
        permissionName = 'Storage Access';
      }
      
      
      // Check if permission is already granted
      const hasPermission = await PermissionsAndroid.check(permission);
      if (hasPermission) {
        return true;
      }
      
      const granted = await PermissionsAndroid.request(
        permission,
        {
          title: `${permissionName} Permission`,
          message: `This app needs ${permissionName.toLowerCase()} permission to save your templates to your device gallery.`,
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        },
      );
      
      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      
      if (!isGranted) {
      } else {
      }
      
      return isGranted;
    } catch (err) {
      return false;
    }
  };

  // Save template function
  const saveTemplate = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Request permission
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required', 
          'We need permission to access your device storage to save templates. Please enable storage permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // You can add logic here to open app settings if needed
            }}
          ]
        );
        return;
      }
      
      // Check if current template is a video
      const currentTemplate = reelsTemplates && reelsTemplates.length > 0 ? reelsTemplates[currentReelIndex] : null;
      const isVideo = currentTemplate?.resource_type === 'video' || !!currentTemplate?.video_url;
      const videoUrl = currentTemplate?.video_url;
      
      console.log('💾 Save triggered:', {
        isVideo,
        hasVideoUrl: !!videoUrl,
        videoUrl: videoUrl?.substring(0, 60),
        currentReelIndex,
        templateSerial: currentTemplate?.serial_no
      });
      
      // If it's a video, composite overlays with FFmpeg then save
      if (isVideo && videoUrl) {
        try {
          // Build overlays from current state
          const photos = [];
          // Static photo 1
          if (photo1Uri && photo1Uri !== 'default_profile_image') {
            const x = Math.round(typeof pan1X?.value === 'number' ? pan1X.value : 0);
            const y = Math.round(typeof pan1Y?.value === 'number' ? pan1Y.value : 0);
            photos.push({ uri: photo1Uri, x, y, width: Math.round(photo1Size), height: Math.round(photo1Size) });
          }
          // Dynamic photos
          if (Array.isArray(photoElements) && photoElements.length > 0) {
            photoElements.forEach(el => {
              const uri = el?.uri;
              if (!uri || uri === 'default_profile_image') return;
              photos.push({ uri, x: Math.round(el.x || 0), y: Math.round(el.y || 0), width: Math.round(el.size || 0), height: Math.round(el.size || 0) });
            });
          }

          // Text overlays - send original screen coordinates, server will scale
          const texts = Array.isArray(textElements) ? textElements.map(t => ({
            text: String(t.text || ''),
            x: Math.round(t.x || 0),
            y: Math.round(t.y || 0),
            width: Math.round(t.width || 120),
            height: Math.round(t.height || 40),
            fontSize: Math.max(16, Math.min(64, Math.floor((t.height || 40) * 0.8))),
            color: t.color || '#FFFFFF',
            fontWeight: t.fontWeight || 'normal',
            fontFamily: t.fontFamily || null,
            textAlign: t.textAlign || 'center',
            backgroundColor: t.backgroundColor || 'transparent'
          })) : [];

          const effectiveBannerUri = bannerEnabled && bannerUri ? bannerUri : null;

          const hasOverlays = (photos && photos.length) || (texts && texts.length) || !!effectiveBannerUri;

          if (hasOverlays) {
            console.log('🎬 Processing video with overlays via backend...');
            setIsProcessingVideo(true);
            setVideoProcessingStatus('Saving video with overlays...');
            try {
              const compositedPath = await VideoCompositeService.compositeVideo({
              videoUrl,
              photos,
              texts,
              bannerUri: effectiveBannerUri,
              bannerX: 0,
              bannerY: 0,
              bannerWidth: Math.round(containerWidth),
              bannerHeight: Math.round(containerWidth / 5),
              containerWidth: Math.round(containerWidth),
              containerHeight: Math.round(containerHeight),
            });

              const savedUri = await CameraRoll.save(compositedPath, { type: 'video', album: 'Narayana Templates' });
              try { setSavedTemplateUri(savedUri); } catch (e) {}
              Alert.alert('Success! 🎥', 'Your edited video has been saved to the Narayana Templates album.', [{ text: 'Great!' }]);
              return savedUri;
            } finally {
              setIsProcessingVideo(false);
              setVideoProcessingStatus('');
            }
          } else {
            // No overlays → fallback to saving original video
            console.log('ℹ️ No overlays detected, saving original video.');
            const RNFS = require('react-native-fs');
            const timestamp = Date.now();
            const downloadPath = `${RNFS.CachesDirectoryPath}/narayana_video_${timestamp}.mp4`;
            const downloadResult = await RNFS.downloadFile({ fromUrl: videoUrl, toFile: downloadPath }).promise;
            if (downloadResult.statusCode !== 200) throw new Error(`Download failed with status: ${downloadResult.statusCode}`);
            const savedUri = await CameraRoll.save(downloadPath, { type: 'video', album: 'Narayana Templates' });
            try { setSavedTemplateUri(savedUri); } catch {}
            return savedUri;
          }

        } catch (videoError) {
          console.error('❌ Video save failed:', videoError);
          throw new Error(`Failed to save video: ${videoError.message}`);
        }
      }
      
      // For images, use ViewShot capture (existing logic)
      if (!viewShotRef.current) {
        Alert.alert('Error', 'Unable to capture template. Please try again.');
        return;
      }

      // Unfocus any active containers (simulate background tap) so borders/handles are hidden
      try { handleBackgroundPress(); setShowTextCustomization(false); } catch (e) {}

      // Hide UI chrome while capturing
      try { setIsCapturing(true); } catch (e) {}

      // Small delay to ensure all animations and renders are complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the entire template
      const uri = await viewShotRef.current.capture({ 
        format: 'jpg', 
        quality: 1.0,
        result: 'tmpfile'
      });


      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `narayana_template_${timestamp}.jpg`;
      
      
      // Save to device gallery/photos
      try {
          const savedUri = await CameraRoll.save(uri, {
            type: 'photo',
            album: 'Narayana Templates'
          });
          
          
          // Keep saved uri for sharing
          try { setSavedTemplateUri(savedUri); } catch (e) {}
          
          // Show success alert
        Alert.alert(
          'Success! 🎉', 
          `Your template has been saved successfully!\n\nYou can find it in your Photos app under the 'Narayana Templates' album.`,
          [{ text: 'Great!', style: 'default' }]
        );
        
        return savedUri;
      } catch (saveError) {
        
        // Try saving without album specification as fallback
        try {
          const fallbackSavedUri = await CameraRoll.save(uri, { type: 'photo' });
          
          // Keep saved uri for sharing
          try { setSavedTemplateUri(fallbackSavedUri); } catch (e) {}
          
          // Show success alert for fallback save
          Alert.alert(
            'Success! 🎉', 
            `Your template has been saved successfully!\n\nYou can find it in your Photos app.`,
            [{ text: 'Great!', style: 'default' }]
          );
          
          return fallbackSavedUri;
        } catch (fallbackError) {
          throw new Error(`Failed to save image: ${fallbackError.message}`);
        }
      }

    } catch (error) {
      Alert.alert(
        'Save Failed', 
        `Failed to save template: ${error.message}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      try { setIsCapturing(false); } catch (e) {}
      setIsSaving(false);
    }
  };

  // Share template function
  const shareTemplate = async () => {
    try {
      setError(null);
      
      // Check if current template is a video
      const currentTemplate = reelsTemplates && reelsTemplates.length > 0 ? reelsTemplates[currentReelIndex] : null;
      const isVideo = currentTemplate?.resource_type === 'video' || !!currentTemplate?.video_url;
      const videoUrl = currentTemplate?.video_url;
      
      console.log('🔗 Share triggered:', {
        isVideo,
        hasVideoUrl: !!videoUrl,
        videoUrl: videoUrl?.substring(0, 60),
        currentReelIndex,
        templateSerial: currentTemplate?.serial_no
      });
      
      // Request storage permissions (Android)
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is required to save and share the template.');
        return null;
      }
      
      // If it's a video, composite overlays with FFmpeg then share
      if (isVideo && videoUrl) {
        try {
          // Build overlays
          const photos = [];
          if (photo1Uri && photo1Uri !== 'default_profile_image') {
            const x = Math.round(typeof pan1X?.value === 'number' ? pan1X.value : 0);
            const y = Math.round(typeof pan1Y?.value === 'number' ? pan1Y.value : 0);
            photos.push({ uri: photo1Uri, x, y, width: Math.round(photo1Size), height: Math.round(photo1Size) });
          }
          if (Array.isArray(photoElements) && photoElements.length > 0) {
            photoElements.forEach(el => {
              const uri = el?.uri;
              if (!uri || uri === 'default_profile_image') return;
              photos.push({ uri, x: Math.round(el.x || 0), y: Math.round(el.y || 0), width: Math.round(el.size || 0), height: Math.round(el.size || 0) });
            });
          }
          // Text overlays - send original screen coordinates, server will scale
          const texts = Array.isArray(textElements) ? textElements.map(t => ({
            text: String(t.text || ''),
            x: Math.round(t.x || 0),
            y: Math.round(t.y || 0),
            width: Math.round(t.width || 120),
            height: Math.round(t.height || 40),
            fontSize: Math.max(16, Math.min(64, Math.floor((t.height || 40) * 0.8))),
            color: t.color || '#FFFFFF',
            fontWeight: t.fontWeight || 'normal',
            fontFamily: t.fontFamily || null,
            textAlign: t.textAlign || 'center',
            backgroundColor: t.backgroundColor || 'transparent'
          })) : [];
          const effectiveBannerUri = bannerEnabled && bannerUri ? bannerUri : null;
          const hasOverlays = (photos && photos.length) || (texts && texts.length) || !!effectiveBannerUri;

          let sharePath;
          if (hasOverlays) {
            console.log('🎬 Processing video with overlays via backend for sharing...');
            setIsProcessingVideo(true);
            setVideoProcessingStatus('Processing video with overlays...');
            try {
              sharePath = await VideoCompositeService.compositeVideo({
                videoUrl,
                photos,
                texts,
                bannerUri: effectiveBannerUri,
                bannerX: 0,
                bannerY: 0,
                bannerWidth: Math.round(containerWidth),
                bannerHeight: Math.round(containerWidth / 5),
                containerWidth: Math.round(containerWidth),
                containerHeight: Math.round(containerHeight),
              });
            } finally {
              setIsProcessingVideo(false);
              setVideoProcessingStatus('');
            }
          } else {
            // Fallback to original video
            const RNFS = require('react-native-fs');
            const timestamp = Date.now();
            const filename = `narayana_video_${timestamp}.mp4`;
            sharePath = `${RNFS.CachesDirectoryPath}/${filename}`;
            const downloadResult = await RNFS.downloadFile({ fromUrl: videoUrl, toFile: sharePath }).promise;
            if (downloadResult.statusCode !== 200) throw new Error(`Download failed: ${downloadResult.statusCode}`);
          }

          const fileUrl = sharePath.startsWith('file://') ? sharePath : `file://${sharePath}`;
          await RNShare.open({
            url: fileUrl,
            type: 'video/mp4',
            filename: 'narayana_template.mp4',
            failOnCancel: false,
            showAppsToView: true,
            title: 'Share Video Template'
          });
          return fileUrl;

        } catch (videoError) {
          console.error('❌ Video share failed:', videoError);
          throw new Error(`Failed to share video: ${videoError.message}`);
        }
      }

      // For images, use ViewShot capture (existing logic)
      if (!viewShotRef.current) {
        Alert.alert('Error', 'Unable to capture template. Please try again.');
        return null;
      }

      // Unfocus any active containers (simulate background tap)
      try { handleBackgroundPress(); setShowTextCustomization(false); } catch (e) {}

      // Hide UI chrome while capturing
      try { setIsCapturing(true); } catch (e) {}

      // 1) Capture current view to a temp file
      await new Promise(resolve => setTimeout(resolve, 50));
      const capturedTmpUri = await viewShotRef.current.capture({ format: 'jpg', quality: 1.0, result: 'tmpfile' });

      // 2) Save the same captured file to the gallery/storage
      let savedUri = null;
      try {
        savedUri = await CameraRoll.save(capturedTmpUri, { type: 'photo', album: 'Narayana Templates' });
        try { setSavedTemplateUri(savedUri); } catch (e) {}
      } catch (saveErr) {
      }

      // 3) Share the same image - prefer the captured file path first
      const RNFS = require('react-native-fs');
      const ensureFileUrl = (u) => (u && u.startsWith('file://')) ? u : (u ? `file://${u.replace(/^file:\/\//, '')}` : null);

      const fileUrl = ensureFileUrl(capturedTmpUri);
      try {
        await RNShare.open({
          url: fileUrl,
          type: 'image/jpeg',
          filename: 'narayana_template.jpg',
          failOnCancel: false,
          showAppsToView: true,
          title: 'Share Template'
        });
        return fileUrl;
      } catch (err1) {
        // 3b) Try sharing the saved gallery URI (may be content:// on Android)
        if (savedUri) {
          try {
            await RNShare.open({
              url: savedUri,
              type: 'image/jpeg',
              filename: 'narayana_template.jpg',
              failOnCancel: false,
              showAppsToView: true,
              title: 'Share Template'
            });
            return savedUri;
          } catch (err2) {
          }
        }

        // 3c) Base64 fallback from captured file
        try {
          const base64 = await RNFS.readFile(capturedTmpUri.replace(/^file:\/\//, ''), 'base64');
          await RNShare.open({
            url: `data:image/jpeg;base64,${base64}`,
            type: 'image/jpeg',
            filename: 'narayana_template.jpg',
            failOnCancel: false,
            title: 'Share Template'
          });
          return 'data:image/jpeg;base64,[...]';
        } catch (err3) {
          throw err3;
        }
      }
    } catch (error) {
      Alert.alert('Share Failed', `Failed to share template: ${error.message}`);
      return null;
    } finally {
      try { setIsCapturing(false); } catch (e) {}
    }
  };


  // Handle Remove BG button press - Server-based background removal with cached results
  const handleRemoveBackground = async () => {
    
    try {
      
      // Check if we have cached results that can be used instantly
      let hasCachedResults = false;
      let cachedCount = 0;
      
      // Check Photo 1 cache (skip if default profile image)
      if (photo1Uri && photo1Uri !== 'default_profile_image' && !photo1Uri.includes('bg_removed') && 
          cachedBgRemovedPhoto1 && trackedPhoto1Uri === photo1Uri) {
        dispatchPhotoState({ type: 'SET_PHOTO_1', uri: cachedBgRemovedPhoto1 });
        hasCachedResults = true;
        cachedCount++;
      }
      
      // Check Photo 2 cache
      if (photo2Uri && !photo2Uri.includes('bg_removed') && 
          cachedBgRemovedPhoto2 && trackedPhoto2Uri === photo2Uri) {
        dispatchPhotoState({ type: 'SET_PHOTO_2', uri: cachedBgRemovedPhoto2 });
        hasCachedResults = true;
        cachedCount++;
      }
      
      // If we have cached results for all photos, return early
      const totalPhotos = (photo1Uri ? 1 : 0) + (photo2Uri ? 1 : 0);
      if (hasCachedResults && cachedCount === totalPhotos) {
        // Set flag to indicate backgrounds are removed (for button state management)
        setIsBackgroundRemoved(true);
        
        Alert.alert(
          'Background Removal Complete! ⚡',
          `Used cached results - instantly restored ${cachedCount} photo(s) without background!`,
          [{ text: 'Great!', style: 'default' }]
        );
        return;
      }
      
      // Store original images before background removal for undo functionality
      if (photo1Uri && !photo1Uri.includes('bg_removed')) {
        setOriginalPhoto1Uri(photo1Uri);
        // Also store persistent backup for continuous restoration
        if (!persistentOriginalPhoto1Uri || persistentOriginalPhoto1Uri !== photo1Uri) {
          setPersistentOriginalPhoto1Uri(photo1Uri);
        }
      }
      if (photo2Uri && !photo2Uri.includes('bg_removed')) {
        setOriginalPhoto2Uri(photo2Uri);
        // Also store persistent backup for continuous restoration
        if (!persistentOriginalPhoto2Uri || persistentOriginalPhoto2Uri !== photo2Uri) {
          setPersistentOriginalPhoto2Uri(photo2Uri);
        }
      }
      
      // Check if we have photos to process (collect all eligible containers)
      const imagesToProcess = [];
      
      // Static Photo 1 (not default, not already bg_removed, not cached)
      if (photo1Uri && photo1Uri !== 'default_profile_image' && !photo1Uri.includes('bg_removed')) {
        const isCached = cachedBgRemovedPhoto1 && trackedPhoto1Uri === photo1Uri;
        if (!isCached) {
          imagesToProcess.push({ uri: photo1Uri, photoNumber: 1, clientTarget: { type: 'static', photoNumber: 1 } });
        }
      }
      
      // Static Photo 2 (if used)
      if (photo2Uri && !photo2Uri.includes('bg_removed')) {
        const isCached = cachedBgRemovedPhoto2 && trackedPhoto2Uri === photo2Uri;
        if (!isCached) {
          imagesToProcess.push({ uri: photo2Uri, photoNumber: 2, clientTarget: { type: 'static', photoNumber: 2 } });
        }
      }
      
      // Dynamic photo elements
      if (Array.isArray(photoElements) && photoElements.length > 0) {
        photoElements.forEach((el) => {
          try {
            const uri = el?.uri;
            if (!uri || uri === 'default_profile_image') return;
            if (typeof uri === 'string' && uri.includes('bg_removed')) return;
            imagesToProcess.push({ uri, clientTarget: { type: 'dynamic', photoId: el.id } });
          } catch (e) {}
        });
      }
      
      if (imagesToProcess.length === 0) {
        Alert.alert('No Photos', 'Please add photos before removing background.');
        return;
      }

      
      // Set loading state
      setIsRemovingBackground(true);
      setBackgroundRemovalProgress(0);
      setBackgroundRemovalStatus('Starting background removal...');
      
      // Test basic connectivity first
      const basicConnectivity = await backgroundRemovalService.testBasicConnectivity();
      
      // Test server connection
      const isServerReachable = await backgroundRemovalService.testConnection();
      
      if (!isServerReachable) {
        throw new Error('🚨 Background Removal Server Not Running!\n\nTo fix this:\n1. Open a terminal/command prompt\n2. Navigate to: D:\\Projects\\Narayana_App\\server\n3. Run: npm install (first time only)\n4. Run: npm run dev\n5. Keep the server running and try again\n\nThe server should start on http://localhost:10000 (default). On Android emulator, the app will use http://10.0.2.2:10000.');
      }
      
      // Process images in batch with progress tracking
      const processedResults = await backgroundRemovalService.processBatch(
        imagesToProcess,
        (progress) => {
          setBackgroundRemovalProgress(progress);
        },
        (status) => {
          setBackgroundRemovalStatus(status);
        }
      );
      
      
      // Update photos with processed results
      let successCount = 0;
      let errorMessages = [];
      
      for (const result of processedResults) {
        const target = result.clientTarget || null;
        const targetInfo = target ? (target.type === 'dynamic' ? `dynamic:${target.photoId}` : `static:${target.photoNumber}`) : `photoNumber:${result.photoNumber}`;
        
        if (result.success && result.processedUri) {
          if (target && target.type === 'dynamic' && target.photoId) {
            // Update dynamic photo element
            updatePhotoUri(target.photoId, result.processedUri);
          } else if ((target && target.type === 'static' && target.photoNumber === 1) || result.photoNumber === 1) {
            dispatchPhotoState({ type: 'SET_PHOTO_1', uri: result.processedUri });
            setCachedBgRemovedPhoto1(result.processedUri);
          } else if ((target && target.type === 'static' && target.photoNumber === 2) || result.photoNumber === 2) {
            dispatchPhotoState({ type: 'SET_PHOTO_2', uri: result.processedUri });
            setCachedBgRemovedPhoto2(result.processedUri);
          }
          successCount++;
        } else {
          const label = target ? (target.type === 'dynamic' ? `Dynamic ${target.photoId}` : `Photo ${target.photoNumber}`) : `Photo ${result.photoNumber}`;
          errorMessages.push(`${label}: ${result.error || 'Unknown error'}`);
        }
      }
      
      // Show completion alert
      if (successCount > 0) {
        const message = errorMessages.length > 0 
          ? `Successfully processed ${successCount} photo(s).\n\nErrors:\n${errorMessages.join('\n')}`
          : `Successfully removed background from ${successCount} photo(s)! 🎉`;
          
        // Toggle buttons using BackgroundToggleService: Enable Restore BG, Disable Remove BG
        const toggleResult = BackgroundToggleService.onBackgroundRemovalSuccess({
          processedCount: successCount,
          processedImages: processedResults.filter(r => r.success)
        });
        
        // Force check service state
        setTimeout(() => {
          const serviceState = BackgroundToggleService.getCurrentState();
        }, 200);
          
        Alert.alert(
          'Background Removal Complete',
          message,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        throw new Error('All images failed to process:\n' + errorMessages.join('\n'));
      }
      
    } catch (error) {
      
      // Handle failure with BackgroundToggleService
      const failureResult = BackgroundToggleService.onBackgroundRemovalFailure(error);
      
      Alert.alert(
        'Background Removal Failed',
        error.message || 'An unexpected error occurred during background removal.',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Check Server', 
            onPress: async () => {
              const config = backgroundRemovalService.getConfig();
              Alert.alert(
                'Server Configuration',
                `Server URL: ${config.serverUrl}\nTimeout: ${config.timeout}ms`,
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } finally {
      setIsRemovingBackground(false);
      setBackgroundRemovalProgress(0);
      setBackgroundRemovalStatus('');
    }
  };

  // Cache management functions
  const clearCachedImage = (photoNumber) => {
    if (photoNumber === 1) {
      setCachedBgRemovedPhoto1(null);
      setTrackedPhoto1Uri(null);
    } else if (photoNumber === 2) {
      setCachedBgRemovedPhoto2(null);
      setTrackedPhoto2Uri(null);
    }
  };

  const clearAllCachedImages = () => {
    setCachedBgRemovedPhoto1(null);
    setCachedBgRemovedPhoto2(null);
    setTrackedPhoto1Uri(null);
    setTrackedPhoto2Uri(null);
  };

  // Check if photos have changed and clear cache if needed
  React.useEffect(() => {
    // Check Photo 1 (skip cache clearing for default profile image)
    if (photo1Uri && photo1Uri !== 'default_profile_image' && photo1Uri !== trackedPhoto1Uri && 
        !(typeof photo1Uri === 'string' && photo1Uri.includes('bg_removed'))) {
      clearCachedImage(1);
      setTrackedPhoto1Uri(photo1Uri);
    }
    
    // Check Photo 2
    if (photo2Uri && photo2Uri !== trackedPhoto2Uri && 
        !(typeof photo2Uri === 'string' && photo2Uri.includes('bg_removed'))) {
      clearCachedImage(2);
      setTrackedPhoto2Uri(photo2Uri);
    }
  }, [photo1Uri, photo2Uri, trackedPhoto1Uri, trackedPhoto2Uri]);

  // Debug: Log cache status
  React.useEffect(() => {
  }, [cachedBgRemovedPhoto1, cachedBgRemovedPhoto2, trackedPhoto1Uri, trackedPhoto2Uri]);
  
  // Ensure Remove BG is enabled whenever any container has a non-bg-removed image
  React.useEffect(() => {
    const isEligible = (uri) => !!uri && uri !== 'default_profile_image' && !(typeof uri === 'string' && uri.includes('bg_removed'));
    const hasStaticEligible = isEligible(photo1Uri) || isEligible(photo2Uri);
    const hasDynamicEligible = Array.isArray(photoElements) && photoElements.some(el => isEligible(el?.uri));
    const hasAnyEligible = hasStaticEligible || hasDynamicEligible;

    if (hasAnyEligible && !removeBgEnabled) {
      BackgroundToggleService.enableRemoveBackground();
    }
  }, [photo1Uri, photo2Uri, photoElements, removeBgEnabled]);

  // Handle Restore Background (With BG) button press
  const handleRestoreBackground = async () => {
    try {
      
      const photo1IsBgRemoved = photo1Uri && typeof photo1Uri === 'string' && photo1Uri.includes('bg_removed');
      const photo2IsBgRemoved = photo2Uri && typeof photo2Uri === 'string' && photo2Uri.includes('bg_removed');
      
      // Check if current photo1 is original and we have a processed version available
      const photo1IsOriginalWithProcessed = profileImageOriginal && profileImageProcessed &&
                                           photo1Uri === (typeof profileImageOriginal === 'string' ? profileImageOriginal : profileImageOriginal.uri);
      
      
      // NEW RESTORATION LOGIC: Handle both workflows
      let restorationActions = [];
      
      // Scenario 1: Photo1 is bg-removed, restore to original
      if (photo1IsBgRemoved && persistentOriginalPhoto1Uri) {
        restorationActions.push({
          type: 'restore_to_original',
          photoNumber: 1,
          currentUri: photo1Uri,
          restoreToUri: persistentOriginalPhoto1Uri,
          description: 'Restore photo1 from bg-removed to original'
        });
      }
      
      // Scenario 2: Photo1 is original and we have processed version, restore to processed
      else if (photo1IsOriginalWithProcessed) {
        const processedUri = typeof profileImageProcessed === 'string' 
          ? profileImageProcessed 
          : profileImageProcessed.uri;
        
        restorationActions.push({
          type: 'restore_to_processed',
          photoNumber: 1,
          currentUri: photo1Uri,
          restoreToUri: processedUri,
          description: 'Restore photo1 from original to processed (bg-removed)'
        });
      }
      
      // Scenario 3: Photo2 is bg-removed, restore to original
      if (photo2IsBgRemoved && persistentOriginalPhoto2Uri) {
        restorationActions.push({
          type: 'restore_to_original',
          photoNumber: 2,
          currentUri: photo2Uri,
          restoreToUri: persistentOriginalPhoto2Uri,
          description: 'Restore photo2 from bg-removed to original'
        });
      }
      
      
      if (restorationActions.length === 0) {
        Alert.alert(
          'Nothing to Restore',
          'There are no images that can be restored. Please check your image states.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Execute restoration actions
      let restoredCount = 0;
      
      for (const action of restorationActions) {
        
        if (action.photoNumber === 1) {
          dispatchPhotoState({ type: 'SET_PHOTO_1', uri: action.restoreToUri });
          
          if (action.type === 'restore_to_original') {
            // Restoring bg-removed back to original
            setOriginalPhoto1Uri(action.restoreToUri);
            // Keep persistent backup for future use
          } else if (action.type === 'restore_to_processed') {
            // Switching from original to processed - set up for future restoration
            setOriginalPhoto1Uri(action.currentUri); // Current becomes the "original" to restore to
            setPersistentOriginalPhoto1Uri(action.currentUri);
          }
        } else if (action.photoNumber === 2) {
          dispatchPhotoState({ type: 'SET_PHOTO_2', uri: action.restoreToUri });
          
          if (action.type === 'restore_to_original') {
            // Restoring bg-removed back to original
            setOriginalPhoto2Uri(action.restoreToUri);
            // Keep persistent backup for future use
          }
        }
        
        restoredCount++;
      }
      
      if (restoredCount > 0) {
        // Update background removal flag based on restoration type
        const hasProcessedActions = restorationActions.some(action => action.type === 'restore_to_processed');
        const hasOriginalActions = restorationActions.some(action => action.type === 'restore_to_original');
        
        // Use BackgroundToggleService for button state management
        let toggleResult;
        if (hasProcessedActions && !hasOriginalActions) {
          // Restored to processed (bg-removed) images - enable restore button
          toggleResult = BackgroundToggleService.enableRestoreBackground();
        } else {
          // Restored to original images - enable remove button
          toggleResult = BackgroundToggleService.onBackgroundRestoreSuccess({
            restoredCount,
            restorationActions,
            actionTypes: restorationActions.map(a => a.type)
          });
        }
        
        const actionDescriptions = restorationActions.map(action => 
          action.type === 'restore_to_processed' 
            ? `Photo ${action.photoNumber}: Original → Background Removed`
            : `Photo ${action.photoNumber}: Background Removed → Original`
        ).join('\n');
        
        Alert.alert(
          'Restoration Complete! 🌅',
          `Successfully restored ${restoredCount} photo(s):\n\n${actionDescriptions}\n\nYou can continue using Remove BG and With BG repeatedly.`,
          [{ text: 'Great!', style: 'default' }]
        );
      }
      
    } catch (error) {
      
      // Handle failure with BackgroundToggleService
      const failureResult = BackgroundToggleService.onBackgroundRestoreFailure(error);
      
      Alert.alert(
        'Restore Failed',
        'Failed to restore original backgrounds. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const checkAndRequestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // First check if we already have permissions
        const hasReadPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        
        if (hasReadPermission) {
          return true;
        }

        // Request permission if we don't have it
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Photo Access Permission",
            message: "App needs access to your photos to create templates",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        // If there's an error checking permissions, we'll try to proceed anyway
        return true;
      }
    }
    return true;
  };

  const openGallery = async (photoNumber) => {
    try {
      setError(null);
      const picked = await ImagePickerService.pickImageFromGallery();
      if (!picked || !picked.uri) {
        return;
      }
      const uri = picked.uri;
      const cropShape = 'square';
      const mySourceScreen = localMode ? 'localMode' : 'normal';
      console.log('📷 HeroScreen: Opening Crop for static photo with sourceScreen:', mySourceScreen);
      navigation.navigate('Crop', {
        uri,
        image: uri,
        sourceUri: uri,
        photoNumber,
        photoId: STATIC_PHOTO_ID,
        isDynamicPhoto: false,
        shape: cropShape,
        sourceScreen: mySourceScreen,
        onCropDone: (result) => {
          try {
            const cropped = result?.croppedUri || result?.uri || uri;
            handleCropComplete({ croppedUri: cropped, photoId: STATIC_PHOTO_ID, isDynamicPhoto: false });
          } catch (e) {
          }
        },
      });
    } catch (err) {
      setError(`Failed to open image picker: ${err.message || err}`);
    }
  };

  const openGalleryForDynamicPhoto = async (photoId) => {
    try {
      setError(null);
      const picked = await ImagePickerService.pickImageFromGallery();
      if (!picked || !picked.uri) {
        return;
      }
      const uri = picked.uri;
      const cropShape = 'square';
      const mySourceScreen = localMode ? 'localMode' : 'normal';
      console.log('📷 HeroScreen: Opening Crop for dynamic photo with sourceScreen:', mySourceScreen);
      navigation.navigate('Crop', {
        uri,
        image: uri,
        sourceUri: uri,
        photoId,
        isDynamicPhoto: true,
        shape: cropShape,
        sourceScreen: mySourceScreen,
        onCropDone: (result) => {
          try {
            const cropped = result?.croppedUri || result?.uri || uri;
            handleCropComplete(cropped, null, photoId, true);
          } catch (e) {
          }
        },
      });
    } catch (err) {
      setError(`Failed to open image picker: ${err.message || err}`);
    }
  };

  // Track start position for pan gestures
  const startPan1X = React.useRef(0);
  const startPan1Y = React.useRef(0);
  
  const panResponder1 = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: (evt, gestureState) => {
        startPan1X.current = pan1X.value;
        startPan1Y.current = pan1Y.value;
        try { isDraggingRef.current = true; } catch (e) {}
      },
      onPanResponderMove: (evt, gestureState) => {
        const padding = BOUND_PADDING;
        const maxX = containerWidth - photo1Size - padding;
        const maxY = containerHeight - photo1Size - padding;
        const minX = padding;
        const minY = padding;
        // Mark that user has manually moved the static photo
        try { hasUserMovedStaticPhotoRef.current = true; } catch (e) {}
        
        const newX = Math.max(minX, Math.min(maxX, startPan1X.current + gestureState.dx));
        const newY = Math.max(minY, Math.min(maxY, startPan1Y.current + gestureState.dy));
        
        pan1X.value = newX;
        pan1Y.value = newY;
      },
      onPanResponderRelease: () => {
        try { isDraggingRef.current = false; } catch (e) {}
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        try { isDraggingRef.current = false; } catch (e) {}
      },
    })
  ).current;
  
  // Resize PanResponder for static photo (top-left handle)
  const initialPhoto1Resize = useRef({ size: photo1Size, cx: 0, cy: 0 });
  const resizePanResponder1 = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        const sizeAtStart = photo1Size;
        const startX = typeof pan1X?.value === 'number' ? pan1X.value : 0;
        const startY = typeof pan1Y?.value === 'number' ? pan1Y.value : 0;
        const cx = startX + sizeAtStart / 2;
        const cy = startY + sizeAtStart / 2;
        initialPhoto1Resize.current = { size: sizeAtStart, cx, cy };
      },
      onPanResponderMove: (evt, gestureState) => {
        // Use average of dx,dy to scale square size smoothly on diagonal drags
        const delta = (gestureState.dx + gestureState.dy) / 2;
        // Invert direction as requested
        let proposedSize = initialPhoto1Resize.current.size - delta;

        // Center-anchored constraints — expand/shrink equally from center on all sides
        const padding = BOUND_PADDING;
        const cx0 = initialPhoto1Resize.current.cx;
        const cy0 = initialPhoto1Resize.current.cy;

        const minHalf = minPhotoSize / 2;
        // First, clamp center so at least the minimum half can fit
        const cx = Math.max(padding + minHalf, Math.min(containerWidth - padding - minHalf, cx0));
        const cy = Math.max(padding + minHalf, Math.min(containerHeight - padding - minHalf, cy0));

        // Then compute the maximum half allowed from this bounded center
        const maxHalf = Math.min(
          maxPhotoSize / 2,
          cx - padding,                              // left edge
          cy - padding,                              // top edge
          (containerWidth - padding) - cx,           // right edge
          (containerHeight - padding) - cy           // bottom edge
        );

        const proposedHalf = proposedSize / 2;
        const clampedHalf = Math.max(minHalf, Math.min(maxHalf, proposedHalf));
        const newSize = clampedHalf * 2;

        // Compute top-left from bounded center and clamped half, then clamp to edges as a final guard
        let newX = cx - clampedHalf;
        let newY = cy - clampedHalf;
        const minX = padding;
        const minY = padding;
        const maxX = containerWidth - padding - newSize;
        const maxY = containerHeight - padding - newSize;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        // Apply size and position
        setPhoto1Size(newSize);
        if (pan1X && typeof pan1X.value === 'number') {
          pan1X.value = newX;
        }
        if (pan1Y && typeof pan1Y.value === 'number') {
          pan1Y.value = newY;
        }
      },
      onPanResponderRelease: () => {
        // Final guard: ensure within bounds based on final size and CURRENT position
        const padding = BOUND_PADDING;
        const half = photo1Size / 2;
        const currX = typeof pan1X?.value === 'number' ? pan1X.value : 0;
        const currY = typeof pan1Y?.value === 'number' ? pan1Y.value : 0;
        const cx = currX + half;
        const cy = currY + half;
        const clampedCx = Math.max(padding + half, Math.min(containerWidth - padding - half, cx));
        const clampedCy = Math.max(padding + half, Math.min(containerHeight - padding - half, cy));
        const newX = clampedCx - half;
        const newY = clampedCy - half;
        if (pan1X && typeof pan1X.value === 'number') {
          pan1X.value = Math.max(padding, Math.min(containerWidth - padding - photo1Size, newX));
        }
        if (pan1Y && typeof pan1Y.value === 'number') {
          pan1Y.value = Math.max(padding, Math.min(containerHeight - padding - photo1Size, newY));
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;
  // Only one PanResponder needed now for dragging
  
  // Debug: Log PanResponder creation and function availability
  React.useEffect(() => {
  }, []);

  // Clamp position any time size or container dims change
  React.useEffect(() => {
    try { clampPhoto1PositionForSize(photo1Size); } catch (e) {}
  }, [photo1Size, containerWidth, containerHeight]);


  return (
    <>
      <View style={{ flex: 1 }}>

        {/* Top row: Category tabs (left) and Profile photo (right) */}
        {!localMode && (
        <View style={styles.topBarRow}>
          {/* Category tabs (wrap to multiple lines) */}
          <View style={styles.categoryTabsWrap}>
            {(categories || []).filter(cat => String(cat.key).toLowerCase() !== 'liked').map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryTab,
                  selectedCategory === cat.key && styles.categoryTabActive
                ]}
                onPress={() => {
                  try { lastUserSelectionRef.current = Date.now(); } catch {}
                  try { hasLoaded.current = true; } catch {}
                  setSelectedCategory(cat.key);
                  try { dispatch(setGlobalSub(cat.key)); } catch {}
                  try { setAppliedAxisForUri(null); } catch {}
                  setTimeout(() => {
                    try {
                      TemplatePreferences.setSubcategory(cat.key);
                      dispatch(saveMainSubToStorage());
                    } catch {}
                  }, 50);
                  setTimeout(() => {
                    try {
                      refreshForSelection(globalReligion || 'all', cat.key);
                    } catch {}
                  }, 200);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === cat.key && styles.categoryTabTextActive
                  ]}
                  numberOfLines={1}
                >
                  {cat.icon ? `${cat.icon} ` : ''}{cat.label || cat.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Right side: Template button + Profile photo */}
          <View style={styles.topBarRightRow}>
            {/* Simple plus icon for templates */}
            <TouchableOpacity
              style={styles.headerTemplateButton}
              onPress={handleTemplateButtonPress}
              activeOpacity={0.8}
            >
              <Text style={styles.headerTemplatePlus}>➕</Text>
            </TouchableOpacity>

            {/* Profile photo */}
            <TouchableOpacity
              onPress={async () => {
                try {
                  // Check for auth token (OTP registration uses 'authToken')
                  const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('AUTH_TOKEN');
                  if (!token) {
                    // No token, navigate to registration
                    navigation.navigate('RegisterWithOTP');
                    return;
                  }
                } catch (e) {
                  // Error getting token, navigate to registration
                  navigation.navigate('RegisterWithOTP');
                  return;
                }
                // User is authenticated, go to profile
                navigation.navigate('ProfileScreen');
              }}
              style={styles.profilePhotoContainerUnderHeader}
              activeOpacity={0.8}
            >
              <Image
                source={(() => {
                  try {
                    if (profilePictureUri && !isDefaultPicture) {
                      return { uri: profilePictureUri };
                    }
                  } catch {}
                  return getDefaultProfileImage();
                })()}
                style={styles.profilePhotoUnderHeader}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
        </View>
        )}

        {!localMode && isSaving && (
          <View style={styles.downloadSpinnerRow}>
            <Text style={styles.downloadingText}>Downloading</Text>
            <ActivityIndicator size="small" color={COLORS.primary || '#ffffff'} />
          </View>
        )}

        {/* TEMPORARY: Debug component for testing button toggle */}
        {/* <BackgroundToggleDebugger /> */}

      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} style={styles.errorDismiss}>
            <Text style={styles.errorDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* Background Removal Loading Overlay */}
      {isRemovingBackground && (
        <View style={styles.backgroundRemovalOverlay} pointerEvents="box-none">
          <View style={styles.backgroundRemovalBackdrop} />
          <View style={styles.backgroundRemovalModal} pointerEvents="auto">
            <View style={styles.backgroundRemovalHeader}>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${Math.max(0, Math.min(100, (backgroundRemovalProgress || 0) * 100)).toFixed(1)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.backgroundRemovalStatus}>
                {backgroundRemovalStatus || `Processing... ${(Math.max(0, Math.min(100, (backgroundRemovalProgress || 0) * 100))).toFixed(1)}%`}
              </Text>
              <TouchableOpacity
                style={styles.cancelProcessingButton}
                onPress={() => {
                  try {
                    backgroundRemovalService.cancel();
                  } catch (e) {}
                  setIsRemovingBackground(false);
                  setBackgroundRemovalStatus('Cancelled by user');
                  setBackgroundRemovalProgress(0);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelProcessingButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.loadingAnimation}>
              <Text style={styles.loadingEmoji}>🤖</Text>
              <Text style={styles.loadingText}>AI is removing backgrounds...</Text>
            </View>
            
            <View style={styles.batchProgressContainer}>
              <Text style={styles.batchProgressText}>
                Progress: {(backgroundRemovalProgress * 100).toFixed(1)}%
              </Text>
              <View style={styles.batchProgressBar}>
                <View 
                  style={[
                    styles.batchProgressFill,
                    { width: `${(backgroundRemovalProgress * 100)}%` }
                  ]}
                />
              </View>
              <Text style={styles.sequentialInfoText}>
                Using batched parallelism for faster processing
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Text Customization Modal */}
      <Modal
        visible={showTextCustomization}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTextCustomization(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.textCustomizationModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowTextCustomization(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              data={[{ key: 'text-customization' }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <>
                  {/* Resize Instructions */}
                  <View style={styles.instructionSection}>
                    <Text style={styles.instructionText}>
                      📌 Tap and drag the green handle (⤢) at the bottom-right corner to resize the text container.
                    </Text>
                  </View>
                  {/* Text Colors */}
                  <View style={styles.customizationSection}>
                    <Text style={styles.sectionTitle}>🎨 Text Color</Text>
                    <View style={styles.colorGrid}>
                      {TEXT_COLORS.map((color, index) => {
                        const selectedText = textElements.find(t => t.id === selectedTextId);
                        const isSelected = selectedText?.color === color;
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.colorButton,
                              { backgroundColor: color },
                              isSelected && styles.selectedColorButton
                            ]}
                            onPress={() => updateTextStyle(selectedTextId, { color })}
                          >
                            {isSelected && <Text style={styles.colorCheckmark}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Font Weight */}
                  <View style={styles.customizationSection}>
                    <Text style={styles.sectionTitle}>💪 Font Weight</Text>
                    <View style={styles.weightGrid}>
                      {FONT_WEIGHTS.map((weight) => {
                        const selectedText = textElements.find(t => t.id === selectedTextId);
                        const isSelected = selectedText?.fontWeight === weight.value;
                        
                        // Create a dynamic style to avoid Reanimated warnings with inline styles
                        const dynamicTextStyle = {
                          ...styles.weightButtonText,
                          fontWeight: weight.value,
                          ...(isSelected ? styles.selectedWeightButtonText : {})
                        };
                        
                        return (
                          <TouchableOpacity
                            key={weight.value}
                            style={[
                              styles.weightButton,
                              isSelected && styles.selectedWeightButton
                            ]}
                            onPress={() => updateTextStyle(selectedTextId, { fontWeight: weight.value })}
                          >
                            <Text style={dynamicTextStyle}>
                              {weight.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}
            />
          </View>
        </View>
      </Modal>


      <View style={styles.imageContainer}>
        <FlingGestureHandler
          direction={Directions.UP}
onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === State.END) {
                      if (isDraggingRef.current) { return; }
                      onSwipeUp();
                    }
                  }}
        >
          <FlingGestureHandler
            direction={Directions.DOWN}
onHandlerStateChange={({ nativeEvent }) => {
                      if (nativeEvent.state === State.END) {
                        if (isDraggingRef.current) { return; }
                        onSwipeDown();
                      }
                    }}
          >
            <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }} style={[styles.viewShotContainer, { width: containerWidth, height: containerHeight }]}>
              <TouchableWithoutFeedback onPress={handleBackgroundPress}>
              <View style={[styles.imageContainerWrapper, { width: containerWidth, height: containerHeight }]} collapsable={false}>
                {/* Template reels area - FlatList for vertical scrolling */}
                    <View style={[
                      styles.imageWrapper,
                      {
                        width: containerWidth,
                        height: containerHeight,
                      }
                    ]}>
                      {reelsTemplates && reelsTemplates.length > 0 ? (
                        <FlatList
                          ref={reelsListRef}
                          data={reelsTemplates}
                          keyExtractor={(item, index) => item?.id || item?._id || `template-${index}`}
                          renderItem={({ item, index }) => (
                            <VideoTemplateItem
                              item={item}
                              index={index}
                              containerWidth={containerWidth}
                              containerHeight={containerHeight}
                              isCurrentVideo={index === currentReelIndex}
                              hideVideoForCapture={isOverlayCapture}
                              captureBgColor={isOverlayCapture ? '#00FF00' : 'transparent'}
                              onCached={(uri) => { try { if (index === currentReelIndex) setCurrentVideoLocalUri(uri); } catch (e) {} }}
                            />
                          )}
                          pagingEnabled
                          showsVerticalScrollIndicator={false}
                          snapToAlignment="start"
                          decelerationRate="fast"
                          viewabilityConfig={viewabilityConfig}
                          onViewableItemsChanged={onViewableItemsChanged}
                          getItemLayout={(data, index) => ({
                            length: containerHeight,
                            offset: containerHeight * index,
                            index,
                          })}
                          initialScrollIndex={currentReelIndex}
                          initialNumToRender={5}
                          maxToRenderPerBatch={3}
                          windowSize={11}
                          removeClippedSubviews={false}
                          onScrollToIndexFailed={(info) => {
                            console.warn('🚨 Scroll to index failed:', info);
                            const wait = new Promise(resolve => setTimeout(resolve, 500));
                            wait.then(() => {
                              reelsListRef.current?.scrollToIndex({ index: info.index, animated: false });
                            });
                          }}
                          onScroll={(event) => {
                            const yOffset = event.nativeEvent.contentOffset.y;
                            const currentIndex = Math.round(yOffset / containerHeight);
                            console.log('📜 FlatList scroll event:', {
                              yOffset: yOffset.toFixed(2),
                              calculatedIndex: currentIndex,
                              containerHeight,
                              totalItems: reelsTemplates.length,
                              scrollPercentage: ((yOffset / (containerHeight * reelsTemplates.length)) * 100).toFixed(1) + '%'
                            });
                          }}
                          scrollEventThrottle={16}
                        />
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#0e0e0e', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', textAlign: 'center' }}>
                            {isReelsLoading || isHeroLoading ? 'Loading templates...' : 'No templates to display'}
                          </Text>
                        </View>
                      )}
                    </View>
              
              {/* Top banner overlay */}
              {bannerEnabled && bannerUri && (
                <View 
                  style={[
                    styles.bannerOverlay, 
                    { 
                      width: containerWidth,
                      height: containerWidth / 5
                    }
                  ]}
                  pointerEvents="auto"
                >
                  {isBannerFocused && (
                    <TouchableOpacity
                      style={styles.bannerCloseButton}
                      onPress={() => {
                        try {
                          setBannerUri(null);
                          setBannerEnabled(false);
                          setIsBannerFocused(false);
                          // Clear stored banner so it doesn't restore on remount
                          cropResultManager.clearStoredBanner(localMode ? 'localMode' : 'normal');
                        } catch (e) {}
                      }}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Remove banner"
                    >
                      <Text style={styles.bannerCloseButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableWithoutFeedback onPress={() => setIsBannerFocused(true)}>
                    <View style={{ width: '100%', height: '100%' }}>
                      <Image 
                        source={{ uri: bannerUri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                        onError={(e) => console.warn('Banner image failed to load:', e?.nativeEvent?.error)}
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              )}

              {/* Top-right action icons: Share and Download (hidden during capture) */}
              {!isCapturing && (
              <View style={styles.topRightActions} pointerEvents="box-none">
                <TouchableOpacity 
                  style={styles.actionIconButton}
                  onPress={shareTemplate}
                  disabled={isSharing}
                  activeOpacity={0.85}
                  accessibilityLabel="Share template"
                >
                  <Feather name="share-2" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionIconButton}
                  onPress={saveTemplate}
                  disabled={isSaving}
                  activeOpacity={0.85}
                  accessibilityLabel="Download template"
                >
                  <AntDesign name="download" size={20} color="#fff" />
                </TouchableOpacity>

                {/* Banner on/off or navigate to "Your Banners" */}
                <TouchableOpacity 
                  style={styles.actionIconButton}
                  onPress={async () => {
                    try {
                      if (bannerUri) {
                        // We already have a banner selected → just toggle visibility
                        setIsBannerFocused(false);
                        setBannerEnabled(prev => !prev);
                      } else {
                        // No banner selected → go to Your Banners screen
                        // Pass localMode so banner result comes back to correct HeroScreen type
                        console.log('🚀 HeroScreen: Navigating to UserBanners with localMode:', localMode);
                        cropResultManager.setSourceScreen(localMode ? 'localMode' : 'normal');
                        navigation.navigate('UserBanners', { sourceScreen: localMode ? 'localMode' : 'normal' });
                      }
                    } catch (e) {}
                  }}
                  activeOpacity={0.85}
                  accessibilityLabel={
                    bannerUri
                      ? (bannerEnabled ? "Hide banner" : "Show banner")
                      : "Choose banner"
                  }
                >
                  <Feather name="tag" size={20} color="#fff" />
                </TouchableOpacity>
                {/* Menu toggle icon */}
                <TouchableOpacity
                  style={styles.actionIconButton}
                  onPress={() => setMenuVisible(v => !v)}
                  activeOpacity={0.85}
                  accessibilityLabel="Toggle menu"
                >
                  <Text style={styles.actionIconText}>☰</Text>
                </TouchableOpacity>
              </View>
              )}
              
              {/* Banner choice dialog */}
              {showBannerDialog && (
                <Modal
                  animationType="fade"
                  transparent
                  visible={showBannerDialog}
                  onRequestClose={() => setShowBannerDialog(false)}
                >
                  <TouchableWithoutFeedback onPress={() => setShowBannerDialog(false)}>
                    <View style={styles.bannerDialogOverlay}>
                      <TouchableWithoutFeedback>
                        <View style={styles.bannerDialogContent}>
                          <Text style={styles.bannerDialogTitle}>Banner</Text>
                          <TouchableOpacity
                            style={styles.bannerDialogButton}
                            onPress={() => {
                              try {
                                setShowBannerDialog(false);
                                // Pass localMode so banner result comes back to correct HeroScreen type
                                console.log('🚀 HeroScreen: Navigating to BannerCreate with localMode:', localMode);
                                cropResultManager.setSourceScreen(localMode ? 'localMode' : 'normal');
                                navigation.navigate('BannerCreate', { ratio: '5:1', sourceScreen: localMode ? 'localMode' : 'normal' });
                              } catch {}
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.bannerDialogButtonText}>Create Banner</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.bannerDialogButton}
                            onPress={async () => {
                              try {
                                setShowBannerDialog(false);
                                const picked = await ImagePickerService.pickImageFromGallery();
                                if (!picked || !picked.uri) return;
                                // Pass localMode so banner result comes back to correct HeroScreen type
                                console.log('🚀 HeroScreen: Navigating to BannerCrop with localMode:', localMode);
                                cropResultManager.setSourceScreen(localMode ? 'localMode' : 'normal');
                                navigation.navigate('BannerCrop', { uri: picked.uri, photoNumber: 'banner', ratio: '5:1', sourceScreen: localMode ? 'localMode' : 'normal' });
                              } catch {}
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.bannerDialogButtonText}>Add Banner</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.bannerDialogButton}
                            onPress={() => {
                              try {
                                setShowBannerDialog(false);
                                // Pass localMode so banner result comes back to correct HeroScreen type
                                console.log('🚀 HeroScreen: Navigating to UserBanners (dialog) with localMode:', localMode);
                                cropResultManager.setSourceScreen(localMode ? 'localMode' : 'normal');
                                navigation.navigate('UserBanners', { sourceScreen: localMode ? 'localMode' : 'normal' });
                              } catch {}
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.bannerDialogButtonText}>Use Your Banners</Text>
                          </TouchableOpacity>

                          {bannerEnabled && bannerUri ? (
                          <TouchableOpacity
                            style={[styles.bannerDialogButton, styles.bannerDialogButtonDanger]}
                            onPress={() => {
                              try {
                                setBannerUri(null);
                                setBannerEnabled(false);
                                setIsBannerFocused(false);
                                setShowBannerDialog(false);
                                // Clear stored banner so it doesn't restore on remount
                                cropResultManager.clearStoredBanner(localMode ? 'localMode' : 'normal');
                              } catch {}
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.bannerDialogButtonText, styles.bannerDialogButtonDangerText]}>Remove Banner</Text>
                          </TouchableOpacity>
                          ) : null}
                        </View>
                      </TouchableWithoutFeedback>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
              )}

              {/* Photo Container Clipping Area - moved inside imageContainerWrapper */}
              <View style={[
                styles.photoContainerClipper,
                {
                  width: containerWidth,
                  height: containerHeight,
                }
]} collapsable={false} pointerEvents="box-none">
            {isPhoto1Visible && (
            <Reanimated.View
              style={[
                styles.firstPhoto,
                animatedStyle1,
                {
                  width: photo1Size,
                  height: photo1Size,
                  borderRadius: shape === 'circle' ? photo1Size / 2 : 8,
                },
                isPhoto1Focused && styles.focusedPhotoContainer,
                // Simplified styles without shadows
                {
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                  borderColor: 'transparent',
                  overflow: 'hidden', // Changed to hidden for proper clipping
                  opacity: 1,
                },
              ]}
              {...panResponder1.panHandlers}
            >
            {/* Close button for static photo (visible only when focused) */}
            {isPhoto1Focused && (
              <>
                {/* Resize handle on top-left: tap to increase size, long-press to decrease */}
                <View
                  style={styles.staticPhotoResize}
                  {...resizePanResponder1.panHandlers}
                >
                  <Text style={styles.staticPhotoResizeText}>⤢</Text>
                </View>

                {/* Close button on top-right */}
                <TouchableOpacity
                  style={styles.staticPhotoClose}
                  onPress={() => {
                    try { dispatchPhotoState({ type: 'CLEAR_PHOTO_1' }); } catch (e) {}
                    setIsPhoto1Visible(false);
                    setIsPhoto1Focused(false);
                    try { setFocusedPhotoId(null); } catch (e) {}
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.staticPhotoCloseText}>✕</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Tap overlay to handle focus on first tap and open gallery on second tap */}
            {/* Image content wrapped in TouchableOpacity for tap handling */}
            {(() => {
              const toSource = (u) => {
                try {
                  if (!u || u === 'default_profile_image') return getDefaultProfileImage();
                  if (typeof u === 'string') return { uri: u };
                  if (typeof u === 'object' && typeof u.uri === 'string') return { uri: u.uri };
                  return getDefaultProfileImage();
                } catch (e) {
                  return getDefaultProfileImage();
                }
              };
              const imageSource = toSource(photo1Uri);
              const isBgRemoved = (typeof photo1Uri === 'string' && photo1Uri.includes('bg_removed')) ||
                                  (photo1Uri && typeof photo1Uri === 'object' && typeof photo1Uri.uri === 'string' && photo1Uri.uri.includes('bg_removed'));
              const resizeMode = isBgRemoved ? 'contain' : 'cover';

              const sharedImageStyle = [
                styles.photoImage,
                {
                  borderRadius: shape === 'circle' ? photo1Size / 2 : 8,
                  backgroundColor: 'transparent',
                },
              ];

              return (
                <TouchableOpacity
                  style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1 }}
                  activeOpacity={0.9}
                  onPress={() => {
                    // Tap behavior: focus first, then open gallery when focused
                    if (isPhoto1Focused) {
                      handlePhotoContainerPress(1);
                    } else {
                      setIsPhoto1Focused(true);
                    }
                  }}
                >
                  <View style={[styles.photoImageMask, { borderRadius: shape === 'circle' ? photo1Size / 2 : 8 }]}
                  >
                    <Image
                      key={typeof photo1Uri === 'string' ? photo1Uri : (photo1Uri && typeof photo1Uri === 'object' && photo1Uri.uri ? photo1Uri.uri : 'default_profile_image')}
                      source={imageSource}
                      style={sharedImageStyle}
                      resizeMode={resizeMode}
                    />
                  </View>
                </TouchableOpacity>
              );
            })()}
            
            {/* Removed selection UI - keeping it simple */}
          </Reanimated.View>
          )}
          
          {/* Second photo container removed - only one photo container by default now */}
          </View>

          {/* Unfocus overlay - captures background taps when any container is focused */}
          {/* IMPORTANT: Must be rendered BEFORE text elements to not block keyboard */}
          {(focusedTextId || focusedPhotoId || isPhoto1Focused || isBannerFocused) && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: containerWidth,
                height: containerHeight,
                zIndex: 1,
              }}
              activeOpacity={1}
              onPress={handleBackgroundPress}
            />
          )}

          {/* Draggable Text Elements - Positioned within image container for seamless overlay */}
          <View 
            style={[styles.textElementsContainer, { width: containerWidth, height: containerHeight }]}
            pointerEvents="box-none"
          >
            {textElements.map(textElement => {
              return (
              <DraggableText
                key={textElement.id}
                textElement={{
                  ...textElement,
                  rotation: textRotations[textElement.id] || 0
                }}
                onTextChange={updateTextContent}
                onPositionChange={updateTextPosition}
                onSizeChange={updateTextSize}
                onDelete={deleteTextElement}
                onRotate={handleTextRotation}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                isFocused={focusedTextId === textElement.id}
                onFocus={(textId) => {
                  handleTextFocus(textId);
                  setSelectedTextId(textId);
                }}
                onUnfocus={handleTextUnfocus}
                onStylePress={(textId) => {
                  setSelectedTextId(textId);
                  setShowTextCustomization(true);
                }}
                onDragStart={() => { try { isDraggingRef.current = true; } catch (e) {} }}
                onDragEnd={() => { try { isDraggingRef.current = false; } catch (e) {} }}
              />
              );
            })}
          </View>

          {/* Dynamic Photo Elements - Positioned within image container */}
          <View style={[styles.photoElementsContainer, { width: containerWidth, height: containerHeight }]}>
            {photoElements.map(photoElement => {
              const toSource = (u) => {
                try {
                  if (!u || u === 'default_profile_image') return getDefaultProfileImage();
                  if (typeof u === 'string') return { uri: u };
                  if (typeof u === 'object' && typeof u.uri === 'string') return { uri: u.uri };
                  return getDefaultProfileImage();
                } catch (e) {
                  return getDefaultProfileImage();
                }
              };
              
              const imageSource = toSource(photoElement.uri);
              const isBgRemoved = (typeof photoElement.uri === 'string' && photoElement.uri.includes('bg_removed'));
              const resizeMode = isBgRemoved ? 'contain' : 'cover';
              const isFocused = focusedPhotoId === photoElement.id;
              
              return (
                <DynamicPhotoElement
                  key={photoElement.id}
                  id={photoElement.id}
                  uri={photoElement.uri}
                  x={photoElement.x}
                  y={photoElement.y}
                  size={photoElement.size}
                  shape={photoElement.shape}
                  focused={isFocused}
                  onFocus={() => handlePhotoFocus(photoElement.id)}
                  onPress={() => handlePhotoElementPress(photoElement.id)}
                  onDelete={() => deletePhotoElement(photoElement.id)}
                  onUpdatePosition={(id, newX, newY) => updatePhotoPosition(id, newX, newY)}
                  onUpdateSize={(id, newSize) => updatePhotoSize(id, newSize)}
                  onDragStart={() => { try { isDraggingRef.current = true; } catch (e) {} }}
                  onDragEnd={() => { try { isDraggingRef.current = false; } catch (e) {} }}
                  containerWidth={containerWidth}
                  containerHeight={containerHeight}
                  minSize={minPhotoSize}
                  maxSize={maxPhotoSize}
                />
              );
            })}
          </View>
          </View>
          </TouchableWithoutFeedback>
        </ViewShot>
          </FlingGestureHandler>
        </FlingGestureHandler>
      </View>

        {menuVisible && (
        <View style={styles.menuBar}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.menuScrollView}
              keyboardShouldPersistTaps="handled"
              data={[{ key: 'menu' }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <View style={styles.menuRowContent}>
                  <ShapeDropdownFixed 
                    selectedShape={shape}
                    onShapeChange={(newShape) => {

                    
                      
                      setShape(newShape);
                      
                      // Log what the new border radius should be
                    }}
                  />

                  <TouchableOpacity 
                    style={[
                      styles.removeBgButton,
                      (isRemovingBackground || !removeBgEnabled) && styles.removeBgButtonDisabled
                    ]}
                    onPress={() => {
                      if (removeBgEnabled && !isRemovingBackground) {
                        handleRemoveBackground();
                      } else {
                      }
                    }}
                    disabled={isRemovingBackground || !removeBgEnabled}
                  >
                    <View style={styles.menuIconCircle}>
                      {isRemovingBackground ? (
                        <ResetSvgIcon color="#999" size={22} />
                      ) : (
                        <WandSvgIcon color={(isRemovingBackground || !removeBgEnabled) ? '#999' : '#000'} size={22} />
                      )}
                    </View>
                    <Text style={[
                      styles.menuLabelText,
                      (isRemovingBackground || !removeBgEnabled) && styles.removeBgButtonTextDisabled
                    ]} numberOfLines={1}>
                      {isRemovingBackground ? 'Removing...' :
                      (!removeBgEnabled ? 'Rem BG' : 'Rem BG')}
                    </Text>
                  </TouchableOpacity>


                  {/* Banner button: open dialog to create/use/remove banners */}
                  <TouchableOpacity 
                    style={styles.bannerButton}
                    disabled={false}
                    onPress={() => {
                      try { setShowBannerDialog(true); } catch (e) {}
                    }}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    delayPressIn={0}
                  >
                    <View style={styles.menuIconCircle}>
                      <BannerSvgIcon color="#000" size={22} />
                    </View>
                    <Text style={styles.menuLabelText} numberOfLines={1}>Banner</Text>
                  </TouchableOpacity>

                  {/* Text / Photo / Reset */}
                  <TouchableOpacity 
                    style={styles.textButton}
                    onPress={() => {
                      try {
                        addTextElement();
                      } catch (error) {
                      }
                    }}
                  >
                    <View style={styles.menuIconCircle}>
                      <TextSvgIcon color="#000" size={22} />
                    </View>
                    <Text style={styles.menuLabelText} numberOfLines={1}>Text</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.photoButton}
                    onPress={() => {
                      try {
                        addPhotoElement();
                      } catch (error) {
                      }
                    }}
                  >
                    <View style={styles.menuIconCircle}>
                      <PhotoSvgIcon color="#000" size={22} />
                    </View>
                    <Text style={styles.menuLabelText} numberOfLines={1}>Photo</Text>
                  </TouchableOpacity>

                </View>
              )}
            />
        </View>
        )}


      </View>

    {isHeroLoading && (
      <View style={styles.processingOverlay}>
        <View style={styles.processingContent}>
          <Text style={styles.processingTitle}>Loading templates...</Text>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </View>
    )}

    {/* Custom Alert */}
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
    />
    </>
  );
};

export default HeroScreen;

const styles = StyleSheet.create({
  profilePhotoContainerUnderHeader: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: COLORS.primary || '#8B5CF6',
    overflow: 'hidden',
    alignSelf: 'flex-end',
    marginRight: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 3,
    shadowColor: COLORS.primary || '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  profilePhotoUnderHeader: {
    width: '100%',
    height: '100%',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topBarRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTemplateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTemplatePlus: {
    fontSize: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  headerTemplateIconCircle: {
    // kept for backward compatibility (no longer used)
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  headerTemplateLabel: {
    // kept for backward compatibility (no longer used)
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  downloadSpinnerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 16,
    paddingBottom: 4,
  },
  downloadingText: {
    color: COLORS.primary || '#5d1e99',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  categoryTabsContainer: {
    paddingRight: 12,
  },
  categoryTabsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 8,
  },
  categoryTab: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    marginRight: 6,
    marginBottom: 6,
  },
  categoryTabActive: {
    backgroundColor: '#4C1D95',
  },
  categoryTabText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 11,
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContent: {
    width: '80%',
    backgroundColor: '#333333',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  processingTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#555555',
    borderRadius: 5,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 10,
  },
  processingStatus: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 15,
  },
  processingIndicator: {
    marginTop: 10,
  },
  textElementsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10, // Ensure text elements appear above photos and template
    pointerEvents: 'box-none', // Allow touches to pass through to underlying elements when not touching text
  },
  menuBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingBottom: 8,
    zIndex: 300,
    elevation: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    marginBottom: 32, // lift menu bar above system navigation
  },
  menuScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    minWidth: '100%',
    backgroundColor: 'transparent',
  },
  menuRows: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  menuRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    columnGap: 0,
    backgroundColor: 'transparent',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
    marginBottom: 2,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  menuIconShrink: {
    transform: [{ scale: 0.9 }],
  },
  menuIconText: {
    textAlign: 'center',
    textAlignVertical: 'center', // Android
    includeFontPadding: false, // Android: remove extra top/bottom padding
  },
  menuLabelText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14, // Increased for better readability in menu bar
    textAlign: 'center',
    flexWrap: 'nowrap',
    lineHeight: 16,
    minHeight: 22,
    marginTop: 0,
    width: '100%',
  },
  menuIconGlyph: {
    fontSize: 31.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  removeBgButtonDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  removeBgButtonTextDisabled: {
    color: '#666666',
  },
  textButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
    minWidth: 80,
    width: 80,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  shareButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1976D2',
    marginHorizontal: 6,
  },
  shareButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  resetButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
    minWidth: 91,
    width: 91,
  },
  removeBgButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
    minWidth: 80,
    width: 80,
  },
  removeBgButtonIconDisabled: {
    opacity: 0.5,
  },
  withBgButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
    minWidth: 91,
    width: 91,
  },
  withBgButtonIconDisabled: {
    opacity: 0.5,
  },
  withBgButtonDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  withBgButtonTextDisabled: {
    color: '#666666',
  },
  viewShotContainer: {
    width: IMAGE_CONTAINER_WIDTH,
    height: IMAGE_CONTAINER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible', // Ensure all content is captured
    backgroundColor: 'transparent', // Ensure transparent background
  },
  errorContainer: {
    position: 'absolute',
    top: MENU_BAR_HEIGHT + 10,
    left: 20,
    right: 20,
    backgroundColor: '#ff5252',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  errorText: {
    color: '#fff',
    flex: 1,
    marginRight: 10,
    fontSize: 14,
  },
  errorDismiss: {
    padding: 5,
  },
  errorDismissText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 20,
    paddingBottom: MENU_BAR_HEIGHT + 8,
    backgroundColor: '#ffffff',
  },
  imageContainerWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: IMAGE_CONTAINER_WIDTH,
    height: IMAGE_CONTAINER_HEIGHT,
    overflow: 'visible', // Ensure photo containers are visible
    // Subtle shadow for container (cross-platform)
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  imageWrapper: {
    width: IMAGE_CONTAINER_WIDTH,
    height: IMAGE_CONTAINER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Clip the image properly
    backgroundColor: '#FFA500', // Orange background for template container
    borderRadius: 15,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  photoContainerClipper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: IMAGE_CONTAINER_WIDTH,
    height: IMAGE_CONTAINER_HEIGHT,
    overflow: 'visible', // Ensure photo containers are captured
    zIndex: 50,
  },
  firstPhoto: {
    // Size will be set dynamically using photo1Size state
    backgroundColor: 'rgba(0,0,0,0)',
    position: 'absolute',
    overflow: 'hidden', // Changed to hidden for proper clipping
    // Remove all effects for complete transparency
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    zIndex: 10,
    borderWidth: 0,
    borderColor: 'transparent',
    opacity: 1,
    backfaceVisibility: 'hidden',
  },
  // Overlay for FABs to sit on top of content and still allow underlying touches elsewhere
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  // Row container for bottom-right FABs
  fabRowContainer: {
    position: 'absolute',
    right: 16,
    bottom: MENU_BAR_HEIGHT + 16,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  // Inline style for the category filter FAB when used inside the row
  filterFabInline: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    marginRight: 12,
  },
  // Inline style for the upload FAB when used inside the row
  uploadFabInline: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  uploadFabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 28,
  },
  // Legacy single FAB (kept for reference; no longer used in JSX)
  filterFab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
    elevation: 8,
  },
  filterFabText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  filterCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#222',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  filterItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  filterItemText: {
    fontSize: 16,
    color: '#333',
  },
  filterCheck: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '700',
  },
  // Serial navigation arrows
  navArrowTop: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  navArrowBottom: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  navArrowText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },

  secondPhoto: {
    backgroundColor: 'rgba(0,0,0,0)',
    position: 'absolute',
    overflow: 'hidden', // Changed to hidden for proper clipping
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    zIndex: 10,
    borderWidth: 0,
    borderColor: 'transparent',
    opacity: 1,
    backfaceVisibility: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
    borderStyle: 'solid',
  },
  photoImageMask: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  staticPhotoClose: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  staticPhotoCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  staticPhotoResize: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  staticPhotoResizeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
    transform: [{ rotate: '90deg' }],
  },

  // Removed all softBlur styles - no longer needed
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Changed to transparent by default
    borderWidth: 0,
    borderColor: 'transparent',
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.7,
  },
  // Background Removal Loading Styles
  backgroundRemovalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent', // Changed to transparent to allow touch pass-through
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  backgroundRemovalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    pointerEvents: 'none', // Allow touches to pass through
  },
  backgroundRemovalModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    minWidth: 280,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  backgroundRemovalHeader: {
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
    minHeight: 20,
  },
  backgroundRemovalTitle: {
    fontSize: 30, // 150% increase (20 * 1.5 = 30)
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  backgroundRemovalSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  backgroundRemovalStatus: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    minHeight: 20,
  },
  loadingAnimation: {
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  // New styles for improved loading states
  removeBgButtonProcessing: {
    backgroundColor: '#FF9500',
    opacity: 0.8,
  },
  removeBgButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpinner: {
    marginRight: 8,
  },
  batchProgressContainer: {
    marginTop: 16,
    width: '100%',
  },
  cancelProcessingButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e53935',
    alignSelf: 'center',
  },
  cancelProcessingButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  batchProgressText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  batchProgressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  batchProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  sequentialInfoText: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Text Customization Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textCustomizationModal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    minHeight: 40,
  },
  modalTitle: {
    fontSize: 30, // 150% increase (20 * 1.5 = 30)
    fontWeight: '900',
    color: '#1a1a1a',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  instructionSection: {
    backgroundColor: COLORS.primaryA50,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  customizationSection: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorButton: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  colorCheckmark: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  weightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weightButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundDark,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  selectedWeightButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  weightButtonText: {
    fontSize: 13,
    color: COLORS.text,
  },
  selectedWeightButtonText: {
    color: COLORS.white,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  doneButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Photo selection and control styles
  selectionBorder: {
    position: 'absolute',
    // Position will be set dynamically based on photo size
    borderWidth: 3,
    borderColor: '#007AFF', // Same blue as text containers
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
    zIndex: 100,
  },
  rotateButton: {
    position: 'absolute',
    // Position will be set dynamically
    width: 32,
    height: 32,
    backgroundColor: '#FF9800',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rotateButtonText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 18,
  },
  resizeHandle: {
    position: 'absolute',
    // Position will be set dynamically
    width: 32,
    height: 32,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    // Now interactive for resizing
  },
  resizeHandleText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  // Photo button styles
  photoButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
    minWidth: 80,
    width: 80,
  },
  
  // Template button styles
  templateButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
    minWidth: 80,
    width: 80,
  },
  
  // Banner toggle button styles
  bannerButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
    minWidth: 80,
    width: 80,
  },
  bannerButtonActive: {
    opacity: 1,
  },
  
  // Banner overlay styles
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 60,
    opacity: 1,
  },
  bannerCloseButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  bannerCloseButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },

  // Banner choice dialog styles
  bannerDialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerDialogContent: {
    width: Math.min(320, screenWidth * 0.9),
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  bannerDialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#000000',
    textAlign: 'center',
  },
  bannerDialogButton: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bannerDialogButtonText: {
    color: '#000000',
    fontWeight: '700',
  },
  bannerDialogButtonDanger: {
    backgroundColor: '#ff0000',
    borderColor: '#ff0000',
  },
  bannerDialogButtonDangerText: {
    color: '#ffffff',
  },
  bannerText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Dynamic photo container styles
  photoElementsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 15, // Above text elements (10) but below focused states
    pointerEvents: 'box-none', // Allow touches to pass through
  },
  dynamicPhotoContainer: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'visible',
  },
  focusedPhotoContainer: {
    borderWidth: 2,
    borderColor: '#007AFF', // Blue border when focused
    borderStyle: 'solid',
  },
  dynamicPhotoTouchable: {
    width: '100%',
    height: '100%',
  },
  dynamicPhotoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  photoDeleteButton: {
    position: 'absolute',
    top: -14, // half outside vertically
    right: -14, // half outside horizontally
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 100,
    elevation: 5,
  },
fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5000,
    elevation: 50,
    // pointerEvents set on the View instance
  },
  photoDeleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 12,
  },

  // Dynamic photo resize handle
  dynamicPhotoResize: {
    position: 'absolute',
    top: -14,
    left: -14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 110,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dynamicPhotoResizeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
    transform: [{ rotate: '90deg' }],
  },
  
  // Top-right action icon styles
  topRightActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 80,
    alignItems: 'center',
  },
  actionIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37,37,37,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    marginBottom: 8,
    elevation: 0,
  },
  actionIconText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '800',
  },
});
