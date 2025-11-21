const AppConfig = {
  PRODUCTION_SERVER_URL: 'http://31.97.233.69:10000',
  PRODUCTION_AUTH_SERVER_URL:  'http://31.97.233.69:10000',
  
  APP_NAME: 'Winter',
  VERSION: '1.0.0',
  
  BACKGROUND_REMOVAL: {
    MAX_IMAGES_PER_BATCH: 10,
    SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    MAX_FILE_SIZE_MB: 15,
  },
  
  DEVELOPMENT: {
    ENABLE_LOGGING: true,
    SHOW_SERVER_CONFIG: true, 

    DEV_SERVER_URL: 'http://31.97.233.69:10000',
    DEV_AUTH_SERVER_URL: 'http://31.97.233.69:10000',

    USE_PRODUCTION_FALLBACK: true, 
  }
};

export default AppConfig;