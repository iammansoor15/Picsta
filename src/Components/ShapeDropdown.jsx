import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Pressable,
  Alert,
  Platform,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ShapeDropdown = ({ selectedShape, onShapeChange, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Debug state changes
  React.useEffect(() => {
    console.log('🔵 ShapeDropdown: selectedShape prop changed to:', selectedShape);
  }, [selectedShape]);
  
  React.useEffect(() => {
    console.log('🔵 ShapeDropdown: isOpen state changed to:', isOpen);
  }, [isOpen]);
  
  // Debug component mount
  React.useEffect(() => {
    console.log('🔵 ShapeDropdown: Component mounted');
    return () => {
      console.log('🔵 ShapeDropdown: Component unmounted');
    };
  }, []);

  const shapes = [
    { value: 'circle', label: '⭕ Circle', icon: '⭕' },
    { value: 'square', label: '⬜ Square', icon: '⬜' },
    { value: 'no-background', label: '🌃 No Background', icon: '🌃' }
  ];

  const selectedShapeData = shapes.find(shape => shape.value === selectedShape);

  const handleShapeSelect = (shapeValue) => {
    console.log('🔵 ShapeDropdown: handleShapeSelect called with:', shapeValue);
    console.log('🔵 ShapeDropdown: Calling onShapeChange with:', shapeValue);
    
    try {
      if (typeof onShapeChange !== 'function') {
        console.error('🔴 ShapeDropdown: onShapeChange is not a function:', typeof onShapeChange);
        Alert.alert('Error', 'Shape change handler is not properly configured');
        return;
      }
      
      onShapeChange(shapeValue);
      console.log('🔵 ShapeDropdown: onShapeChange called successfully');
    } catch (error) {
      console.error('🔴 ShapeDropdown: Error in onShapeChange:', error);
      Alert.alert('Error', `Failed to change shape: ${error.message}`);
    }
    
    console.log('🔵 ShapeDropdown: Closing dropdown');
    setIsOpen(false);
  };
  
  const handleButtonPress = () => {
    console.log('🔵 ShapeDropdown: Button pressed, current isOpen:', isOpen);
    console.log('🔵 ShapeDropdown: Button pressed, opening dropdown');
    setIsOpen(true);
  };
  
  const handleModalClose = () => {
    console.log('🔵 ShapeDropdown: Modal close requested');
    setIsOpen(false);
  };
  
  const handleOverlayPress = () => {
    console.log('🔵 ShapeDropdown: Modal overlay pressed, closing');
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={handleButtonPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel="Shape selection dropdown"
        accessibilityHint="Tap to open shape selection menu"
        testID="shape-dropdown-button"
      >
        <Text style={styles.dropdownButtonText}>
          {selectedShapeData ? selectedShapeData.label : 'Select Shape'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={isOpen}
        onRequestClose={handleModalClose}
        animationType="fade"
        statusBarTranslucent={true}
        hardwareAccelerated={true}
        supportedOrientations={['portrait', 'landscape']}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={handleOverlayPress}
          testID="shape-dropdown-overlay"
        >
          <Pressable 
            style={styles.dropdownMenu}
            onPress={(e) => {
              console.log('🔵 ShapeDropdown: Menu pressed, preventing close');
              e.stopPropagation();
              // Prevent closing when pressing on the menu itself
            }}
            testID="shape-dropdown-menu"
          >
            {shapes.map((shape, index) => {
              // Use TouchableOpacity for better compatibility with older React Native versions
              const ItemComponent = Platform.OS === 'ios' ? Pressable : TouchableOpacity;
              
              if (Platform.OS === 'ios') {
                return (
                  <Pressable
                    key={shape.value}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      selectedShape === shape.value && styles.selectedItem,
                      index === 0 && styles.firstItem,
                      index === shapes.length - 1 && styles.lastItem,
                      pressed && styles.pressedItem,
                    ]}
                    onPress={(e) => {
                      console.log('🔵 Shape item pressed:', shape.value);
                      e?.stopPropagation?.();
                      handleShapeSelect(shape.value);
                    }}
                    accessible={true}
                    accessibilityLabel={`Select ${shape.label} shape`}
                    accessibilityRole="button"
                    testID={`shape-option-${shape.value}`}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedShape === shape.value && styles.selectedItemText
                    ]}>
                      {shape.label}
                    </Text>
                    {selectedShape === shape.value && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>
                );
              } else {
                return (
                  <TouchableOpacity
                    key={shape.value}
                    style={[
                      styles.dropdownItem,
                      selectedShape === shape.value && styles.selectedItem,
                      index === 0 && styles.firstItem,
                      index === shapes.length - 1 && styles.lastItem,
                    ]}
                    onPress={() => {
                      console.log('🔵 Shape item pressed (TouchableOpacity):', shape.value);
                      handleShapeSelect(shape.value);
                    }}
                    activeOpacity={0.8}
                    accessible={true}
                    accessibilityLabel={`Select ${shape.label} shape`}
                    accessibilityRole="button"
                    testID={`shape-option-${shape.value}`}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedShape === shape.value && styles.selectedItemText
                    ]}>
                      {shape.label}
                    </Text>
                    {selectedShape === shape.value && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default ShapeDropdown;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 3000, // Higher than other overlays
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Slightly more opaque for better visibility
    paddingHorizontal: 16, // Increased for better touch area
    paddingVertical: 12, // Increased for better touch area
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
    minWidth: 140,
    minHeight: 44, // Ensure minimum touch target size
    elevation: 3, // Increased elevation
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, // Slightly more prominent shadow
    shadowRadius: 4,
    // Ensure the button is touchable
    overflow: 'visible',
    justifyContent: 'center',
  },
  dropdownButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  dropdownArrow: {
    color: '#ffffff',
    fontSize: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
    // Ensure overlay captures all touches
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    minWidth: 200,
    maxWidth: screenWidth * 0.85,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 56, // Good touch target size
    // Ensure item is touchable
    backgroundColor: 'transparent',
  },
  firstItem: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  lastItem: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomWidth: 0,
  },
  selectedItem: {
    backgroundColor: '#f8f9fa',
  },
  pressedItem: {
    backgroundColor: '#e6f3ff',
    opacity: 0.9, // Less opacity change for better visibility
    transform: [{ scale: 0.98 }], // Subtle scale effect on press
  },
  dropdownItemText: {
    color: '#2c2c2c',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedItemText: {
    color: '#2962FF',
    fontWeight: 'bold',
  },
  checkmark: {
    color: '#2962FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});