import PushNotification from 'react-native-push-notification';
import {Platform, PermissionsAndroid, AppState} from 'react-native';
import AppConfig from '../config/AppConfig';

let onTapCallback = null;
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
      // Called when a remote or local notification is opened or received
      onNotification: function (notification) {
        console.log('📱 Notification received:', notification);

        // Only show notification if app is in background/closed
        const currentAppState = AppState.currentState;

        // For incoming push notifications, they're handled automatically by the system
        // We only need to handle the tap action here
        if (notification.userInteraction) {
          console.log('📱 User tapped notification');
          if (onTapCallback) {
            const data = {
              id: notification.id,
              videoUrl: notification.data?.videoUrl || notification.videoUrl,
              imageUrl: notification.data?.imageUrl || notification.imageUrl,
              subcategory: notification.data?.subcategory || notification.subcategory,
              mainCategory: notification.data?.mainCategory || notification.mainCategory,
            };
            onTapCallback(data);
          }
        } else if (currentAppState === 'active') {
          // If notification arrives while app is open, don't show it
          console.log('🚫 App is active - notification received but not displayed');
        }
      },

      // Called when token is generated (for FCM/APNS)
      onRegister: function (token) {
        console.log('📱 Device Token:', token);
        // TODO: Send this token to your server to enable push notifications
      },

      // IOS ONLY (optional): default: all - Permissions to register.
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

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
    console.log('✅ PushNotification configured - ready to receive push notifications');
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

    console.log('✅ NotificationService started - ready to receive push notifications');
  },

  /**
   * Stop the notification service and cleanup
   */
  stop: () => {
    console.log('📱 NotificationService stopping...');

    // Clear callback
    onTapCallback = null;

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

    // Only for testing - send a local notification
    PushNotification.localNotification({
      channelId: 'picstar-channel',
      title: options.title || 'Test Notification',
      message: options.message || 'This is a test notification',
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
      bigPictureUrl: options.imageUrl || undefined,
      largeIconUrl: options.imageUrl || undefined,
      userInfo: {
        id: Date.now().toString(),
        videoUrl: options.videoUrl || '',
        imageUrl: options.imageUrl || '',
        subcategory: options.subcategory || '',
        mainCategory: options.mainCategory || '',
      },
    });
  },
};

export default NotificationService;
