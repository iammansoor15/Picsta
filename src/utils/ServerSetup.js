/**
 * Server Setup Utility
 * 
 * Automatically configures the app to use the Picstar server
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import backgroundRemovalService from '../services/BackgroundRemovalService';
import AppConfig from '../config/AppConfig';

const PICSTAR_SERVER_URL = 'http://31.97.233.69:10000';
const STORAGE_KEY = 'SERVER_CONFIG';

/**
 * Setup the Picstar server configuration
 * This will automatically configure the app to use your deployed server
 */
export const setupPicstarServer = async () => {
  try {
    console.log('🚀 Setting up Picstar server configuration...');
    
    // Prefer DEV server URL if provided, otherwise fall back to Picstar server
    const preferredUrl = AppConfig?.DEVELOPMENT?.DEV_SERVER_URL
      ? AppConfig.DEVELOPMENT.DEV_SERVER_URL
      : PICSTAR_SERVER_URL;

    // Configure the background removal service to use the preferred server
    backgroundRemovalService.setServerUrl(preferredUrl);
    
    // Save the configuration to AsyncStorage for persistence
    const config = {
      serverUrl: preferredUrl,
      timestamp: new Date().toISOString(),
      autoConfigured: true
    };
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    
    console.log('✅ Server configured successfully:', preferredUrl);
    return true;
  } catch (error) {
    console.error('❌ Failed to setup Picstar server:', error);
    return false;
  }
};

/**
 * Test the Picstar server connectivity
 */
export const testPicstarServer = async () => {
  try {
    console.log('🔍 Testing Picstar server connectivity...');
    
    // Test the health endpoint
    const response = await fetch(`${PICSTAR_SERVER_URL}/health`, {
      method: 'GET',
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Picstar server is running:', data);
      return {
        success: true,
        data
      };
    } else {
      console.log('❌ Picstar server health check failed:', response.status);
      return {
        success: false,
        error: `Server returned ${response.status}`
      };
    }
  } catch (error) {
    console.log('❌ Picstar server connectivity test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get the current server configuration
 */
export const getPicstarServerConfig = () => {
  return {
    serverUrl: PICSTAR_SERVER_URL,
    endpoints: {
      health: '/health',
      process: '/process',
      batch: '/process-batch',
      templates: '/api/templates'
    }
  };
};

export default {
  setupPicstarServer,
  testPicstarServer,
  getPicstarServerConfig,
  PICSTAR_SERVER_URL
};