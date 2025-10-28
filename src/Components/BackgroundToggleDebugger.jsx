import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BackgroundToggleService from '../services/BackgroundToggleService';

/**
 * Debug component to test BackgroundToggleService functionality
 * This can be added temporarily to HeroScreen to debug the button toggle issue
 */
const BackgroundToggleDebugger = () => {
  const [serviceState, setServiceState] = useState(BackgroundToggleService.getCurrentState());
  const [localState, setLocalState] = useState(false);

  useEffect(() => {
    // Listen to service state changes
    const unsubscribe = BackgroundToggleService.addListener((newState) => {
      console.log('🔴 DEBUG: Service state changed to:', newState);
      setServiceState(newState);
      setLocalState(newState.isBackgroundRemoved);
    });

    return unsubscribe;
  }, []);

  const simulateBackgroundRemovalSuccess = () => {
    console.log('🧪 DEBUG: Simulating background removal success...');
    BackgroundToggleService.onBackgroundRemovalSuccess({ test: true });
  };

  const simulateBackgroundRestoreSuccess = () => {
    console.log('🧪 DEBUG: Simulating background restore success...');
    BackgroundToggleService.onBackgroundRestoreSuccess({ test: true });
  };

  const resetService = () => {
    console.log('🧪 DEBUG: Resetting service...');
    BackgroundToggleService.reset();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 BackgroundToggle Debugger</Text>
      
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>Service State:</Text>
        <Text style={styles.stateValue}>
          Remove BG: {serviceState.removeBgEnabled ? '✅' : '❌'}
        </Text>
        <Text style={styles.stateValue}>
          Restore BG: {serviceState.restoreBgEnabled ? '✅' : '❌'}
        </Text>
        <Text style={styles.stateValue}>
          Local isBackgroundRemoved: {localState ? 'true' : 'false'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#4CAF50' }]}
          onPress={simulateBackgroundRemovalSuccess}
        >
          <Text style={styles.buttonText}>Simulate Remove BG Success</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#2196F3' }]}
          onPress={simulateBackgroundRestoreSuccess}
        >
          <Text style={styles.buttonText}>Simulate Restore BG Success</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#FF9800' }]}
          onPress={resetService}
        >
          <Text style={styles.buttonText}>Reset Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    margin: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff0000',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#ff0000',
  },
  stateContainer: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  stateText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  stateValue: {
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  button: {
    padding: 8,
    margin: 4,
    borderRadius: 4,
    minWidth: 80,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default BackgroundToggleDebugger;