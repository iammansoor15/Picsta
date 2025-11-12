import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentService from '../services/PaymentService';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import CustomAlert from '../Components/CustomAlert';

const SubscriptionGate = () => {
  const navigation = useNavigation();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>Picstar</Text>
        <Text style={styles.tagline}>Create Beautiful Memories</Text>
      </View>

      {/* Subscription Card */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⭐</Text>
        </View>

        <Text style={styles.title}>Unlock Full Access</Text>
        <Text style={styles.subtitle}>Get unlimited access to all features</Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Remove backgrounds from unlimited photos</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Access all premium templates</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Create stunning collages & videos</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>No ads, no watermarks</Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Special Offer</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>₹</Text>
            <Text style={styles.price}>1</Text>
            <Text style={styles.duration}>/ 30 days</Text>
          </View>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, paymentLoading && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={paymentLoading}
          activeOpacity={0.8}
        >
          {paymentLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          One-time payment • Automatic access for 30 days
        </Text>
      </View>

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
      >
        <View style={styles.paymentProcessingOverlay}>
          <View style={styles.paymentProcessingCard}>
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
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl * 2,
    marginBottom: SPACING.xl,
  },
  appName: {
    ...TYPOGRAPHY.h1,
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  tagline: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.gray,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureIcon: {
    fontSize: 20,
    color: '#10B981',
    marginRight: SPACING.sm,
    fontWeight: '700',
  },
  featureText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
    flex: 1,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceLabel: {
    ...TYPOGRAPHY.bodySmall,
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
    ...TYPOGRAPHY.h2,
    fontSize: 24,
    color: COLORS.text,
    fontWeight: '700',
  },
  price: {
    ...TYPOGRAPHY.h1,
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text,
  },
  duration: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
  subscribeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: SPACING.md,
  },
  subscribeButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
    fontSize: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  disclaimer: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray,
    textAlign: 'center',
  },
  paymentProcessingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentProcessingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    minWidth: 260,
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  paymentProcessingTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    color: '#10B981',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  paymentProcessingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SubscriptionGate;
