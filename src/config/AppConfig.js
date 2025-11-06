const AppConfig = {
  PRODUCTION_SERVER_URL: 'http://31.97.233.69:10000',
  // Optional separate auth API URL (production)
  PRODUCTION_AUTH_SERVER_URL: null,
  
  // App settings
  APP_NAME: 'Picstar',
  VERSION: '1.0.0',
  
  // Background removal settings
  BACKGROUND_REMOVAL: {
    MAX_IMAGES_PER_BATCH: 10,
    SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    MAX_FILE_SIZE_MB: 15,
  },
  
  // Development settings
  DEVELOPMENT: {
    ENABLE_LOGGING: true,
    SHOW_SERVER_CONFIG: true, // Enable manual server config for debugging

    // Using local LAN server for development
    DEV_SERVER_URL: null, // Disabled - use production server
    DEV_AUTH_SERVER_URL: null,

    // Allow production fallback
    USE_PRODUCTION_FALLBACK: true, // Enable production server

  }
};

export default AppConfig;
