import React, { useState, useRef, useReducer, useLayoutEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Alert,
  PanResponder,
  Modal,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { FlingGestureHandler, Directions, State } from 'react-native-gesture-handler';
import { launchImageLibrary } from 'react-native-image-picker';
import ViewShot from 'react-native-view-shot';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNShare from 'react-native-share';
import { Svg, Path, Rect, Circle, Line } from 'react-native-svg';
import CustomHeader from '../Components/CustomHeader';
import DraggableText from '../Components/DraggableText';
import ShapeDropdownFixed from '../Components/ShapeDropdownFixed';
import { COLORS } from '../theme/colors';
import UserTemplatesService from '../services/UserTemplatesService';
import backgroundRemovalService from '../services/BackgroundRemovalService';
import ImagePickerService from '../services/ImagePickerService';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfileImage } from '../store/slices/profileSlice';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import HeroScreen from './HeroScreen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MENU_BAR_HEIGHT = 113;
const CONTAINER_PADDING = 35;

const AVAILABLE_WIDTH = screenWidth - (CONTAINER_PADDING * 2);
const AVAILABLE_HEIGHT = screenHeight - MENU_BAR_HEIGHT - (CONTAINER_PADDING * 2);
const BOUND_PADDING = 0;

const getDefaultProfileImage = () => {
  try {
    return require('../../assets/user/default_dp.png');
  } catch (error) {
    return null;
  }
};

// SVG Icons matching HeroScreen
const BannerSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 3h12a1 1 0 0 1 1 1v16l-7-3-7 3V4a1 1 0 0 1 1-1z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TextSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 6h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 6v12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const PhotoSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth={2} />
    <Circle cx="8.5" cy="10" r="1.5" fill={color} />
    <Path d="M21 16l-5.5-5.5L9 17l-3-3-4 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const WandSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 21l10-10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M14 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill={color} />
    <Path d="M18 6l.5 1 .9.5-.9.5-.5 1-.5-1-.9-.5.9-.5.5-1z" fill={color} />
  </Svg>
);

const TemplateSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M9 7h6M9 11h6M9 15h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

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
  const MIN_CONTAINER_WIDTH = 200;
  const MIN_CONTAINER_HEIGHT = 300;
  const MAX_CONTAINER_WIDTH = screenWidth * 0.9;
  const MAX_CONTAINER_HEIGHT = screenHeight * 0.8;
  
  width = Math.max(MIN_CONTAINER_WIDTH, Math.min(MAX_CONTAINER_WIDTH, width));
  height = Math.max(MIN_CONTAINER_HEIGHT, Math.min(MAX_CONTAINER_HEIGHT, height));
  return { width, height };
};

const __DEFAULT_DIMS = computeContainerDims(9 / 16);
const IMAGE_CONTAINER_WIDTH = __DEFAULT_DIMS.width;
const IMAGE_CONTAINER_HEIGHT = __DEFAULT_DIMS.height;

// Photo state reducer
const photoStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_PHOTO_1':
      return { ...state, photo1Uri: action.uri };
    case 'CLEAR_PHOTO_1':
      return { ...state, photo1Uri: null };
    default:
      return state;
  }
};

// Draggable dynamic photo element
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

  React.useEffect(() => {
    const propX = x || 0;
    const propY = y || 0;
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
          if (focused) {
            onPress && onPress(id);
          } else {
            onFocus && onFocus(id);
          }
        } else {
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
        let proposedSize = initialResizeRef.current.size - delta;

        const padding = BOUND_PADDING;
        const cx0 = initialResizeRef.current.cx;
        const cy0 = initialResizeRef.current.cy;

        const minHalf = (minSize || 60) / 2;
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
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : 8,
          borderWidth: focused ? 2 : 0,
          borderColor: focused ? COLORS.primary : 'transparent',
        },
        animatedStyle,
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1 }}
        activeOpacity={0.9}
        onPress={() => {
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
            { width: '100%', height: '100%', borderRadius: shape === 'circle' ? size / 2 : 8 },
          ]}
          resizeMode={resizeMode}
        />
      </TouchableOpacity>

      {focused && (
        <>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 30,
              height: 30,
              backgroundColor: COLORS.primary,
              borderRadius: 15,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            {...resizeResponder.panHandlers}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>⤢</Text>
          </View>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 30,
              height: 30,
              backgroundColor: '#ff0000',
              borderRadius: 15,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => onDelete && onDelete(id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>✖</Text>
          </TouchableOpacity>
        </>
      )}
    </Reanimated.View>
  );
};

const UserTemplatesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const profileImageProcessed = useSelector(selectProfileImage);
  const profilePictureUri = useSelector(state => state.profilePicture?.profilePictureUri);
  
  
  const [userTemplates, setUserTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const viewShotRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Photo state
  const [photoState, dispatchPhotoState] = useReducer(photoStateReducer, {
    photo1Uri: null,
  });
  const { photo1Uri } = photoState;
  const [photo1Size, setPhoto1Size] = useState(150);
  const [shape, setShape] = useState('square');
  const [photoElements, setPhotoElements] = useState([]);
  const [focusedPhotoId, setFocusedPhotoId] = useState(null);
  const [isPhoto1Visible, setIsPhoto1Visible] = useState(true);
  const [isPhoto1Focused, setIsPhoto1Focused] = useState(false);
  const STATIC_PHOTO_ID = 'static-photo-1';
  const [menuVisible, setMenuVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [bannerUri, setBannerUri] = useState(null);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [isBannerFocused, setIsBannerFocused] = useState(false);

  // Text state
  const [textElements, setTextElements] = useState([]);
  const [focusedTextId, setFocusedTextId] = useState(null);
  const [showTextCustomization, setShowTextCustomization] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState(null);
  
  // Background removal state
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemovalProgress, setBackgroundRemovalProgress] = useState(0);
  const [backgroundRemovalStatus, setBackgroundRemovalStatus] = useState('');
  
  // Container dimensions
  const [containerWidth, setContainerWidth] = useState(__DEFAULT_DIMS.width);
  const [containerHeight, setContainerHeight] = useState(__DEFAULT_DIMS.height);

  // Photo position using Reanimated shared values (matching HeroScreen)
  const padding = 10;
  const photo1X = Math.max(padding, containerWidth - photo1Size - padding);
  const photo1Y = Math.max(padding, containerHeight - photo1Size - padding);
  const pan1X = useSharedValue(photo1X);
  const pan1Y = useSharedValue(photo1Y);
  
  // Animated style for photo container
  const animatedStyle1 = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: pan1X.value },
        { translateY: pan1Y.value },
      ],
    };
  }, []);
  
  // Clamp photo position when size changes
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
    } catch (e) {}
  };
  
  // Track dragging state
  const hasUserMovedStaticPhotoRef = useRef(false);
  
  // Pan responder for dragging static photo
  const startPan1X = useRef(0);
  const startPan1Y = useRef(0);
  
  const panResponder1 = useRef(
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
  
  // Resize PanResponder for static photo
  const initialPhoto1Resize = useRef({ size: photo1Size, cx: 0, cy: 0 });
  const minPhotoSize = 60;
  const maxPhotoSize = 300;
  
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
        const delta = (gestureState.dx + gestureState.dy) / 2;
        let proposedSize = initialPhoto1Resize.current.size - delta;
        
        const padding = BOUND_PADDING;
        const cx0 = initialPhoto1Resize.current.cx;
        const cy0 = initialPhoto1Resize.current.cy;
        
        const minHalf = minPhotoSize / 2;
        const cx = Math.max(padding + minHalf, Math.min(containerWidth - padding - minHalf, cx0));
        const cy = Math.max(padding + minHalf, Math.min(containerHeight - padding - minHalf, cy0));
        
        const maxHalf = Math.min(
          maxPhotoSize / 2,
          cx - padding,
          cy - padding,
          (containerWidth - padding) - cx,
          (containerHeight - padding) - cy
        );
        
        const proposedHalf = proposedSize / 2;
        const clampedHalf = Math.max(minHalf, Math.min(maxHalf, proposedHalf));
        const newSize = clampedHalf * 2;
        
        let newX = cx - clampedHalf;
        let newY = cy - clampedHalf;
        const minX = padding;
        const minY = padding;
        const maxX = containerWidth - padding - newSize;
        const maxY = containerHeight - padding - newSize;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
        
        setPhoto1Size(newSize);
        if (pan1X && typeof pan1X.value === 'number') {
          pan1X.value = newX;
        }
        if (pan1Y && typeof pan1Y.value === 'number') {
          pan1Y.value = newY;
        }
      },
      onPanResponderRelease: () => {
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
  
  // Clamp position when size or container dims change
  React.useEffect(() => {
    try { clampPhoto1PositionForSize(photo1Size); } catch (e) {}
  }, [photo1Size, containerWidth, containerHeight]);

  // Initialize profile photo
  React.useEffect(() => {
    if (profilePictureUri) {
      dispatchPhotoState({ type: 'SET_PHOTO_1', uri: profilePictureUri });
    } else if (profileImageProcessed) {
      const imageUri = typeof profileImageProcessed === 'string' ? profileImageProcessed : profileImageProcessed.uri;
      dispatchPhotoState({ type: 'SET_PHOTO_1', uri: imageUri });
    } else {
      dispatchPhotoState({ type: 'SET_PHOTO_1', uri: 'default_profile_image' });
    }
  }, [profilePictureUri, profileImageProcessed]);

  // Load templates when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const templates = await UserTemplatesService.getAllTemplates();
      setUserTemplates(templates);
      console.log('✅ Loaded user templates:', templates.length);
      // Stay on Your Templates screen and render locally; no redirect
    } catch (error) {
      console.error('❌ Failed to load user templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserTemplatesService.deleteTemplate(templateId);
              await loadTemplates();
              console.log('✅ Deleted template:', templateId);
            } catch (error) {
              console.error('❌ Failed to delete template:', error);
            }
          },
        },
      ]
    );
  };

  const handleUseTemplate = (template) => {
    navigation.navigate('HeroScreen', {
      image: { uri: template.uri },
      fromUserTemplates: true,
    });
  };

  // Photo handlers
  const handlePhotoPress = async () => {
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
        console.error('Image picker error:', result.errorMessage);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        dispatchPhotoState({ type: 'SET_PHOTO_1', uri });
        console.log('✅ Photo selected:', uri);
      }
    } catch (error) {
      console.error('❌ Failed to pick image:', error);
    }
  };

  const handleAddDynamicPhoto = () => {
    const newId = `photo-${Date.now()}`;
    const centerX = (containerWidth / 2) - 50;
    const centerY = (containerHeight / 2) - 50;
    
    setPhotoElements(prev => [
      ...prev,
      {
        id: newId,
        uri: photo1Uri || 'default_profile_image',
        x: centerX,
        y: centerY,
        size: 100,
        shape: 'square',
      }
    ]);
    setFocusedPhotoId(newId);
  };

  // Text handlers
  const handleAddText = () => {
    const centerX = containerWidth / 2 - 80;
    const centerY = containerHeight / 2 - 20;
    const newId = `text-${Date.now()}`;
    
    setTextElements(prev => [
      ...prev,
      {
        id: newId,
        text: 'Your Text',
        x: centerX,
        y: centerY,
        width: 160,
        height: 42,
        color: COLORS.white,
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
      }
    ]);
    setFocusedTextId(newId);
  };

  const handleTextUpdate = (id, updates) => {
    setTextElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const handleTextDelete = (id) => {
    setTextElements(prev => prev.filter(el => el.id !== id));
    if (focusedTextId === id) setFocusedTextId(null);
  };

  // Background removal
  const handleRemoveBackground = async () => {
    if (!photo1Uri || photo1Uri === 'default_profile_image') {
      Alert.alert('No Photo', 'Please select a photo first');
      return;
    }

    try {
      setIsRemovingBackground(true);
      setBackgroundRemovalStatus('Removing background...');
      setBackgroundRemovalProgress(0);

      const result = await backgroundRemovalService.removeBackground(
        photo1Uri,
        (progress) => {
          setBackgroundRemovalProgress(progress);
          if (progress < 1) {
            setBackgroundRemovalStatus(`Processing: ${Math.round(progress * 100)}%`);
          }
        }
      );

      if (result.success) {
        dispatchPhotoState({ type: 'SET_PHOTO_1', uri: result.uri });
        setBackgroundRemovalStatus('Background removed successfully!');
        setTimeout(() => {
          setIsRemovingBackground(false);
          setBackgroundRemovalStatus('');
        }, 1000);
      } else {
        throw new Error(result.error || 'Failed to remove background');
      }
    } catch (error) {
      console.error('❌ Background removal error:', error);
      setBackgroundRemovalStatus('Failed to remove background');
      Alert.alert('Error', 'Failed to remove background. Please try again.');
      setTimeout(() => {
        setIsRemovingBackground(false);
        setBackgroundRemovalStatus('');
      }, 2000);
    }
  };

  // Request storage permission (Android)
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    try {
      const androidVersion = Platform.Version;
      let permission;
      let permissionName;
      
      if (androidVersion >= 33) {
        permission = 'android.permission.READ_MEDIA_IMAGES';
        permissionName = 'Media Images Access';
      } else if (androidVersion >= 29) {
        permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        permissionName = 'Storage Access';
      } else {
        permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
        permissionName = 'Storage Access';
      }
      
      const hasPermission = await PermissionsAndroid.check(permission);
      if (hasPermission) return true;
      
      const granted = await PermissionsAndroid.request(permission, {
        title: `${permissionName} Permission`,
        message: `This app needs ${permissionName.toLowerCase()} permission to save your templates.`,
        buttonPositive: 'Allow',
      });
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  // Share template function
  const shareTemplate = async () => {
    try {
      setIsSharing(true);
      
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is required to share the template.');
        return;
      }
      
      if (!viewShotRef.current) {
        Alert.alert('Error', 'Unable to capture template.');
        return;
      }
      
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 50));
      const capturedUri = await viewShotRef.current.capture({ format: 'jpg', quality: 1.0, result: 'tmpfile' });
      
      const fileUrl = capturedUri.startsWith('file://') ? capturedUri : `file://${capturedUri}`;
      await RNShare.open({
        url: fileUrl,
        type: 'image/jpeg',
        filename: 'template.jpg',
        failOnCancel: false,
        title: 'Share Template'
      });
      
    } catch (error) {
      if (!error.toString().includes('User did not share')) {
        console.error('❌ Share failed:', error);
        Alert.alert('Share Failed', 'Failed to share template.');
      }
    } finally {
      setIsCapturing(false);
      setIsSharing(false);
    }
  };

  // Download/Save functionality
  const handleDownload = async () => {
    try {
      setIsSaving(true);
      
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Storage permission is required to save templates.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (!viewShotRef.current) {
        Alert.alert('Error', 'Unable to capture template.');
        return;
      }
      
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uri = await viewShotRef.current.capture({ 
        format: 'jpg', 
        quality: 1.0,
        result: 'tmpfile'
      });
      
      try {
        const savedUri = await CameraRoll.save(uri, {
          type: 'photo',
          album: 'My Templates'
        });
        
        Alert.alert(
          'Success! 🎉',
          'Your template has been saved to gallery!',
          [{ text: 'Great!' }]
        );
        console.log('✅ Template saved:', savedUri);
      } catch (saveError) {
        const fallbackUri = await CameraRoll.save(uri, { type: 'photo' });
        Alert.alert('Success!', 'Template saved to gallery.');
        console.log('✅ Template saved (fallback):', fallbackUri);
      }
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      Alert.alert('Save Failed', `Failed to save template: ${error.message}`);
    } finally {
      setIsCapturing(false);
      setIsSaving(false);
    }
  };

  // Template button handler - open gallery to create new template
  const handleTemplateButtonPress = async () => {
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
        Alert.alert('Error', 'Failed to open gallery');
        return;
      }

      const asset = result.assets?.[0];
      if (asset?.uri) {
        // Navigate to TemplateCrop screen
        navigation.navigate('TemplateCrop', { uri: asset.uri });
      }
    } catch (error) {
      console.error('Error opening gallery for template:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  // Swipe handlers
  const handleSwipeUp = () => {
    if (currentIndex < userTemplates.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleSwipeDown = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const renderTemplate = ({ item, index }) => (
    <View style={styles.templateContainer}>
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }} style={[styles.viewShotContainer, { width: containerWidth, height: containerHeight }]}>
        <TouchableWithoutFeedback onPress={() => { setFocusedPhotoId(null); setFocusedTextId(null); }}>
          <View style={[styles.imageContainerWrapper, { width: containerWidth, height: containerHeight }]} collapsable={false}>
            <View style={[styles.imageWrapper, { width: containerWidth, height: containerHeight }]}>
            {/* Background template image */}
            <Image
              source={{ uri: item.uri }}
              style={styles.image}
              resizeMode="cover"
            />

            {/* Static photo container with drag/resize - matching HeroScreen */}
            {isPhoto1Visible && photo1Uri && (
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
                  {
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    borderColor: 'transparent',
                    overflow: 'hidden',
                    opacity: 1,
                  },
                ]}
                {...panResponder1.panHandlers}
              >
                {/* Close button and resize handle (visible only when focused) */}
                {isPhoto1Focused && (
                  <>
                    {/* Resize handle on top-left */}
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
                        setIsPhoto1Visible(false);
                        setIsPhoto1Focused(false);
                        setFocusedPhotoId(null);
                      }}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.staticPhotoCloseText}>✕</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Tap overlay to handle focus/gallery */}
                <TouchableOpacity
                  style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1 }}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (isPhoto1Focused) {
                      handlePhotoPress();
                    } else {
                      setIsPhoto1Focused(true);
                    }
                  }}
                >
                  <View style={[styles.photoImageMask, { borderRadius: shape === 'circle' ? photo1Size / 2 : 8 }]}>
                    <Image
                      source={
                        typeof photo1Uri === 'string'
                          ? photo1Uri === 'default_profile_image'
                            ? getDefaultProfileImage()
                            : { uri: photo1Uri }
                          : photo1Uri
                      }
                      style={[
                        styles.photoImage,
                        {
                          borderRadius: shape === 'circle' ? photo1Size / 2 : 8,
                          backgroundColor: 'transparent',
                        },
                      ]}
                      resizeMode={photo1Uri?.includes?.('bg_removed') ? 'contain' : 'cover'}
                    />
                  </View>
                </TouchableOpacity>
              </Reanimated.View>
            )}

            {/* Dynamic photo elements */}
            {photoElements.map((photo) => (
              <DynamicPhotoElement
                key={photo.id}
                id={photo.id}
                uri={photo.uri}
                x={photo.x}
                y={photo.y}
                size={photo.size}
                shape={photo.shape}
                focused={focusedPhotoId === photo.id}
                onFocus={(id) => {
                  setFocusedPhotoId(id);
                  setFocusedTextId(null);
                }}
                onPress={handlePhotoPress}
                onDelete={(id) => {
                  setPhotoElements(prev => prev.filter(p => p.id !== id));
                  if (focusedPhotoId === id) setFocusedPhotoId(null);
                }}
                onUpdatePosition={(id, x, y) => {
                  setPhotoElements(prev =>
                    prev.map(p => (p.id === id ? { ...p, x, y } : p))
                  );
                }}
                onUpdateSize={(id, size) => {
                  setPhotoElements(prev =>
                    prev.map(p => (p.id === id ? { ...p, size } : p))
                  );
                }}
                onDragStart={() => { isDraggingRef.current = true; }}
                onDragEnd={() => { isDraggingRef.current = false; }}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
              />
            ))}

            {/* Text elements */}
            {textElements.map((textEl) => (
              <DraggableText
                key={textEl.id}
                id={textEl.id}
                text={textEl.text}
                x={textEl.x}
                y={textEl.y}
                width={textEl.width}
                height={textEl.height}
                color={textEl.color}
                fontWeight={textEl.fontWeight}
                textAlign={textEl.textAlign}
                backgroundColor={textEl.backgroundColor}
                focused={focusedTextId === textEl.id}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                onFocus={(id) => {
                  setFocusedTextId(id);
                  setFocusedPhotoId(null);
                }}
                onUpdatePosition={(id, x, y) => handleTextUpdate(id, { x, y })}
                onUpdateSize={(id, width, height) => handleTextUpdate(id, { width, height })}
                onUpdateText={(id, text) => handleTextUpdate(id, { text })}
                onDelete={handleTextDelete}
                onDragStart={() => { isDraggingRef.current = true; }}
                onDragEnd={() => { isDraggingRef.current = false; }}
              />
            ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ViewShot>

      {/* Top-right action icons matching HeroScreen */}
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
          onPress={handleDownload}
          disabled={isSaving}
          activeOpacity={0.85}
          accessibilityLabel="Download template"
        >
          <AntDesign name="download" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.actionIconButton}
          onPress={() => handleDeleteTemplate(item.id)}
          activeOpacity={0.85}
          accessibilityLabel="Delete template"
        >
          <Feather name="trash-2" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Menu toggle icon */}
        <TouchableOpacity
          style={styles.actionIconButton}
          onPress={() => setMenuVisible(v => !v)}
          activeOpacity={0.85}
          accessibilityLabel="Menu"
        >
          <Text style={styles.actionIconText}>☰</Text>
        </TouchableOpacity>
      </View>
      )}


      {/* Background removal progress */}
      {isRemovingBackground && (
        <View style={styles.progressOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.progressText}>{backgroundRemovalStatus}</Text>
          {backgroundRemovalProgress > 0 && (
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${backgroundRemovalProgress * 100}%` },
                ]}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Menu bar matching HeroScreen structure with SVG icons
  const renderMenuBar = () => (
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
              onShapeChange={setShape}
            />

            <TouchableOpacity
              style={[
                styles.menuItem,
                (isRemovingBackground || !photo1Uri || photo1Uri === 'default_profile_image') && styles.removeBgButtonDisabled
              ]}
              onPress={handleRemoveBackground}
              disabled={isRemovingBackground || !photo1Uri || photo1Uri === 'default_profile_image'}
            >
              <View style={styles.menuIconCircle}>
                <WandSvgIcon color={(isRemovingBackground || !photo1Uri || photo1Uri === 'default_profile_image') ? '#999' : '#000'} size={22} />
              </View>
              <Text style={[
                styles.menuItemText,
                (isRemovingBackground || !photo1Uri || photo1Uri === 'default_profile_image') && styles.removeBgButtonTextDisabled
              ]} numberOfLines={2}>
                {isRemovingBackground ? 'Removing...' : 'Rem BG'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowBannerDialog(true)}
            >
              <View style={styles.menuIconCircle}>
                <BannerSvgIcon color="#000" size={22} />
              </View>
              <Text style={styles.menuItemText} numberOfLines={2}>Banner</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleAddText}>
              <View style={styles.menuIconCircle}>
                <TextSvgIcon color="#000" size={22} />
              </View>
              <Text style={styles.menuItemText} numberOfLines={2}>Text</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleAddDynamicPhoto}>
              <View style={styles.menuIconCircle}>
                <PhotoSvgIcon color="#000" size={22} />
              </View>
              <Text style={styles.menuItemText} numberOfLines={2}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleTemplateButtonPress}>
              <View style={styles.menuIconCircle}>
                <TemplateSvgIcon color="#000" size={22} />
              </View>
              <Text style={styles.menuItemText} numberOfLines={2}>Template</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <CustomHeader
          title="YOUR TEMPLATES"
          backgroundColor={COLORS.primary}
          titleColor={COLORS.white}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      </View>
    );
  }

  if (userTemplates.length === 0) {
    return (
      <View style={styles.container}>
        <CustomHeader
          title="YOUR TEMPLATES"
          backgroundColor={COLORS.primary}
          titleColor={COLORS.white}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.emptyContainer}>
          <Feather name="image" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Templates Yet</Text>
          <Text style={styles.emptyText}>
            Create custom templates by using the Template button in the menu bar
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.createButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Smooth vertical list – multiple images pre-rendered (not a grid)
  const normalizeUri = (u) => {
    if (!u) return null;
    let s = String(u).replace(/^"|"$/g, '');
    if (s.startsWith('/')) s = `file://${s}`;
    return s;
  };

  const cardPadding = 12;
  const cardWidth = Math.floor(screenWidth - cardPadding * 2);
  const cardHeight = Math.floor(cardWidth * 9 / 16); // 9:16 preview (multiple visible per screen)

  const renderPreview = ({ item, index }) => {
    const raw = item?.uri || item?.image_url || item?.url;
    const safeUri = normalizeUri(raw);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          navigation.navigate('HeroScreen', {
            localMode: true,
            initialTemplates: userTemplates,
            initialIndex: index,
          });
        }}
        style={{
          height: cardHeight + cardPadding, // include spacing
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
        }}
      >
        <View
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: '#111',
          }}
        >
          {safeUri ? (
            <Image
              source={{ uri: safeUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#777' }}>No preview</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CustomHeader
        title="MY Templates"
        backgroundColor={COLORS.primary}
        titleColor={COLORS.white}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      <View style={{ flex: 1 }}>
        <HeroScreen
          route={{ params: { localMode: true, initialTemplates: userTemplates } }}
          navigation={navigation}
        />
      </View>
    </View>
  );

  // Unreachable fallback (kept for reference)
  return (
    <>
      <View style={{ flex: 1 }}>
        {/* Top row: Title bar matching HeroScreen */}
        <View style={styles.topBarRow}>
          <View style={styles.titleContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconContainer}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>YOUR TEMPLATES</Text>
          </View>
        </View>

        <View style={styles.imageContainer}>
          <FlingGestureHandler
            direction={Directions.UP}
            onHandlerStateChange={({ nativeEvent }) => {
              if (nativeEvent.state === State.END) {
                if (isDraggingRef.current) return;
                handleSwipeUp();
              }
            }}
          >
            <FlingGestureHandler
              direction={Directions.DOWN}
              onHandlerStateChange={({ nativeEvent }) => {
                if (nativeEvent.state === State.END) {
                  if (isDraggingRef.current) return;
                  handleSwipeDown();
                }
              }}
            >
              <View style={styles.flatListContainer}>
                <FlatList
                  ref={flatListRef}
                  data={userTemplates}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTemplate}
                  pagingEnabled
                  showsVerticalScrollIndicator={false}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  getItemLayout={(data, index) => ({
                    length: screenHeight,
                    offset: screenHeight * index,
                    index,
                  })}
                  scrollEventThrottle={16}
                />
              </View>
            </FlingGestureHandler>
          </FlingGestureHandler>
        </View>

        {menuVisible && renderMenuBar()}
      </View>

      {/* Counter at bottom */}
      {userTemplates.length > 0 && (
        <View style={styles.globalCounter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {userTemplates.length}
          </Text>
        </View>
      )}

      {/* Banner Dialog Modal */}
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
                      setShowBannerDialog(false);
                      navigation.navigate('BannerCreate', { ratio: '5:1' });
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
                        navigation.navigate('BannerCrop', { uri: picked.uri, photoNumber: 'banner', ratio: '5:1' });
                      } catch (e) {
                        console.error('Banner picker error:', e);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bannerDialogButtonText}>Add Banner</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.bannerDialogButton}
                    onPress={() => {
                      setShowBannerDialog(false);
                      navigation.navigate('UserBanners');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bannerDialogButtonText}>Use Your Banners</Text>
                  </TouchableOpacity>
                  
                  {bannerEnabled && bannerUri ? (
                    <TouchableOpacity
                      style={[styles.bannerDialogButton, styles.bannerDialogButtonDanger]}
                      onPress={() => {
                        setBannerUri(null);
                        setBannerEnabled(false);
                        setIsBannerFocused(false);
                        setShowBannerDialog(false);
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

    </>
  );
};

export default UserTemplatesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
    backgroundColor: COLORS.primary,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backIconContainer: {
    padding: 8,
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  flatListContainer: {
    flex: 1,
    width: '100%',
  },
  viewShotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  templateContainer: {
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  imageContainerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#0e0e0e',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  firstPhoto: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  focusedPhotoContainer: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'solid',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoImageMask: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  staticPhotoResize: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 110,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  staticPhotoResizeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  staticPhotoClose: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 100,
    elevation: 5,
  },
  staticPhotoCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
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
    backgroundColor: 'rgba(37, 37, 37, 0.35)',
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
  globalCounter: {
    position: 'absolute',
    bottom: MENU_BAR_HEIGHT + 16,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 350,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    marginBottom: 8, // lift menu bar above system navigation
  },
  menuScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    columnGap: 0,
    backgroundColor: 'transparent',
  },
  menuItem: {
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
  },
  menuItemText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 12,
    minHeight: 20,
    marginTop: 0,
    width: '100%',
  },
  removeBgButtonDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  removeBgButtonTextDisabled: {
    color: '#666666',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
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
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  shapeDropdownContainer: {
    position: 'absolute',
    top: 80,
    left: 20,
    zIndex: 1000,
  },
});
