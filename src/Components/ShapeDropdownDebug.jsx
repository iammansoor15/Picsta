import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

const ShapeDropdownDebug = ({ selectedShape, onShapeChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const shapes = [
    { value: 'circle', label: '⭕ Circle', icon: '⭕' },
    { value: 'square', label: '⬜ Square', icon: '⬜' },
    { value: 'no-background', label: '🌃 No Background', icon: '🌃' }
  ];
  
  // Find current shape index
  React.useEffect(() => {
    const index = shapes.findIndex(shape => shape.value === selectedShape);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [selectedShape]);
  
  const handlePress = () => {
    console.log('🔵 Debug ShapeDropdown: Button pressed');
    
    try {
      // Cycle to next shape
      const nextIndex = (currentIndex + 1) % shapes.length;
      const nextShape = shapes[nextIndex];
      
      console.log('🔵 Debug ShapeDropdown: Changing to:', nextShape.value);
      
      if (typeof onShapeChange !== 'function') {
        console.error('🔴 Debug ShapeDropdown: onShapeChange is not a function');
        Alert.alert('Error', 'Shape change handler missing');
        return;
      }
      
      onShapeChange(nextShape.value);
      setCurrentIndex(nextIndex);
      
      console.log('🔵 Debug ShapeDropdown: Shape changed successfully');
      
      // Show confirmation
      Alert.alert('Shape Changed', `Changed to: ${nextShape.label}`, [
        { text: 'OK', style: 'default' }
      ]);
      
    } catch (error) {
      console.error('🔴 Debug ShapeDropdown error:', error);
      Alert.alert('Error', `Failed to change shape: ${error.message}`);
    }
  };
  
  const currentShape = shapes[currentIndex];
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>
          {currentShape ? currentShape.label : 'Select Shape'}
        </Text>
        <Text style={styles.arrow}>🔄</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
    minWidth: 140,
    minHeight: 44,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  arrow: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 8,
  },
});

export default ShapeDropdownDebug;