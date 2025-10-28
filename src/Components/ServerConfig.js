import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import backgroundRemovalService from '../services/BackgroundRemovalService';

const STORAGE_KEY = 'SERVER_CONFIG';

const ServerConfig = ({ onConfigSaved, initialVisible = false }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setServerUrl(config.serverUrl || '');
        setCurrentConfig(config);
        
        // Apply the saved configuration
        if (config.serverUrl) {
          backgroundRemovalService.setServerUrl(config.serverUrl);
        }
      }
    } catch (error) {
      console.error('Failed to load server config:', error);
    }
  };

  const validateUrl = (url) => {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  };

  const testConnection = async (url) => {
    try {
      setIsLoading(true);
      
      // Set the server URL temporarily for testing
      backgroundRemovalService.setServerUrl(url);
      
      // Test the connection
      const isConnected = await backgroundRemovalService.testConnection();
      
      if (isConnected) {
        Alert.alert(
          'Connection Successful! ✅',
          `Successfully connected to server at:\n${url}`,
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert(
          'Connection Failed ❌',
          `Cannot connect to server at:\n${url}\n\nPlease check:\n• Server URL is correct\n• Server is running\n• Network connection`,
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      Alert.alert(
        'Connection Error ❌',
        `Error testing connection:\n${error.message}`,
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!validateUrl(serverUrl)) {
      Alert.alert(
        'Invalid URL ⚠️',
        'Please enter a valid HTTP or HTTPS URL.\n\nExample:\nhttps://your-app.onrender.com',
        [{ text: 'OK' }]
      );
      return;
    }

    // Test connection first
    const connectionSuccess = await testConnection(serverUrl);
    
    if (connectionSuccess) {
      try {
        const config = {
          serverUrl: serverUrl.replace(/\/$/, ''), // Remove trailing slash
          timestamp: new Date().toISOString()
        };
        
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        setCurrentConfig(config);
        
        // Apply the configuration
        backgroundRemovalService.setServerUrl(config.serverUrl);
        
        Alert.alert(
          'Configuration Saved! 💾',
          `Server URL saved successfully:\n${config.serverUrl}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setIsVisible(false);
                if (onConfigSaved) {
                  onConfigSaved(config);
                }
              }
            }
          ]
        );
      } catch (error) {
        Alert.alert(
          'Save Failed ❌',
          `Failed to save configuration: ${error.message}`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const clearConfiguration = async () => {
    Alert.alert(
      'Clear Configuration ⚠️',
      'This will remove the saved server URL and switch back to development mode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setServerUrl('');
              setCurrentConfig(null);
              
              // Reset to development mode
              backgroundRemovalService.setServerUrl(null);
              
              Alert.alert(
                'Configuration Cleared ✅',
                'Switched back to development mode.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', `Failed to clear configuration: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const getCurrentStatus = () => {
    const config = backgroundRemovalService.getServerConfig();
    
    if (config.isDevelopment) {
      return {
        status: 'Development Mode 🔧',
        description: 'Using local development server',
        color: '#FF9500'
      };
    } else {
      return {
        status: 'Production Mode 🚀',
        description: `Connected to: ${config.serverUrl}`,
        color: '#34C759'
      };
    }
  };

  if (!isVisible) {
    const status = getCurrentStatus();
    
    return (
      <View style={styles.statusContainer}>
        <TouchableOpacity 
          style={[styles.statusButton, { backgroundColor: status.color }]}
          onPress={() => setIsVisible(true)}
        >
          <Text style={styles.statusText}>{status.status}</Text>
          <Text style={styles.statusDescription}>{status.description}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Server Configuration ⚙️</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setIsVisible(false)}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Configure your server URL for background removal processing.
      </Text>

      <View style={styles.currentConfigContainer}>
        <Text style={styles.currentConfigTitle}>Current Status:</Text>
        {(() => {
          const status = getCurrentStatus();
          return (
            <View style={[styles.statusCard, { borderColor: status.color }]}>
              <Text style={[styles.statusCardTitle, { color: status.color }]}>
                {status.status}
              </Text>
              <Text style={styles.statusCardDescription}>
                {status.description}
              </Text>
            </View>
          );
        })()}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Server URL:</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="https://your-app.onrender.com"
          placeholderTextColor="#999"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={saveConfiguration}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Test & Save</Text>
          )}
        </TouchableOpacity>

        {currentConfig && (
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearConfiguration}
          >
            <Text style={styles.buttonText}>Clear Config</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.examplesContainer}>
        <Text style={styles.examplesTitle}>Examples:</Text>
        <Text style={styles.exampleText}>• https://your-app.onrender.com</Text>
        <Text style={styles.exampleText}>• https://your-app.herokuapp.com</Text>
        <Text style={styles.exampleText}>• https://your-domain.com</Text>
        <Text style={styles.exampleText}>• http://192.168.1.100:3000 (local)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statusContainer: {
    margin: 10,
  },
  statusButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusDescription: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  container: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  currentConfigContainer: {
    marginBottom: 20,
  },
  currentConfigTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusCard: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#f8f9fa',
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusCardDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  examplesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});

export default ServerConfig;