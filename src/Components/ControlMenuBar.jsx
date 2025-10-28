import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';

const MENU_BAR_HEIGHT = 66; // +10%

const ControlMenuBar = ({ 
  onRotateTemplate, 
  onRotatePhotos, 
  onTogglePosition
}) => {
  return (
    <View style={styles.controlMenuBar}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.controlMenuScrollContent}
        style={styles.controlMenuScrollView}
      >
        <TouchableOpacity 
          style={styles.rotateControlButton} 
          onPress={onRotateTemplate}
        >
          <Text style={styles.controlMenuButtonText}>🔄 Rotate BG Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.rotatePhotosControlButton} 
          onPress={onRotatePhotos}
        >
          <Text style={styles.controlMenuButtonText}>🔄 Rotate Photos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.positionControlButton} 
          onPress={onTogglePosition}
        >
          <Text style={styles.controlMenuButtonText}>📐 Position</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  controlMenuBar: {
    height: MENU_BAR_HEIGHT,
    backgroundColor: '#262626',
    paddingVertical: 9,
    paddingTop: 12,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  controlMenuScrollView: {
    flex: 1,
  },
  controlMenuScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    minWidth: '100%',
  },
  rotateControlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#9C27B0', // Purple for rotate
    marginHorizontal: 6,
    minWidth: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatePhotosControlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF9800', // Orange for rotate photos
    marginHorizontal: 6,
    minWidth: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionControlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF9800', // Orange for position
    marginHorizontal: 6,
    minWidth: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlMenuButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 15,
  },
});

export default ControlMenuBar;