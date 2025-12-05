import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * Get base URL for API calls
 */
const getBaseUrl = () => {
  // Use production server URL
  return 'http://31.97.233.69:10000';
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

      // First check local cache for quick validation
      const cachedActive = await AsyncStorage.getItem('subscriptionActive');
      const cachedExpiry = await AsyncStorage.getItem('subscriptionExpiry');

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
      }

      // Check with server with shorter timeout (5 seconds instead of default 15)
      const token = await getToken();
      if (!token) {
        console.log('⚠️ [SUBSCRIPTION] No auth token found');
        return { active: false, status: 'none', currentPeriodEnd: null };
      }

      const baseUrl = getBaseUrl();

      // Add timeout to prevent long delays
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(`${baseUrl}/api/auth/subscription-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error('❌ [SUBSCRIPTION] Server returned:', response.status);
          return { active: false, status: 'none', currentPeriodEnd: null };
        }

        const data = await response.json();

        if (data.success && data.data) {
          console.log('✅ [SUBSCRIPTION] Status from server:', data.data.status);

          // Update local cache
          if (data.data.active && data.data.currentPeriodEnd) {
            await AsyncStorage.setItem('subscriptionActive', 'true');
            await AsyncStorage.setItem('subscriptionExpiry', data.data.currentPeriodEnd);
            console.log('💾 [SUBSCRIPTION] Cached until:', data.data.currentPeriodEnd);
          } else {
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

        return { active: false, status: 'none', currentPeriodEnd: null };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ [SUBSCRIPTION] Request timeout after 5 seconds');
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
