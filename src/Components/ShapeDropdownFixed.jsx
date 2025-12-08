import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// Shape icon with triangle, circle, and square
const ShapeSvgIcon = ({ size = 28, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Triangle */}
    <Path d="M8 4l4 7H4l4-7z" fill={color} />
    {/* Circle */}
    <Circle cx="17" cy="8" r="3.5" fill={color} />
    {/* Square */}
    <Rect x="4" y="14" width="7" height="7" fill={color} />
  </Svg>
);

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ShapeDropdownFixed = ({ selectedShape, onShapeChange, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalReady, setIsModalReady] = useState(false);
  
  // Debug state changes
  React.useEffect(() => {
    console.log('🟢 ShapeDropdownFixed: selectedShape prop changed to:', selectedShape);
  }, [selectedShape]);
  
  React.useEffect(() => {
    console.log('🟢 ShapeDropdownFixed: isOpen state changed to:', isOpen);
  }, [isOpen]);
  
  React.useEffect(() => {
    console.log('🟢 ShapeDropdownFixed: Component mounted');
    return () => {
      console.log('🟢 ShapeDropdownFixed: Component unmounted');
    };
  }, []);

  const shapes = [
    { value: 'circle', label: '⭕ Circle', icon: '⭕' },
    { value: 'square', label: '⬜ Square', icon: '⬜' }
  ];

  const selectedShapeData = shapes.find(shape => shape.value === selectedShape);

  const handleShapeSelect = (shapeValue) => {
    console.log('🟢 ShapeDropdownFixed: handleShapeSelect called with:', shapeValue);
    console.log('🟢 ShapeDropdownFixed: Calling onShapeChange with:', shapeValue);
    
    try {
      if (typeof onShapeChange !== 'function') {
        console.error('🔴 ShapeDropdownFixed: onShapeChange is not a function:', typeof onShapeChange);
        Alert.alert('Error', 'Shape change handler is not properly configured');
        return;
      }
      
      // Close modal first
      setIsOpen(false);
      setIsModalReady(false);
      
      // Add a small delay to ensure modal closes before state change
      setTimeout(() => {
        onShapeChange(shapeValue);
        console.log('🟢 ShapeDropdownFixed: onShapeChange called successfully');
      }, 100);
      
    } catch (error) {
      console.error('🔴 ShapeDropdownFixed: Error in onShapeChange:', error);
      Alert.alert('Error', `Failed to change shape: ${error.message}`);
      setIsOpen(false);
      setIsModalReady(false);
    }
  };
  
  const handleButtonPress = () => {
    console.log('🟢 ShapeDropdownFixed: Button pressed, current isOpen:', isOpen);
    
    if (!isOpen) {
      console.log('🟢 ShapeDropdownFixed: Opening dropdown');
      setIsModalReady(false);
      setIsOpen(true);
      
      // Add a small delay to ensure modal renders properly
      setTimeout(() => {
        setIsModalReady(true);
      }, 50);
    }
  };
  
  const handleModalClose = () => {
    console.log('🟢 ShapeDropdownFixed: Modal close requested');
    setIsOpen(false);
    setIsModalReady(false);
  };
  
  const handleOverlayPress = () => {
    console.log('🟢 ShapeDropdownFixed: Modal overlay pressed, closing');
    setIsOpen(false);
    setIsModalReady(false);
  };

  const renderShapeItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedShape === item.value && styles.selectedItem,
        index === 0 && styles.firstItem,
        index === shapes.length - 1 && styles.lastItem,
      ]}
      onPress={() => {
        console.log('🟢 Shape item pressed:', item.value);
        handleShapeSelect(item.value);
      }}
      activeOpacity={0.8}
      accessible={true}
      accessibilityLabel={`Select ${item.label} shape`}
      accessibilityRole="button"
      testID={`shape-option-${item.value}`}
    >
      <Text style={[
        styles.dropdownItemText,
        selectedShape === item.value && styles.selectedItemText
      ]}>
        {item.label}
      </Text>
      {selectedShape === item.value && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

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
        <View style={styles.menuIconCircle}>
          <ShapeSvgIcon size={22} color="#000" />
        </View>
        <Text style={styles.menuLabelText}>Shape</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={isOpen}
        onRequestClose={handleModalClose}
        animationType="fade"
        statusBarTranslucent={true}
        hardwareAccelerated={true}
        supportedOrientations={['portrait', 'landscape']}
        onShow={() => {
          console.log('🟢 ShapeDropdownFixed: Modal shown');
          setIsModalReady(true);
        }}
        onDismiss={() => {
          console.log('🟢 ShapeDropdownFixed: Modal dismissed');
          setIsModalReady(false);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={handleOverlayPress}
          activeOpacity={1}
          testID="shape-dropdown-overlay"
        >
          <View style={styles.dropdownMenu}>
            {/* Header with Select Shape title */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Shape</Text>
            </View>
            
            {/* Shape options */}
            <View style={styles.shapeOptionsContainer}>
              <FlatList
                data={shapes}
                renderItem={renderShapeItem}
                keyExtractor={(item) => item.value}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ShapeDropdownFixed;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 3000,
  },
  dropdownButton: {
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  menuIconGlyph: {
    fontSize: 22,
    marginBottom: 0,
    textAlign: 'center',
  },
  menuLabelText: {
    color: '#2C3E50',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 14,
    minHeight: 28,
    width: '100%',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    width: 280, // Fixed square-like width
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c2c2c',
  },
  shapeOptionsContainer: {
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    minHeight: 56,
    backgroundColor: 'transparent',
  },
  firstItem: {
    marginTop: 8,
  },
  lastItem: {
    marginBottom: 8,
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196F3',
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