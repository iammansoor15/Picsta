import AsyncStorage from '@react-native-async-storage/async-storage';
import backgroundRemovalService from './BackgroundRemovalService';

// Support both old and new token keys
const TOKEN_KEYS = ['authToken', 'AUTH_TOKEN'];

/**
 * Get auth token (checks both old and new keys)
 */
const getToken = async () => {
  for (const key of TOKEN_KEYS) {
    const token = await AsyncStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

/**
 * Get base URL for API calls - uses unified config from BackgroundRemovalService
 */
const getBaseUrl = () => {
  const config = backgroundRemovalService.getServerConfig();
  return config?.baseUrl?.replace(/\/$/, '') || 'https://codebinary.in';
};

/**
 * Subscription Service
 */
const SubscriptionService = {
  /**
   * Check if user has an active subscription
   * @returns {Promise<{active: boolean, status: string, currentPeriodEnd: string|null}>}
   */
  async checkSubscriptionStatus() {
    try {
      console.log('🔍 [SUBSCRIPTION] Checking subscription status...');

      // Get user info for debugging
      const userJson = await AsyncStorage.getItem('user') || await AsyncStorage.getItem('AUTH_USER');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          console.log('👤 [SUBSCRIPTION] Checking for user:', user?.name || user?.phone || 'unknown');
        } catch (e) {}
      }

      // First check local cache for quick validation
      const cachedActive = await AsyncStorage.getItem('subscriptionActive');
      const cachedExpiry = await AsyncStorage.getItem('subscriptionExpiry');

      console.log('📦 [SUBSCRIPTION] Cache state:', { cachedActive, cachedExpiry });

      if (cachedActive === 'true' && cachedExpiry) {
        const expiryDate = new Date(cachedExpiry);
        const now = new Date();

        if (expiryDate > now) {
          console.log('✅ [SUBSCRIPTION] Active (from cache), expires:', expiryDate.toISOString());

          // Start background refresh but don't wait for it
          this._refreshSubscriptionInBackground().catch(err => {
            console.warn('⚠️ [SUBSCRIPTION] Background refresh failed:', err.message);
          });

          return {
            active: true,
            status: 'active',
            currentPeriodEnd: cachedExpiry,
            fromCache: true,
          };
        } else {
          console.log('⏰ [SUBSCRIPTION] Cached subscription expired');
          // Clear expired cache
          await AsyncStorage.removeItem('subscriptionActive');
          await AsyncStorage.removeItem('subscriptionExpiry');
        }
      } else {
        console.log('📭 [SUBSCRIPTION] No valid cache found, will check server');
      }

      // Check with server with reasonable timeout (10 seconds)
      const token = await getToken();
      if (!token) {
        console.log('⚠️ [SUBSCRIPTION] No auth token found');
        return { active: false, status: 'none', currentPeriodEnd: null };
      }

      console.log('🔑 [SUBSCRIPTION] Token found, checking with server...');
      const baseUrl = getBaseUrl();
      console.log('🌐 [SUBSCRIPTION] Server URL:', baseUrl);

      // Add timeout to prevent long delays (increased to 10 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        console.log('📡 [SUBSCRIPTION] Fetching from:', `${baseUrl}/api/auth/subscription-status`);
        const response = await fetch(`${baseUrl}/api/auth/subscription-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📨 [SUBSCRIPTION] Response status:', response.status);
        if (!response.ok) {
          console.error('❌ [SUBSCRIPTION] Server returned error:', response.status);
          // On server error, check cache as fallback
          const cachedActive = await AsyncStorage.getItem('subscriptionActive');
          const cachedExpiry = await AsyncStorage.getItem('subscriptionExpiry');
          if (cachedActive === 'true' && cachedExpiry && new Date(cachedExpiry) > new Date()) {
            console.log('⚠️ [SUBSCRIPTION] Server error, using valid cache');
            return { active: true, status: 'active', currentPeriodEnd: cachedExpiry, fromCache: true };
          }
          return { active: false, status: 'none', currentPeriodEnd: null };
        }

        const data = await response.json();
        console.log('📦 [SUBSCRIPTION] Server response:', JSON.stringify(data));

        if (data.success && data.data) {
          console.log('✅ [SUBSCRIPTION] Status from server:', data.data.status, '| Active:', data.data.active);

          // Update local cache
          if (data.data.active && data.data.currentPeriodEnd) {
            await AsyncStorage.setItem('subscriptionActive', 'true');
            await AsyncStorage.setItem('subscriptionExpiry', data.data.currentPeriodEnd);
            console.log('💾 [SUBSCRIPTION] Cached until:', data.data.currentPeriodEnd);
          } else {
            console.log('⚠️ [SUBSCRIPTION] Server says NOT active, clearing cache');
            await AsyncStorage.removeItem('subscriptionActive');
            await AsyncStorage.removeItem('subscriptionExpiry');
          }

          return {
            active: data.data.active,
            status: data.data.status,
            currentPeriodEnd: data.data.currentPeriodEnd,
            fromCache: false,
          };
        }

        console.log('⚠️ [SUBSCRIPTION] Invalid server response format');
        return { active: false, status: 'none', currentPeriodEnd: null };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ [SUBSCRIPTION] Request timeout after 10 seconds');
          // On timeout, check cache as fallback
          const cachedActive = await AsyncStorage.getItem('subscriptionActive');
          const cachedExpiry = await AsyncStorage.getItem('subscriptionExpiry');
          if (cachedActive === 'true' && cachedExpiry && new Date(cachedExpiry) > new Date()) {
            console.log('⚠️ [SUBSCRIPTION] Timeout, using valid cache');
            return { active: true, status: 'active', currentPeriodEnd: cachedExpiry, fromCache: true };
          }
          throw new Error('Subscription check timeout');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Error checking status:', error.message);
      // On error, check cache as fallback
      const cachedActive = await AsyncStorage.getItem('subscriptionActive');
      const cachedExpiry = await AsyncStorage.getItem('subscriptionExpiry');

      if (cachedActive === 'true' && cachedExpiry) {
        const expiryDate = new Date(cachedExpiry);
        if (expiryDate > new Date()) {
          console.log('⚠️ [SUBSCRIPTION] Using cached status (network error)');
          return { active: true, status: 'active', currentPeriodEnd: cachedExpiry, fromCache: true };
        }
      }

      return { active: false, status: 'none', currentPeriodEnd: null };
    }
  },

  /**
   * Refresh subscription status in background (non-blocking)
   * @private
   */
  async _refreshSubscriptionInBackground() {
    try {
      const token = await getToken();
      if (!token) return;

      const baseUrl = getBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/api/auth/subscription-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          if (data.data.active && data.data.currentPeriodEnd) {
            await AsyncStorage.setItem('subscriptionActive', 'true');
            await AsyncStorage.setItem('subscriptionExpiry', data.data.currentPeriodEnd);
            console.log('🔄 [SUBSCRIPTION] Background refresh completed');
          } else {
            await AsyncStorage.removeItem('subscriptionActive');
            await AsyncStorage.removeItem('subscriptionExpiry');
          }
        }
      }
    } catch (error) {
      // Silently fail for background refresh
      console.log('⚠️ [SUBSCRIPTION] Background refresh failed:', error.message);
    }
  },

  /**
   * Clear subscription cache (used on logout)
   */
  async clearCache() {
    try {
      await AsyncStorage.removeItem('subscriptionActive');
      await AsyncStorage.removeItem('subscriptionExpiry');
      console.log('🗑️ [SUBSCRIPTION] Cache cleared');
    } catch (error) {
      console.warn('Failed to clear subscription cache:', error);
    }
  },
};

export default SubscriptionService;
