/**
 * API Configuration for external services
 * 
 * This file contains API keys and endpoints for various services.
 * In production, these should be stored securely or in environment variables.
 */

const ApiConfig = {
  // Remove.bg API configuration
  REMOVE_BG: {
    API_KEY: 'YOUR_REMOVE_BG_API_KEY', // Replace with actual API key
    BASE_URL: 'https://api.remove.bg/v1.0',
    ENDPOINTS: {
      REMOVE_BG: '/removebg'
    }
  },
  
  // Alternative background removal services
  ALTERNATIVES: {
    // PhotoRoom API
    PHOTOROOM: {
      API_KEY: 'YOUR_PHOTOROOM_API_KEY',
      BASE_URL: 'https://sdk.photoroom.com/v1',
      ENDPOINT: '/segment'
    },
    
    // Clipdrop API
    CLIPDROP: {
      API_KEY: 'YOUR_CLIPDROP_API_KEY', 
      BASE_URL: 'https://clipdrop-api.co',
      ENDPOINT: '/remove-background/v1'
    }
  },
  
  // Fallback settings
  FALLBACK: {
    USE_MOCK: true, // Set to false when using real APIs
    SIMULATE_DELAY: 2000, // Simulation delay in milliseconds
  }
};

export default ApiConfig;