const AppConfig = {
  PRODUCTION_SERVER_URL: 'https://codebinary.in',
  PRODUCTION_AUTH_SERVER_URL:  'https://codebinary.in',
  
  APP_NAME: 'Winter',
  VERSION: "1.1.1",
  
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
  },

  // Video overlay compositing (save/share of video templates).
  // Toggle this on to test the on-device (native module) renderer instead of the
  // server-side FFmpeg path. Keep FALLBACK_TO_SERVER on while testing so a client-side
  // failure never blocks a user's save/share - it just silently retries via the backend.
  VIDEO_RENDERING: {
    USE_CLIENT_SIDE: true,
    FALLBACK_TO_SERVER: true,
  },
};

export default AppConfig;