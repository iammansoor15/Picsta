import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const PositionControls = ({ 
  showScrollButtons, 
  onPanImage 
}) => {
  if (!showScrollButtons) return null;

  return (
    <>
      {/* Up Button */}
      <TouchableOpacity 
        style={styles.positionButtonUp}
        onPress={() => onPanImage('up')}
        activeOpacity={0.7}
      >
        <Text style={styles.positionButtonText}>↑</Text>
      </TouchableOpacity>
      
      {/* Down Button */}
      <TouchableOpacity 
        style={styles.positionButtonDown}
        onPress={() => onPanImage('down')}
        activeOpacity={0.7}
      >
        <Text style={styles.positionButtonText}>↓</Text>
      </TouchableOpacity>
      
      {/* Left Button */}
      <TouchableOpacity 
        style={styles.positionButtonLeft}
        onPress={() => onPanImage('left')}
        activeOpacity={0.7}
      >
        <Text style={styles.positionButtonText}>←</Text>
      </TouchableOpacity>
      
      {/* Right Button */}
      <TouchableOpacity 
        style={styles.positionButtonRight}
        onPress={() => onPanImage('right')}
        activeOpacity={0.7}
      >
        <Text style={styles.positionButtonText}>→</Text>
      </TouchableOpacity>
      
      {/* Reset Button */}
      <TouchableOpacity 
        style={styles.positionButtonReset}
        onPress={() => onPanImage('reset')}
        activeOpacity={0.7}
      >
        <Text style={styles.positionButtonText}>⌂</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  positionButtonUp: {
    position: 'absolute',
    top: -20,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  positionButtonDown: {
    position: 'absolute',
    bottom: -20,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  positionButtonLeft: {
    position: 'absolute',
    top: '50%',
    left: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  positionButtonRight: {
    position: 'absolute',
    top: '50%',
    right: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  positionButtonReset: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  positionButtonText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '900',
  },
});

export default PositionControls;