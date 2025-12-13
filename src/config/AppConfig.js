const AppConfig = {
  PRODUCTION_SERVER_URL: 'https://codebinary.in',
  PRODUCTION_AUTH_SERVER_URL:  'https://codebinary.in',
  
  APP_NAME: 'Winter',
  VERSION: "1.0.10",
  
  BACKGROUND_REMOVAL: {
    MAX_IMAGES_PER_BATCH: 10,
    SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    MAX_FILE_SIZE_MB: 15,
  },
  
  DEVELOPMENT: {
    ENABLE_LOGGING: true,
    SHOW_SERVER_CONFIG: true, 

    DEV_SERVER_URL: 'https://codebinary.in',
    DEV_AUTH_SERVER_URL: 'https://codebinary.in',

    USE_PRODUCTION_FALLBACK: true, 
  }
};

export default AppConfig;