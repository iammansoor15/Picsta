import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const BackgroundRemovalOverlay = ({ 
  isRemovingBackground, 
  backgroundRemovalStatus, 
  backgroundRemovalProgress 
}) => {
  if (!isRemovingBackground) return null;

  return (
    <View style={styles.backgroundRemovalOverlay}>
      <View style={styles.backgroundRemovalModal}>
        <View style={styles.backgroundRemovalHeader}>
          <Text style={styles.backgroundRemovalTitle}>🎭 Background Removal</Text>
          <Text style={styles.backgroundRemovalSubtitle}>Processing images with AI...</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${(backgroundRemovalProgress * 100).toFixed(1)}%` }
              ]} 
            />
          </View>
          <Text style={styles.backgroundRemovalStatus}>
            {backgroundRemovalStatus || 'Processing...'}
          </Text>
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
  );
};

const styles = StyleSheet.create({
  backgroundRemovalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    elevation: 20,
  },
  backgroundRemovalModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    minWidth: 280,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backgroundRemovalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  backgroundRemovalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c2c2c',
    marginBottom: 4,
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
  batchProgressContainer: {
    marginTop: 16,
    width: '100%',
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
});

export default BackgroundRemovalOverlay;