import { BASE_URL } from '@env';

// Validated by the build tooling before Metro bundles the application.
const baseUrl = BASE_URL.trim().replace(/\/+$/, '');

const AppConfig = {
  BASE_URL: baseUrl,
  PRODUCTION_SERVER_URL: baseUrl,
  PRODUCTION_AUTH_SERVER_URL: baseUrl,
  
  APP_NAME: 'Winter',
  VERSION: "1.1.3",
  
  BACKGROUND_REMOVAL: {
    MAX_IMAGES_PER_BATCH: 10,
    SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    MAX_FILE_SIZE_MB: 15,
  },
  
  DEVELOPMENT: {
    ENABLE_LOGGING: true,
    SHOW_SERVER_CONFIG: true,

    DEV_SERVER_URL: baseUrl,
    DEV_AUTH_SERVER_URL: baseUrl,

    USE_PRODUCTION_FALLBACK: true,
  },

  // Video overlay compositing (save/share of video templates).
  // Toggle this on to test the on-device (native module) renderer instead of the
  // server-side FFmpeg path. Keep FALLBACK_TO_SERVER on while testing so a client-side
  // failure never blocks a user's save/share - it just silently retries via the backend.
  VIDEO_PLAYBACK: {
    USE_HLS: true,
  },

  VIDEO_RENDERING: {
    USE_CLIENT_SIDE: true,
    FALLBACK_TO_SERVER: true,
  },
};

export default AppConfig;
