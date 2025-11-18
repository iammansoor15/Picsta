import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const DraggableText = ({ 
  textElement, 
  onTextChange, 
  onPositionChange,
  onSizeChange,
  onDelete,
  onRotate,
  containerWidth,
  containerHeight,
  isFocused = false,
  onFocus,
  onUnfocus,
  onStylePress,
  onDragStart,
  onDragEnd,
}) => {
  const translateX = useSharedValue(textElement.x || 0);
  const translateY = useSharedValue(textElement.y || 0);
  const lastPropX = useRef(textElement.x || 0);
  const lastPropY = useRef(textElement.y || 0);
  
  // Debug initial positioning
  React.useEffect(() => {
    console.log('🏷️ DraggableText Initialized:', {
      id: textElement.id,
      initialPosition: { x: textElement.x || 0, y: textElement.y || 0 },
      containerSize: { width: containerWidth, height: containerHeight },
      textSize: { width: textElement.width || 120, height: textElement.height || 40 }
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  }, []);

  // Keep local position in sync when parent updates textElement.x/y (e.g., applying server axis)
  // BUT only if the prop change is significant (not just echo from our own update)
  useEffect(() => {
    const propX = textElement.x || 0;
    const propY = textElement.y || 0;
    
    // Only sync if props actually changed by a meaningful amount
    if (Math.abs(propX - lastPropX.current) > 1 || Math.abs(propY - lastPropY.current) > 1) {
      translateX.value = propX;
      translateY.value = propY;
      lastPropX.current = propX;
      lastPropY.current = propY;
    }
  }, [textElement.x, textElement.y]);

  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(textElement.text);
  const [isResizing, setIsResizing] = useState(false);

  const [containerDimensions, setContainerDimensions] = useState({ 
    width: textElement.width || 120, 
    height: textElement.height || 50 
  });
  
  // Track if dimensions have been manually resized
  const [hasBeenResized, setHasBeenResized] = useState(false);
  
  // Persistent local dimensions that override any external resets
  const persistentDimensions = useRef({
    width: textElement.width || 120,
    height: textElement.height || 50
  });
  const containerRef = useRef(null);

  const textInputRef = useRef(null);
  
  // Store original position before keyboard adjustment
  const originalPositionRef = useRef({ x: 0, y: 0, saved: false });
  
  // Track if keyboard is currently visible for this component
  const [isKeyboardShowing, setIsKeyboardShowing] = useState(false);

  // PanResponder for dragging with boundary constraints
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEditing,
      onMoveShouldSetPanResponder: (evt, gestureState) => !isEditing && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onPanResponderGrant: () => {
        try { onDragStart && onDragStart(); } catch (e) {}
        startXRef.current = translateX.value;
        startYRef.current = translateY.value;
      },
      onPanResponderMove: (e, gestureState) => {
        // Calculate boundaries with minimal padding for full movement
        const padding = 5; // Reduced padding to allow movement to edges
        const textWidth = containerDimensions.width || 120;
        const textHeight = containerDimensions.height || 40;
        
        // Boundary limits - ensure text can move throughout entire container
        const minX = 0; // Allow movement to true edge
        const maxX = Math.max(0, containerWidth - textWidth); // Prevent overflow
        const minY = 0; // Allow movement to true top
        const maxY = Math.max(0, containerHeight - textHeight); // Prevent overflow
        
        // Calculate proposed new position
        const proposedX = startXRef.current + gestureState.dx;
        const proposedY = startYRef.current + gestureState.dy;
        
        // Clamp positions to boundaries
        const constrainedX = Math.max(minX, Math.min(maxX, proposedX));
        const constrainedY = Math.max(minY, Math.min(maxY, proposedY));
        
        // Debug boundary calculations
        if (Math.abs(gestureState.dx) > 50 || Math.abs(gestureState.dy) > 50) {
          console.log('📍 Text Movement Debug:', {
            containerSize: { width: containerWidth, height: containerHeight },
            textSize: { width: textWidth, height: textHeight },
            boundaries: { minX, maxX, minY, maxY },
            proposed: { x: proposedX.toFixed(1), y: proposedY.toFixed(1) },
            constrained: { x: constrainedX.toFixed(1), y: constrainedY.toFixed(1) },
            canMoveUp: proposedY < constrainedY,
            canMoveLeft: proposedX < constrainedX
          });
        }
        
        // Apply constrained movement
        translateX.value = constrainedX;
        translateY.value = constrainedY;
      },
      onPanResponderRelease: (e, gestureState) => {
        try { onDragEnd && onDragEnd(); } catch (e) {}
        // Apply final boundary constraints - match movement constraints
        const textWidth = containerDimensions.width || 120;
        const textHeight = containerDimensions.height || 40;
        
        const minX = 0; // Allow positioning at true edge
        const maxX = Math.max(0, containerWidth - textWidth); // Prevent overflow
        const minY = 0; // Allow positioning at true top
        const maxY = Math.max(0, containerHeight - textHeight); // Prevent overflow
        
        const finalX = Math.max(minX, Math.min(maxX, translateX.value));
        const finalY = Math.max(minY, Math.min(maxY, translateY.value));
        
        // Update position with constraints
        translateX.value = finalX;
        translateY.value = finalY;
        
        if (onPositionChange) {
          onPositionChange(textElement.id, finalX, finalY);
        }
        
        // Only focus/edit if it was a tap (very small movement) and already focused
        const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
        if (distance < 5 && isFocused) {
          // Double tap to edit when already focused
          if (!isEditing) {
            setTimeout(() => setIsEditing(true), 100);
          }
        } else if (distance < 5) {
          // First tap - just focus
          if (onFocus) {
            onFocus(textElement.id);
          }
        }
      },
    })
  ).current;

  // Store initial dimensions for resizing using ref to avoid async state issues
  const initialResizeDimensions = useRef({ width: 0, height: 0 });

  // Resize PanResponder for resizing the text container
  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('📏 Resize handle touched - should set responder: true');
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const shouldMove = Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
        console.log('📏 Should move responder:', shouldMove, { dx: gestureState.dx, dy: gestureState.dy });
        return shouldMove;
      },
      onPanResponderGrant: () => {
        setIsResizing(true);
        // Use persistent dimensions if available, fallback to container state
        const currentWidth = hasBeenResized ? persistentDimensions.current.width : containerDimensions.width;
        const currentHeight = hasBeenResized ? persistentDimensions.current.height : containerDimensions.height;
        
        // Store current dimensions as initial for this resize gesture
        initialResizeDimensions.current = {
          width: currentWidth,
          height: currentHeight
        };
        
        console.log('📏 Started resizing from dimensions:', {
          initialForResize: initialResizeDimensions.current,
          containerState: containerDimensions,
          persistentState: persistentDimensions.current,
          hasBeenResized: hasBeenResized
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        // Calculate new dimensions based on gesture from initial size
        const minSize = 60; // Minimum container size
        const maxWidth = containerWidth * 0.8; // Max 80% of container width
        const maxHeight = containerHeight * 0.6; // Max 60% of container height
        
        // Use initial dimensions from when resize started
        const newWidth = Math.max(minSize, Math.min(maxWidth, initialResizeDimensions.current.width + gestureState.dx));
        const newHeight = Math.max(minSize, Math.min(maxHeight, initialResizeDimensions.current.height + gestureState.dy));
        
        // Update persistent dimensions during resize
        persistentDimensions.current = {
          width: newWidth,
          height: newHeight
        };
        
        console.log('📏 Resizing:', { 
          dx: gestureState.dx.toFixed(1), 
          dy: gestureState.dy.toFixed(1),
          newWidth: newWidth.toFixed(1), 
          newHeight: newHeight.toFixed(1),
          persistentUpdated: persistentDimensions.current
        });
        
        setContainerDimensions({ width: newWidth, height: newHeight });
      },
      onPanResponderRelease: (evt, gestureState) => {
        setIsResizing(false);
        setHasBeenResized(true); // Mark as manually resized
        
        // Update parent component with final persistent dimensions
        const finalWidth = persistentDimensions.current.width;
        const finalHeight = persistentDimensions.current.height;
        
        if (onSizeChange) {
          onSizeChange(textElement.id, finalWidth, finalHeight);
        }
        
        console.log('✅ Finished resizing:', {
          finalWidth: finalWidth.toFixed(1),
          finalHeight: finalHeight.toFixed(1),
          containerState: {
            width: containerDimensions.width.toFixed(1),
            height: containerDimensions.height.toFixed(1)
          },
          persistentState: persistentDimensions.current
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Also end drag if responder terminates unexpectedly
  React.useEffect(() => {
    return () => {
      try { onDragEnd && onDragEnd(); } catch (e) {}
    };
  }, []);

  // Handle text editing
  const handleTextChange = () => {
    if (currentText.trim() === '') {
      onDelete && onDelete(textElement.id);
    } else {
      onTextChange && onTextChange(textElement.id, currentText.trim());
    }
    setIsEditing(false);
    if (onUnfocus) {
      onUnfocus(textElement.id);
    }
  };

  // Auto-focus text input when editing and move to avoid keyboard
  useEffect(() => {
    if (isEditing && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current.focus();
      }, 100);
    }
  }, [isEditing]);
  
  // Save position when editing starts (before keyboard shows)
  useEffect(() => {
    if (isEditing && !originalPositionRef.current.saved) {
      // Save current position as soon as editing starts
      originalPositionRef.current = {
        x: translateX.value,
        y: translateY.value,
        saved: true,
      };
      console.log('💾 Saved original position:', originalPositionRef.current);
    }
  }, [isEditing]);
  
  // Listen for keyboard show/hide to move position
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardShowing(true);
      if (isEditing) {
        // Move text container up to avoid keyboard (position already saved)
        const kbh = e && e.endCoordinates && e.endCoordinates.height ? e.endCoordinates.height : 320;
        const textHeight = containerDimensions.height || 40;
        const safeZoneTop = containerHeight - kbh - textHeight - 20;
        if (translateY.value > safeZoneTop) {
          const targetY = Math.max(10, safeZoneTop);
          console.log('⬆️ Moving text up from', translateY.value, 'to', targetY, 'kb:', kbh);
          translateY.value = targetY;
          if (onPositionChange) {
            onPositionChange(textElement.id, translateX.value, targetY);
          }
        }
      }
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardShowing(false);
      // Restore original position when keyboard closes
      if (originalPositionRef.current.saved) {
        console.log('⬇️ Restoring position to:', originalPositionRef.current);
        translateX.value = originalPositionRef.current.x;
        translateY.value = originalPositionRef.current.y;
        if (onPositionChange) {
          onPositionChange(textElement.id, originalPositionRef.current.x, originalPositionRef.current.y);
        }
        // Reset saved flag so next edit can save again
        originalPositionRef.current.saved = false;
      }
    });
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [isEditing, containerHeight, containerDimensions.height, onPositionChange, textElement.id]);

  // Unfocus when another container is selected
  useEffect(() => {
    if (!isFocused && isEditing) {
      setIsEditing(false);
    }
  }, [isFocused]);
  
  // Update container dimensions when textElement changes (from parent)
  useEffect(() => {
    if (textElement.width && textElement.height) {
      // Only update if we haven't been manually resized yet
      if (!hasBeenResized) {
        const newDimensions = {
          width: textElement.width,
          height: textElement.height
        };
        setContainerDimensions(newDimensions);
        // Initialize persistent dimensions with parent data
        persistentDimensions.current = newDimensions;
        setHasBeenResized(true);
        console.log('🔄 Updated from parent dimensions:', newDimensions);
      } else {
        console.log('⏸️ Ignoring parent dimension update - user has manually resized');
      }
    }
  }, [textElement.width, textElement.height, hasBeenResized]);
  
  
  // Update container dimensions when layout changes (only if not manually resized)
  const handleContainerLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    // Only update dimensions if they haven't been manually resized
    if (!hasBeenResized && (containerDimensions.width === 120 || containerDimensions.height === 50)) {
      const newDimensions = { width, height };
      setContainerDimensions(newDimensions);
      // Initialize persistent dimensions with layout data
      persistentDimensions.current = newDimensions;
      console.log('📐 Initial container layout set:', newDimensions);
    } else if (hasBeenResized) {
      // Use persistent dimensions if user has resized
      setContainerDimensions(persistentDimensions.current);
      console.log('📐 Using persistent dimensions on layout:', persistentDimensions.current);
    }
  };
  
  // Enforce boundaries when container dimensions or position changes
  useEffect(() => {
    if (containerWidth && containerHeight && containerDimensions.width > 0) {
      // Use persistent dimensions if available and user has resized
      const textWidth = hasBeenResized && persistentDimensions.current.width > 0 
        ? persistentDimensions.current.width 
        : containerDimensions.width;
      const textHeight = hasBeenResized && persistentDimensions.current.height > 0 
        ? persistentDimensions.current.height 
        : containerDimensions.height;
      
      // Consistent boundary constraints with movement logic
      const minX = 0; // Allow positioning at true edge
      const maxX = Math.max(0, containerWidth - textWidth); // Prevent overflow
      const minY = 0; // Allow positioning at true top
      const maxY = Math.max(0, containerHeight - textHeight); // Prevent overflow
      
      const currentX = translateX.value;
      const currentY = translateY.value;
      
      // Check if current position is out of bounds
      const constrainedX = Math.max(minX, Math.min(maxX, currentX));
      const constrainedY = Math.max(minY, Math.min(maxY, currentY));
      
      // Update position if it was out of bounds
      if (constrainedX !== currentX || constrainedY !== currentY) {
        translateX.value = constrainedX;
        translateY.value = constrainedY;
        if (onPositionChange) {
          onPositionChange(textElement.id, constrainedX, constrainedY);
        }
        console.log('📍 Text position constrained to boundaries:', {
          from: { x: currentX.toFixed(1), y: currentY.toFixed(1) },
          to: { x: constrainedX.toFixed(1), y: constrainedY.toFixed(1) }
        });
      }
    }
  }, [containerWidth, containerHeight, containerDimensions, onPositionChange, textElement.id]);

  return (
    <Reanimated.View
      style={[
        styles.containerWrapper,
        animatedStyle,
      ]}
    >
      <Animated.View
        ref={containerRef}
        style={[
          styles.textContainer,
          isFocused && styles.focusedContainer,
          {
            width: containerDimensions.width,
            height: containerDimensions.height,
            transform: [{ rotate: `${textElement.rotation || 0}deg` }],
          },
        ]}
        onLayout={handleContainerLayout}
        {...panResponder.panHandlers}
      >
        {isEditing ? (
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              {
                fontSize: Math.max(12, Math.min(36, containerDimensions.width * 0.15)), // Scale with container width
                color: textElement.color || 'white',
                fontWeight: textElement.fontWeight || 'normal',
                textAlign: textElement.textAlign || 'center',
              },
            ]}
            value={currentText}
            onChangeText={setCurrentText}
            onBlur={handleTextChange}
            multiline
            autoFocus
            pointerEvents="auto"
          />
        ) : (
          <TouchableOpacity
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.7}
            onPress={() => {
              if (isFocused) {
                // Already focused - enter edit mode
                setIsEditing(true);
              } else {
                // Not focused yet - focus first
                if (onFocus) {
                  onFocus(textElement.id);
                }
              }
            }}
          >
            <Text
              style={[
                styles.textDisplay,
                {
                  fontSize: Math.max(12, Math.min(36, containerDimensions.width * 0.15)), // Scale with container width
                  color: textElement.color || 'white',
                  fontWeight: textElement.fontWeight || 'normal',
                  textAlign: textElement.textAlign || 'center',
                },
              ]}
            >
              {currentText || 'Tap to edit'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {isFocused && (
        <>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => {
              onDelete && onDelete(textElement.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.styleButton}
            onPress={() => {
              onStylePress && onStylePress(textElement.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Text style={styles.styleButtonText}>🎨</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.rotateButton}
            onPress={() => {
              onRotate && onRotate(textElement.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Text style={styles.rotateButtonText}>↻</Text>
          </TouchableOpacity>
          <View 
            style={styles.resizeHandle}
            {...resizeResponder.panHandlers}
          >
            <Text style={styles.resizeHandleText}>⤤</Text>
          </View>
        </>
      )}
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    zIndex: 100, // Higher than photo containers (which use zIndex: 10)
    elevation: 25, // For Android stacking
  },
  textContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    minWidth: 80,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101, // Ensure text container is above wrapper
    elevation: 26, // For Android stacking
    borderWidth: 0,
    borderColor: 'transparent',
  },
  focusedContainer: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 4,
  },
  deleteButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 24,
    height: 24,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  styleButton: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 24,
    height: 24,
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  styleButtonText: {
    fontSize: 12,
    lineHeight: 12,
  },
  rotateButton: {
    position: 'absolute',
    bottom: -12,
    left: -12,
    width: 24,
    height: 24,
    backgroundColor: '#FF9800',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rotateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 30,
    height: 30,
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  resizeHandleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  textInput: {
    textAlign: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    backgroundColor: 'transparent',
    color: 'white',
    minWidth: 60,
  },
  textDisplay: {
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
});

export default DraggableText;
