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
  // Use the same config as BackgroundRemovalService
  return 'http://192.168.1.46:10000'; // Your local network IP
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

      // Check with server
      const token = await getToken();
      if (!token) {
        console.log('⚠️ [SUBSCRIPTION] No auth token found');
        return { active: false, status: 'none', currentPeriodEnd: null };
      }

      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/auth/subscription-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

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
