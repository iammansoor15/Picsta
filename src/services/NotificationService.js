import PushNotification from 'react-native-push-notification';
import {Platform, PermissionsAndroid} from 'react-native';
import AppConfig from '../config/AppConfig';

let onTapCallback = null;
let pollingInterval = null;
let lastNotificationId = null;
let isConfigured = false;

const NotificationService = {
  /**
   * Configure push notifications
   */
  configure: () => {
    if (isConfigured) {
      return;
    }

    PushNotification.configure({
      // Called when a notification is pressed
      onNotification: function (notification) {
        console.log('📱 Notification tapped:', notification);

        // Handle notification tap
        if (notification.userInteraction && onTapCallback) {
          const data = {
            id: notification.id,
            videoUrl: notification.videoUrl,
            imageUrl: notification.imageUrl,
            subcategory: notification.subcategory,
            mainCategory: notification.mainCategory,
          };
          onTapCallback(data);
        }
      },

      // IOS ONLY (optional): default: all - Permissions to register.
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      /**
       * (optional) default: true
       * - Specified if permissions (ios) and token (android and ios) will requested or not,
       * - if not, you must call PushNotificationsHandler.requestPermissions() later
       * - if you are not using remote notification or do not have Firebase installed, use this:
       *     requestPermissions: Platform.OS === 'ios'
       */
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
    PushNotification.createChannel(
      {
        channelId: 'picstar-channel',
        channelName: 'Picstar Notifications',
        channelDescription: 'Notifications for Picstar app',
        playSound: true,
        soundName: 'default',
        importance: 4, // HIGH
        vibrate: true,
      },
      created => console.log(`📢 Notification channel created: ${created}`),
    );

    isConfigured = true;
    console.log('✅ PushNotification configured');
  },

  /**
   * Request notification permissions (Android 13+)
   */
  requestPermissions: async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('📱 Notification permissions granted');
          return true;
        } else {
          console.warn('⚠️ Notification permissions denied');
          return false;
        }
      }

      // For iOS or older Android versions
      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  },

  /**
   * Fetch current notification from server
   */
  fetchNotification: async () => {
    try {
      const serverUrl = __DEV__
        ? AppConfig.DEVELOPMENT.DEV_SERVER_URL
        : AppConfig.PRODUCTION_SERVER_URL;

      const response = await fetch(`${serverUrl}/api/notifications/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.notification) {
        return data.notification;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching notification:', error.message);
      return null;
    }
  },

  /**
   * Display notification using react-native-push-notification
   */
  displayNotification: async notification => {
    try {
      const notificationConfig = {
        channelId: 'picstar-channel',
        title: notification.title,
        message: notification.message,
        playSound: true,
        soundName: 'default',
        importance: 'high',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        visibility: 'public',
        autoCancel: true,
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_notification',
        userInfo: {
          id: notification.id,
          videoUrl: notification.videoUrl,
          imageUrl: notification.imageUrl,
          subcategory: notification.subcategory,
          mainCategory: notification.mainCategory,
        },
      };

      // Add big picture style if image is available
      if (notification.imageUrl) {
        notificationConfig.bigPictureUrl = notification.imageUrl;
        notificationConfig.largeIconUrl = notification.imageUrl;
      }

      PushNotification.localNotification(notificationConfig);
      console.log('✅ Notification displayed:', notification.title);

      return true;
    } catch (error) {
      console.error('❌ Error displaying notification:', error);
      return false;
    }
  },

  /**
   * Poll server for new notifications
   */
  startPolling: () => {
    // Poll every 12 seconds (server generates every 10 seconds)
    pollingInterval = setInterval(async () => {
      const notification = await NotificationService.fetchNotification();

      if (notification && notification.id !== lastNotificationId) {
        // New notification received
        console.log('🔔 New notification from server:', notification.title);
        lastNotificationId = notification.id;

        // Display the notification
        await NotificationService.displayNotification(notification);
      }
    }, 12000); // Check every 12 seconds

    console.log('🔄 Notification polling started (every 12 seconds)');
  },

  /**
   * Stop polling
   */
  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      console.log('🛑 Notification polling stopped');
    }
  },

  /**
   * Start the notification service
   */
  start: async () => {
    console.log('📱 NotificationService starting...');

    // Configure push notifications
    NotificationService.configure();

    // Request permissions (Android 13+)
    const hasPermission = await NotificationService.requestPermissions();

    if (!hasPermission) {
      console.warn('⚠️ Notification permissions not granted');
      // Continue anyway - permissions might be granted later
    }

    // Fetch and display initial notification immediately
    const initialNotification = await NotificationService.fetchNotification();
    if (initialNotification) {
      lastNotificationId = initialNotification.id;
      await NotificationService.displayNotification(initialNotification);
    }

    // Start polling for new notifications
    NotificationService.startPolling();

    console.log('✅ NotificationService started successfully');
  },

  /**
   * Stop the notification service and cleanup
   */
  stop: () => {
    console.log('📱 NotificationService stopping...');

    // Stop polling
    NotificationService.stopPolling();

    // Clear callback
    onTapCallback = null;
    lastNotificationId = null;

    // Cancel all notifications
    PushNotification.cancelAllLocalNotifications();

    console.log('✅ NotificationService stopped');
  },

  /**
   * Set callback for when user taps a notification
   * @param {Function} callback - Called with notification data
   */
  setOnTapCallback: callback => {
    onTapCallback = callback;
    console.log('📌 Notification tap callback set');
  },

  /**
   * Send a local notification manually (for testing)
   * @param {Object} options - Notification options (title, message, data, etc.)
   */
  sendNotification: async options => {
    console.log('📬 Sending manual notification:', options);

    const notification = {
      id: Date.now().toString(),
      title: options.title || 'Test Notification',
      message: options.message || 'This is a test notification',
      videoUrl: options.videoUrl || '',
      imageUrl: options.imageUrl || '',
      subcategory: options.subcategory || '',
      mainCategory: options.mainCategory || '',
    };

    await NotificationService.displayNotification(notification);
  },
};

export default NotificationService;
