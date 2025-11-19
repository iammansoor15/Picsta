const AppConfig = {
  PRODUCTION_SERVER_URL: "http://192.168.1.75:10000",
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

    // Using local server URL for development
    // Use localhost:10000 when connected via USB (adb reverse tcp:10000 tcp:10000)
    // Use 192.168.1.75:10000 for wireless debugging on same network
    DEV_SERVER_URL: "http://localhost:10000", // USB debugging with adb reverse
    // DEV_SERVER_URL: "http://192.168.1.75:10000", // Wireless debugging (uncomment if needed)
    DEV_AUTH_SERVER_URL: null,

    // Allow production fallback
    USE_PRODUCTION_FALLBACK: true, // Use production server

  }
};

export default AppConfig;
