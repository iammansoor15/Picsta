import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentService from '../services/PaymentService';
import { COLORS, TYPOGRAPHY, SPACING, moderateScale } from '../theme';
import CustomAlert from '../Components/CustomAlert';

const SubscriptionGate = () => {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Responsive calculations
  const isSmallDevice = width < 360;
  const isMediumDevice = width >= 360 && width < 400;
  const isLargeDevice = width >= 400;
  const isShortScreen = height < 700;

  // Dynamic sizes based on screen dimensions
  const scale = (size) => moderateScale(size, 0.3);
  const verticalScale = (size) => (height / 812) * size; // Based on standard iPhone X height

  const handleSubscribe = async () => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🎯 [SUBSCRIPTION GATE] Subscribe button clicked');
      console.log('='.repeat(60));

      setPaymentLoading(true);

      // Get user info from storage
      let userName = 'User';
      try {
        const userJson = await AsyncStorage.getItem('user') || await AsyncStorage.getItem('AUTH_USER');
        if (userJson) {
          const user = JSON.parse(userJson);
          userName = user.name || 'User';
        }
      } catch (e) {
        console.warn('Failed to load user name:', e);
      }

      console.log('💸 [SUBSCRIPTION GATE] Initiating payment for subscription');

      // Process subscription payment (₹1 for 30 days)
      const result = await PaymentService.processPayment(
        1, // Amount in rupees
        {
          name: userName,
          email: '',
          phone: '',
        },
        {
          description: 'Subscription - 30 Days Access',
          subscriptionPlan: '30_days',
        },
        {
          onVerifyStart: () => {
            console.log('🛡️ [SUBSCRIPTION GATE] Showing verification overlay');
            setPaymentProcessing(true);
          },
        }
      );

      console.log('🎉 [SUBSCRIPTION GATE] Payment successful!');
      console.log('📊 [SUBSCRIPTION GATE] Result:', JSON.stringify(result, null, 2));

      // Store subscription status locally for quick checks
      try {
        await AsyncStorage.setItem('subscriptionActive', 'true');
        await AsyncStorage.setItem('subscriptionExpiry', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
        console.log('✅ [SUBSCRIPTION GATE] Subscription cached locally');
      } catch (e) {
        console.warn('Failed to cache subscription:', e);
      }

      // Hide overlay and show success
      setTimeout(() => {
        setPaymentProcessing(false);
        setAlertConfig({
          visible: true,
          title: 'Subscription Activated! 🎉',
          message: `You now have 30 days of unlimited access!\n\nTransaction ID: ${result.transactionId}`,
          buttons: [{
            text: 'Continue',
            onPress: () => {
              console.log('✅ [SUBSCRIPTION GATE] Navigating to HeroScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'HeroScreen' }],
              });
            }
          }]
        });
      }, 300);

    } catch (error) {
      console.error('\n❌ [SUBSCRIPTION GATE] Payment error!');
      console.error('🔴 [SUBSCRIPTION GATE] Error:', error.message);
      console.error('🔴 [SUBSCRIPTION GATE] Code:', error.code);

      setPaymentProcessing(false);

      const errorMsg = error.message || 'Payment failed';

      // Handle different error types
      if (errorMsg.includes('cancel') || error.code === 2) {
        setAlertConfig({
          visible: true,
          title: 'Payment Cancelled',
          message: 'You cancelled the subscription payment. You need an active subscription to use the app.',
          buttons: [{ text: 'Try Again', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }]
        });
      } else {
        setAlertConfig({
          visible: true,
          title: 'Payment Failed',
          message: errorMsg + '\n\nPlease try again to activate your subscription.',
          buttons: [{ text: 'Retry', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }]
        });
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  // Dynamic styles based on screen size
  const dynamicStyles = {
    container: {
      paddingTop: insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight : 0),
      paddingBottom: insets.bottom || scale(16),
      paddingHorizontal: scale(isSmallDevice ? 12 : 16),
    },
    header: {
      marginTop: verticalScale(isShortScreen ? 16 : 32),
      marginBottom: verticalScale(isShortScreen ? 16 : 24),
    },
    appName: {
      fontSize: scale(isSmallDevice ? 28 : 36),
    },
    tagline: {
      fontSize: scale(isSmallDevice ? 13 : 15),
    },
    card: {
      padding: scale(isSmallDevice ? 16 : 24),
      borderRadius: scale(20),
      maxWidth: 500,
      alignSelf: 'center',
      width: '100%',
    },
    iconContainer: {
      width: scale(isSmallDevice ? 60 : 80),
      height: scale(isSmallDevice ? 60 : 80),
      borderRadius: scale(isSmallDevice ? 30 : 40),
      marginBottom: verticalScale(isShortScreen ? 12 : 20),
    },
    icon: {
      fontSize: scale(isSmallDevice ? 28 : 40),
    },
    title: {
      fontSize: scale(isSmallDevice ? 20 : 24),
      marginBottom: scale(4),
    },
    subtitle: {
      fontSize: scale(isSmallDevice ? 13 : 15),
      marginBottom: verticalScale(isShortScreen ? 16 : 24),
    },
    featureIcon: {
      fontSize: scale(isSmallDevice ? 16 : 20),
      marginRight: scale(8),
    },
    featureText: {
      fontSize: scale(isSmallDevice ? 13 : 15),
    },
    featureRow: {
      marginBottom: verticalScale(isShortScreen ? 8 : 12),
    },
    priceContainer: {
      paddingVertical: verticalScale(isShortScreen ? 10 : 16),
      marginBottom: verticalScale(isShortScreen ? 12 : 16),
    },
    priceLabel: {
      fontSize: scale(isSmallDevice ? 11 : 12),
    },
    currency: {
      fontSize: scale(isSmallDevice ? 18 : 24),
    },
    price: {
      fontSize: scale(isSmallDevice ? 36 : 48),
    },
    duration: {
      fontSize: scale(isSmallDevice ? 14 : 16),
    },
    subscribeButton: {
      paddingVertical: scale(isSmallDevice ? 12 : 16),
      paddingHorizontal: scale(16),
      borderRadius: scale(12),
      marginBottom: scale(12),
    },
    subscribeButtonText: {
      fontSize: scale(isSmallDevice ? 15 : 18),
    },
    disclaimer: {
      fontSize: scale(isSmallDevice ? 11 : 12),
    },
    paymentProcessingCard: {
      minWidth: Math.min(scale(260), width * 0.85),
      maxWidth: width * 0.9,
      padding: scale(24),
      borderRadius: scale(20),
    },
  };

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'HeroScreen' }],
    });
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Skip Button - Top Right */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + scale(8), right: scale(16) }]}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={[styles.appName, dynamicStyles.appName]}>Picstar</Text>
          <Text style={[styles.tagline, dynamicStyles.tagline]}>Create Beautiful Memories</Text>
        </View>

        {/* Subscription Card */}
        <View style={[styles.card, dynamicStyles.card]}>
          <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
            <Text style={[styles.icon, dynamicStyles.icon]}>⭐</Text>
          </View>

          <Text style={[styles.title, dynamicStyles.title]}>Unlock Full Access</Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Get unlimited access to all features</Text>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={[styles.featureRow, dynamicStyles.featureRow]}>
              <Text style={[styles.featureIcon, dynamicStyles.featureIcon]}>✓</Text>
              <Text style={[styles.featureText, dynamicStyles.featureText]}>Remove backgrounds from unlimited photos</Text>
            </View>
            <View style={[styles.featureRow, dynamicStyles.featureRow]}>
              <Text style={[styles.featureIcon, dynamicStyles.featureIcon]}>✓</Text>
              <Text style={[styles.featureText, dynamicStyles.featureText]}>Access all premium templates</Text>
            </View>
            <View style={[styles.featureRow, dynamicStyles.featureRow]}>
              <Text style={[styles.featureIcon, dynamicStyles.featureIcon]}>✓</Text>
              <Text style={[styles.featureText, dynamicStyles.featureText]}>Create stunning collages & videos</Text>
            </View>
            <View style={[styles.featureRow, dynamicStyles.featureRow]}>
              <Text style={[styles.featureIcon, dynamicStyles.featureIcon]}>✓</Text>
              <Text style={[styles.featureText, dynamicStyles.featureText]}>No ads, no watermarks</Text>
            </View>
          </View>

          {/* Price */}
          <View style={[styles.priceContainer, dynamicStyles.priceContainer]}>
            <Text style={[styles.priceLabel, dynamicStyles.priceLabel]}>Special Offer</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.currency, dynamicStyles.currency]}>₹</Text>
              <Text style={[styles.price, dynamicStyles.price]}>1</Text>
              <Text style={[styles.duration, dynamicStyles.duration]}>/ 30 days</Text>
            </View>
          </View>

          {/* Subscribe Button */}
          <TouchableOpacity
            style={[styles.subscribeButton, dynamicStyles.subscribeButton, paymentLoading && styles.buttonDisabled]}
            onPress={handleSubscribe}
            disabled={paymentLoading}
            activeOpacity={0.8}
          >
            {paymentLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={[styles.subscribeButtonText, dynamicStyles.subscribeButtonText]}>Subscribe Now</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, dynamicStyles.disclaimer]}>
            One-time payment • Automatic access for 30 days
          </Text>
        </View>
      </ScrollView>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
      />

      {/* Payment Processing Overlay */}
      <Modal
        visible={paymentProcessing}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.paymentProcessingOverlay}>
          <View style={[styles.paymentProcessingCard, dynamicStyles.paymentProcessingCard]}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.paymentProcessingTitle}>Activating Subscription</Text>
            <Text style={styles.paymentProcessingText}>
              Please wait while we confirm your payment...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skipButton: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  header: {
    alignItems: 'center',
  },
  appName: {
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  tagline: {
    color: COLORS.gray,
  },
  card: {
    backgroundColor: COLORS.white,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iconContainer: {
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    // Font size set dynamically
  },
  title: {
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.gray,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    color: '#10B981',
    fontWeight: '700',
  },
  featureText: {
    color: COLORS.text,
    flex: 1,
    flexWrap: 'wrap',
  },
  priceContainer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceLabel: {
    color: '#10B981',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    color: COLORS.text,
    fontWeight: '700',
  },
  price: {
    fontWeight: '700',
    color: COLORS.text,
  },
  duration: {
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
  subscribeButton: {
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minHeight: 48,
  },
  subscribeButtonText: {
    fontWeight: '700',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  disclaimer: {
    color: COLORS.gray,
    textAlign: 'center',
  },
  paymentProcessingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  paymentProcessingCard: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  paymentProcessingTitle: {
    fontWeight: '700',
    color: '#10B981',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    fontSize: 18,
    textAlign: 'center',
  },
  paymentProcessingText: {
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
});

export default SubscriptionGate;
