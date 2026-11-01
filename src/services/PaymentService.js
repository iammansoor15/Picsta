import RazorpayCheckout from 'react-native-razorpay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import backgroundRemovalService from './BackgroundRemovalService';
import { ENDPOINTS } from '../constants/RoutesAndUrls';
import AppConfig from '../config/AppConfig';

// Support both old and new token keys
const TOKEN_KEYS = ['authToken', 'AUTH_TOKEN'];

/**
 * Get base URL for API calls
 */
const getBaseUrl = () => {
  const config = backgroundRemovalService.getServerConfig();
  return config?.baseUrl?.replace(/\/$/, '') || AppConfig.BASE_URL;
};

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
 * Payment Service for Razorpay integration
 */
const PaymentService = {
  /**
   * Create a Razorpay order
   * @param {number} amount - Amount in rupees (will be converted to paise)
   * @param {string} currency - Currency code (default: INR)
   * @param {Object} notes - Additional metadata
   * @returns {Promise<Object>} Order details from backend
   */
  async createOrder(amount, currency = 'INR', notes = {}) {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}${ENDPOINTS.PAYMENTS.CREATE_ORDER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          currency,
          notes,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('PaymentService.createOrder: Non-JSON response:', text.substring(0, 200));
        throw new Error('Payment service is unavailable. Please check your server configuration.');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      return data.data;
    } catch (error) {
      console.error('PaymentService.createOrder error:', error);
      throw error;
    }
  },

  /**
   * Verify payment after successful payment
   * @param {Object} paymentData - Payment response from Razorpay
   * @returns {Promise<Object>} Verification result from backend
   */
  async verifyPayment(paymentData) {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}${ENDPOINTS.PAYMENTS.VERIFY_PAYMENT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('PaymentService.verifyPayment: Non-JSON response:', text.substring(0, 200));
        throw new Error('Payment verification service is unavailable. Please check your server configuration.');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed');
      }

      return data.data;
    } catch (error) {
      console.error('PaymentService.verifyPayment error:', error);
      throw error;
    }
  },

  /**
   * Open Razorpay checkout
   * @param {Object} options - Checkout options
   * @param {string} options.orderId - Razorpay order ID
   * @param {number} options.amount - Amount in paise
   * @param {string} options.currency - Currency code
   * @param {string} options.keyId - Razorpay key ID
   * @param {string} options.name - User name (optional)
   * @param {string} options.email - User email (optional)
   * @param {string} options.contact - User phone (optional)
   * @param {string} options.description - Payment description
   * @returns {Promise<Object>} Payment response from Razorpay
   */
  async openCheckout({
    orderId,
    amount,
    currency = 'INR',
    keyId,
    name = '',
    email = '',
    contact = '',
    description = 'Payment for Picstar',
  }) {
    return new Promise((resolve, reject) => {
      const options = {
        description,
        image: 'https://your-logo-url.com/logo.png', // Replace with your app logo URL
        currency,
        key: keyId,
        amount,
        order_id: orderId,
        name: 'Picstar',
        // Prevent Razorpay from attempting a web redirect after success
        redirect: false,
        // Disable Razorpay's retry screen which can flash errors post-success
        retry: { enabled: false },
        // Recommended for Android to validate app hash during UPI
        send_sms_hash: true,
        prefill: {
          name,
          email,
          contact,
        },
        theme: {
          color: '#3B82F6',
        },
        // Defensive: ensure SDK keeps control within the app
        modal: {
          confirm_close: false,
          animation: true,
        },
      };

      console.log('💳 [RAZORPAY] Opening checkout with options:', JSON.stringify(options, null, 2));

      RazorpayCheckout.open(options)
        .then((data) => {
          // Payment success
          console.log('✅ [RAZORPAY] Payment success callback received');
          console.log('📦 [RAZORPAY] Success data:', JSON.stringify(data, null, 2));
          console.log('🔑 [RAZORPAY] Payment ID:', data.razorpay_payment_id);
          console.log('🔑 [RAZORPAY] Order ID:', data.razorpay_order_id);
          console.log('🔑 [RAZORPAY] Signature:', data.razorpay_signature);
          resolve(data);
        })
        .catch((error) => {
          // Payment failed or cancelled
          console.error('❌ [RAZORPAY] Payment error callback received');
          console.error('📦 [RAZORPAY] Error data:', JSON.stringify(error, null, 2));
          console.error('🔴 [RAZORPAY] Error code:', error.code);
          console.error('🔴 [RAZORPAY] Error description:', error.description);
          reject(error);
        });
    });
  },

  /**
   * Complete payment flow: create order, open checkout, verify payment
   * @param {number} amount - Amount in rupees
   * @param {Object} userInfo - User information for prefill
   * @param {Object} notes - Additional notes/metadata
   * @returns {Promise<Object>} Verification result
   */
  async processPayment(amount, userInfo = {}, notes = {}, opts = {}) {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 [PAYMENT FLOW] Starting payment process');
      console.log('='.repeat(60));
      
      // Step 1: Create order on backend
      console.log('\n📝 [STEP 1/3] Creating order on backend');
      console.log('💰 Amount:', amount, 'rupees');
      console.log('👤 User info:', JSON.stringify(userInfo));
      console.log('📋 Notes:', JSON.stringify(notes));
      
      const orderData = await this.createOrder(amount, 'INR', notes);
      
      console.log('✅ [STEP 1/3] Order created successfully!');
      console.log('🆔 Order ID:', orderData.orderId);
      console.log('💵 Amount (paise):', orderData.amount);
      console.log('🔑 Razorpay Key ID:', orderData.keyId);
      console.log('🎫 Transaction ID:', orderData.transactionId);

      // Step 2: Open Razorpay checkout
      console.log('\n💳 [STEP 2/3] Opening Razorpay checkout UI');
      console.log('⏳ Waiting for user to complete payment...');
      
      const paymentResponse = await this.openCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        name: userInfo.name || '',
        email: userInfo.email || '',
        contact: userInfo.phone || '',
        description: notes.description || 'Payment for Picstar',
      });

      console.log('\n✅ [STEP 2/3] Razorpay returned success!');
      console.log('📦 Payment response received from Razorpay SDK');
      console.log('⚠️  NOTE: Razorpay may show error screen now (ignore it!)');

      // Step 3: Verify payment on backend
      console.log('\n🔐 [STEP 3/3] Verifying payment signature on backend');
      console.log('🔑 Sending verification data to server...');

      // Notify UI to show verification overlay AFTER Razorpay success
      if (opts && typeof opts.onVerifyStart === 'function') {
        try {
          console.log('🛡️ [PAYMENT FLOW] Triggering onVerifyStart callback (show verification UI)');
          opts.onVerifyStart({
            orderId: orderData.orderId,
            amount: orderData.amount,
            paymentId: paymentResponse.razorpay_payment_id,
          });
        } catch (cbErr) {
          console.warn('⚠️ [PAYMENT FLOW] onVerifyStart callback error:', cbErr?.message || cbErr);
        }
      }
      
      const verificationResult = await this.verifyPayment({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      });

      console.log('\n✅ [STEP 3/3] Payment verified successfully!');
      console.log('🎉 [PAYMENT FLOW] COMPLETE - Payment is confirmed!');
      console.log('📊 Final result:', JSON.stringify(verificationResult, null, 2));
      console.log('='.repeat(60) + '\n');
      
      return verificationResult;
    } catch (error) {
      console.error('\n❌ [PAYMENT FLOW] ERROR occurred!');
      console.error('🔴 Error at stage:', error.stage || 'unknown');
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error details:', JSON.stringify(error, null, 2));
      console.error('='.repeat(60) + '\n');
      throw error;
    }
  },

  /**
   * Get user's transaction history
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of transactions
   */
  async getTransactions({ limit = 20, skip = 0, status = null } = {}) {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const baseUrl = getBaseUrl();
      const params = new URLSearchParams({ limit, skip });
      if (status) params.append('status', status);

      const response = await fetch(`${baseUrl}${ENDPOINTS.PAYMENTS.TRANSACTIONS}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('PaymentService.getTransactions: Non-JSON response:', text.substring(0, 200));
        throw new Error('Transaction service is unavailable. Please check your server configuration.');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      return data.data;
    } catch (error) {
      console.error('PaymentService.getTransactions error:', error);
      throw error;
    }
  },
};

export default PaymentService;
