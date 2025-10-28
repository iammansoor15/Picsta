// Centralized routes and API/URL constants
// Use this single source of truth across the app

import AppConfig from '../config/AppConfig';
import ApiConfig from '../config/ApiConfig';

// Route names used in navigation and navigation helpers
export const ROUTES = {
  ROOT: 'root',
  PROFILE_ENTRY: 'ProfileEntry',
  PROFILE_HOME: 'ProfileHome',
  HERO: 'HeroScreen',
  SPLASH: 'SplashScreen',
};

// Server URLs used by the app
export const SERVER_URLS = {
  PICSTAR: 'https://picstar-server.onrender.com',
  // Preferred base URL - use production server as primary
  PREFERRED_BASE: (AppConfig?.DEVELOPMENT?.DEV_SERVER_URL || AppConfig?.PRODUCTION_SERVER_URL || 'https://picstar-server.onrender.com'),
};

// Common backend endpoints
export const ENDPOINTS = {
  HEALTH: '/health',
  PROCESS: '/process',
  BATCH_PROCESS: '/process-batch',
  TEMPLATES: '/api/templates',
};

// Aggregate APIs in one export if consumers want a single import
export const APIS = {
  APP: {
    BASE_URL: SERVER_URLS.PREFERRED_BASE?.replace(/\/$/, ''),
    ENDPOINTS,
  },
  EXTERNAL: ApiConfig,
};

// Re-export external API config for convenience
export { ApiConfig };
