import React, { useRef, useState } from 'react';
import { View, Image, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, PanResponder, ActivityIndicator } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Minimal, professional positioning UI for the photo container
const TemplatePositioner = ({ imageUri, onCancel, onConfirm, isUploading = false }) => {
  // Canvas sizing
  const MAX_WIDTH = Math.min(screenWidth * 0.92, 420);
  const MAX_HEIGHT = Math.min(screenHeight * 0.7, 640);
  const canvasWidth = MAX_WIDTH;
  const canvasHeight = Math.min(Math.floor(MAX_WIDTH * 16 / 9), MAX_HEIGHT);

  // Create a scaling factor based on canvas size for proportional resizing
  const scalingFactor = Math.min(canvasWidth / 350, canvasHeight / 600); // Base scale on reference canvas size
  
  // Draggable photo container (scales with canvas) - with resize functionality
  const initialContainerSize = Math.max(80, Math.min(160, Math.floor(96 * scalingFactor + canvasWidth * 0.12)));
  const [containerSize, setContainerSize] = useState(initialContainerSize);
  const containerSizeRef = useRef(initialContainerSize);
  const defaultX = canvasWidth - containerSize - 12;
  const defaultY = canvasHeight - containerSize - 12;

  // Animated position for smooth drag without re-renders (photo)
  const translate = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const posRef = useRef({ x: defaultX, y: defaultY });
  const [axis, setAxis] = useState({ x: Math.round(defaultX), y: Math.round(defaultY) });
  const rafRef = useRef(null);

  // Draggable text container (scales proportionally with photo container) - with resize functionality
  const initialTextWidth = Math.max(100, Math.min(200, Math.floor(120 * scalingFactor + canvasWidth * 0.15)));
  const initialTextHeight = Math.max(28, Math.min(44, Math.floor(32 * scalingFactor + 8)));
  const [textWidth, setTextWidth] = useState(initialTextWidth);
  const [textHeight, setTextHeight] = useState(initialTextHeight);
  const textSizeRef = useRef({ width: initialTextWidth, height: initialTextHeight });
  const defaultTextX = 12;
  const defaultTextY = Math.max(12, Math.floor(canvasHeight * 0.1));
  const translateText = useRef(new Animated.ValueXY({ x: defaultTextX, y: defaultTextY })).current;
  const posTextRef = useRef({ x: defaultTextX, y: defaultTextY });
  const [textAxis, setTextAxis] = useState({ x: Math.round(defaultTextX), y: Math.round(defaultTextY) });
  const rafTextRef = useRef(null);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Gesture-handler based drag for photo container
  const pinchRef = useRef();
  const imagePanRef = useRef();
  const photoPanRef = useRef();
  const textPanRef = useRef();
  const resizeRef = useRef();
  const textResizeRef = useRef();

  const photoDragStartRef = useRef({ x: defaultX, y: defaultY });

  // Legacy handler (unused)
  const onPhotoDrag = (e) => {
    const { translationX, translationY } = e.nativeEvent;
    const minX = 0;
    const minY = 0;
    const maxX = Math.max(0, canvasWidth - containerSize);
    const maxY = Math.max(0, canvasHeight - containerSize);
    const nextX = clamp(photoDragStartRef.current.x + (translationX || 0), minX, maxX);
    const nextY = clamp(photoDragStartRef.current.y + (translationY || 0), minY, maxY);
    translate.setValue({ x: nextX, y: nextY });

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setAxis({ x: Math.round(nextX), y: Math.round(nextY) });
      });
    }
  };

  const onPhotoDragState = (e) => {
    const state = e.nativeEvent.state;
    if (state === State.BEGAN) {
      photoDragStartRef.current = { ...posRef.current };
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      const { translationX, translationY } = e.nativeEvent;
      const minX = 0;
      const minY = 0;
      const maxX = Math.max(0, canvasWidth - containerSize);
      const maxY = Math.max(0, canvasHeight - containerSize);
      const finalX = clamp(photoDragStartRef.current.x + (translationX || 0), minX, maxX);
      const finalY = clamp(photoDragStartRef.current.y + (translationY || 0), minY, maxY);
      translate.setValue({ x: finalX, y: finalY });
      posRef.current = { x: finalX, y: finalY };
      setAxis({ x: Math.round(finalX), y: Math.round(finalY) });
    }
  };

  // Resize gesture handling for photo container
  const resizeStartRef = useRef({ size: initialContainerSize });
  const minContainerSize = 60;
  const maxContainerSize = Math.min(canvasWidth * 0.6, canvasHeight * 0.6);

  const onResize = (e) => {
    const { translationX, translationY } = e.nativeEvent;
    // Use the larger translation to determine resize direction
    const translation = Math.max(Math.abs(translationX), Math.abs(translationY)) * 
                       (translationX + translationY > 0 ? 1 : -1);
    const newSize = clamp(
      resizeStartRef.current.size + translation,
      minContainerSize,
      maxContainerSize
    );
    setContainerSize(newSize);
    containerSizeRef.current = newSize;
  };

  const onResizeState = (e) => {
    const state = e.nativeEvent.state;
    if (state === State.BEGAN) {
      resizeStartRef.current = { size: containerSizeRef.current };
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      const { translationX, translationY } = e.nativeEvent;
      const translation = Math.max(Math.abs(translationX), Math.abs(translationY)) * 
                         (translationX + translationY > 0 ? 1 : -1);
      const finalSize = clamp(
        resizeStartRef.current.size + translation,
        minContainerSize,
        maxContainerSize
      );
      setContainerSize(finalSize);
      containerSizeRef.current = finalSize;
    }
  };

  // Resize gesture handling for text container
  const textResizeStartRef = useRef({ width: initialTextWidth, height: initialTextHeight });
  const minTextWidth = 80;
  const maxTextWidth = Math.min(canvasWidth * 0.8, 300);
  const minTextHeight = 20;
  const maxTextHeight = Math.min(canvasHeight * 0.3, 80);

  const onTextResize = (e) => {
    const { translationX, translationY } = e.nativeEvent;
    const newWidth = clamp(
      textResizeStartRef.current.width + translationX,
      minTextWidth,
      maxTextWidth
    );
    const newHeight = clamp(
      textResizeStartRef.current.height + translationY,
      minTextHeight,
      maxTextHeight
    );
    setTextWidth(newWidth);
    setTextHeight(newHeight);
    textSizeRef.current = { width: newWidth, height: newHeight };
  };

  const onTextResizeState = (e) => {
    const state = e.nativeEvent.state;
    if (state === State.BEGAN) {
      textResizeStartRef.current = { ...textSizeRef.current };
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      const { translationX, translationY } = e.nativeEvent;
      const finalWidth = clamp(
        textResizeStartRef.current.width + translationX,
        minTextWidth,
        maxTextWidth
      );
      const finalHeight = clamp(
        textResizeStartRef.current.height + translationY,
        minTextHeight,
        maxTextHeight
      );
      setTextWidth(finalWidth);
      setTextHeight(finalHeight);
      textSizeRef.current = { width: finalWidth, height: finalHeight };
    }
  };

  // Gesture-handler based drag for text container
  const textDragStartRef = useRef({ x: defaultTextX, y: defaultTextY });

  // Legacy handler (unused)
  const onTextDrag = (e) => {
    const { translationX, translationY } = e.nativeEvent;
    const minX = 0;
    const minY = 0;
    const maxX = Math.max(0, canvasWidth - textWidth);
    const maxY = Math.max(0, canvasHeight - textHeight);
    const nextX = clamp(textDragStartRef.current.x + (translationX || 0), minX, maxX);
    const nextY = clamp(textDragStartRef.current.y + (translationY || 0), minY, maxY);
    translateText.setValue({ x: nextX, y: nextY });
    if (!rafTextRef.current) {
      rafTextRef.current = requestAnimationFrame(() => {
        rafTextRef.current = null;
        setTextAxis({ x: Math.round(nextX), y: Math.round(nextY) });
      });
    }
  };

  // Legacy handler (unused)
  const onTextDragState = (e) => {
    const state = e.nativeEvent.state;
    if (state === State.BEGAN) {
      textDragStartRef.current = { ...posTextRef.current };
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      const { translationX, translationY } = e.nativeEvent;
      const minX = 0;
      const minY = 0;
      const maxX = Math.max(0, canvasWidth - textWidth);
      const maxY = Math.max(0, canvasHeight - textHeight);
      const finalX = clamp(textDragStartRef.current.x + (translationX || 0), minX, maxX);
      const finalY = clamp(textDragStartRef.current.y + (translationY || 0), minY, maxY);
      translateText.setValue({ x: finalX, y: finalY });
      posTextRef.current = { x: finalX, y: finalY };
      setTextAxis({ x: Math.round(finalX), y: Math.round(finalY) });
    }
  };
  
  // Simple PanResponders for photo and text containers
  const photoPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      photoDragStartRef.current = { ...posRef.current };
    },
    onPanResponderMove: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      const minX = 0;
      const minY = 0;
      const maxX = Math.max(0, canvasWidth - containerSizeRef.current);
      const maxY = Math.max(0, canvasHeight - containerSizeRef.current);
      const nx = clamp(photoDragStartRef.current.x + dx, minX, maxX);
      const ny = clamp(photoDragStartRef.current.y + dy, minY, maxY);
      translate.setValue({ x: nx, y: ny });
      setAxis({ x: Math.round(nx), y: Math.round(ny) });
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      const minX = 0;
      const minY = 0;
      const maxX = Math.max(0, canvasWidth - containerSizeRef.current);
      const maxY = Math.max(0, canvasHeight - containerSizeRef.current);
      const nx = clamp(photoDragStartRef.current.x + dx, minX, maxX);
      const ny = clamp(photoDragStartRef.current.y + dy, minY, maxY);
      translate.setValue({ x: nx, y: ny });
      posRef.current = { x: nx, y: ny };
      setAxis({ x: Math.round(nx), y: Math.round(ny) });
    }
  })).current;

  const textPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      textDragStartRef.current = { ...posTextRef.current };
    },
    onPanResponderMove: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      const minX = 0;
      const minY = 0;
      const maxX = Math.max(0, canvasWidth - textSizeRef.current.width);
      const maxY = Math.max(0, canvasHeight - textSizeRef.current.height);
      const nx = clamp(textDragStartRef.current.x + dx, minX, maxX);
      const ny = clamp(textDragStartRef.current.y + dy, minY, maxY);
      translateText.setValue({ x: nx, y: ny });
      setTextAxis({ x: Math.round(nx), y: Math.round(ny) });
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      const minX = 0;
      const minY = 0;
      const maxX = Math.max(0, canvasWidth - textSizeRef.current.width);
      const maxY = Math.max(0, canvasHeight - textSizeRef.current.height);
      const nx = clamp(textDragStartRef.current.x + dx, minX, maxX);
      const ny = clamp(textDragStartRef.current.y + dy, minY, maxY);
      translateText.setValue({ x: nx, y: ny });
      posTextRef.current = { x: nx, y: ny };
      setTextAxis({ x: Math.round(nx), y: Math.round(ny) });
    }
  })).current;

  // Image zoom/pan values using Animated API
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(baseScale, pinchScale);
  const translateXImg = useRef(new Animated.Value(0)).current;
  const translateYImg = useRef(new Animated.Value(0)).current;
  const minScale = 1;
  const maxScale = 3;
  const currentScaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);

  // Pinch gesture
  const onPinchGestureEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: true });
  const onPinchHandlerStateChange = (e) => {
    const state = e.nativeEvent.state;
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      const next = currentScaleRef.current * (e.nativeEvent.scale || 1);
      const clamped = Math.min(maxScale, Math.max(minScale, next));
      currentScaleRef.current = clamped;
      baseScale.setValue(clamped);
      pinchScale.setValue(1);
    }
  };

  // Pan gesture
  const onPanGestureEvent = Animated.event([
    { nativeEvent: { translationX: translateXImg, translationY: translateYImg } }
  ], { useNativeDriver: true });
  const onPanHandlerStateChange = (e) => {
    const state = e.nativeEvent.state;
    if (state === State.BEGAN) {
      translateXImg.setOffset(offsetXRef.current);
      translateXImg.setValue(0);
      translateYImg.setOffset(offsetYRef.current);
      translateYImg.setValue(0);
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      offsetXRef.current += e.nativeEvent.translationX || 0;
      offsetYRef.current += e.nativeEvent.translationY || 0;
      translateXImg.flattenOffset();
      translateYImg.flattenOffset();
    }
  };

  return (
    <View style={styles.wrapper}>
        <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>        
        <PanGestureHandler
          ref={imagePanRef}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanHandlerStateChange}
          simultaneousHandlers={[pinchRef]}
          waitFor={[photoPanRef, textPanRef]}
        >
          <Animated.View style={StyleSheet.absoluteFill}>
            <PinchGestureHandler
              ref={pinchRef}
              onGestureEvent={onPinchGestureEvent}
              onHandlerStateChange={onPinchHandlerStateChange}
              waitFor={[photoPanRef, textPanRef]}
              simultaneousHandlers={[imagePanRef]}
            >
              <Animated.View style={[StyleSheet.absoluteFill, { transform: [
                { translateX: translateXImg },
                { translateY: translateYImg },
                { scale },
              ] }]}>
                <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
              </Animated.View>
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>

        {/* Draggable photo container */}
        <Animated.View
          {...photoPanResponder.panHandlers}
          style={[
            styles.draggable,
            {
              width: containerSize,
              height: containerSize,
              transform: translate.getTranslateTransform(),
            },
          ]}
        >
            {/* Subtle inner mask for visual contrast */}
            <View style={styles.innerMask} />
            {/* Axis pill */}
            <View style={styles.axisPill}>
              <Text style={styles.axisText}>Photo: {axis.x} • {axis.y}</Text>
            </View>
            {/* TEST: Simple resize button - should be VERY visible */}
            <View style={{
              position: 'absolute',
              top: 10,
              left: 10,
              width: 40,
              height: 40,
              backgroundColor: 'red',
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>↕</Text>
            </View>
          </Animated.View>

        {/* Draggable text container */}
        <Animated.View
          {...textPanResponder.panHandlers}
          style={[
            styles.textDraggable,
            {
              width: textWidth,
              height: textHeight,
              transform: translateText.getTranslateTransform(),
            },
          ]}
        >
            <Text style={styles.textLabel}>Text container</Text>
            <View style={styles.axisPillSmall}>
              <Text style={styles.axisTextSmall}>{textAxis.x} • {textAxis.y}</Text>
            </View>
          </Animated.View>
      </View>

      {/* Action bar */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.iconButton, styles.cancel]} onPress={onCancel} activeOpacity={0.85}>
          <Text style={styles.iconText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isUploading && styles.primaryButtonLoading]}
          onPress={() => !isUploading && onConfirm({ photo_axis: { x: Math.round(posRef.current.x), y: Math.round(posRef.current.y) }, text_axis: { x: Math.round(posTextRef.current.x), y: Math.round(posTextRef.current.y) } })}
          activeOpacity={isUploading ? 1 : 0.9}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TemplatePositioner;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
  },
  targetToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  toggleText: { color: '#bbb', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  nudgeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '60%',
    marginTop: 10,
    marginBottom: 4,
  },
  nudgeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f1f1f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  nudgeTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
  canvas: {
    backgroundColor: '#0B0B0B',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  draggable: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    overflow: 'visible',
  },
  textDraggable: {
    position: 'absolute',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  innerMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  axisPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  axisPillSmall: {
    position: 'absolute',
    bottom: -18,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  axisText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  axisTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textLabel: {
    color: '#CDE9D4',
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#2b2b2b',
  },
  iconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cancel: {
    backgroundColor: '#2b2b2b',
  },
  primaryButton: {
    flex: 1,
    marginLeft: 10,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLoading: {
    backgroundColor: '#357a35', // Darker green when loading
    opacity: 0.8,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resizeHandle: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 32,
    height: 32,
    backgroundColor: '#FF5722',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 999,
  },
  resizeIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  textResizeHandle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  textResizeIcon: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
});
