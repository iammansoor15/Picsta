import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import SubscriptionService from '../services/SubscriptionService';
import { COLORS } from '../theme/colors';
import { useDispatch } from 'react-redux';
import { setDisplayName } from '../store/slices/profileSlice';
import { updateProfileImage } from '../store/slices/profileSlice';
import { updateAndPersistProfilePicture } from '../store/slices/profilePictureSlice';

const RegisterWithOTP = ({ navigation }) => {
  const dispatch = useDispatch();
  const [mode, setMode] = useState('register'); // 'register' or 'signin'
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Name (only for register)
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState('');

  const otpInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // Start countdown timer for resend OTP
  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Format phone number for display
  const formatPhoneNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return number;
  };

  // Step 1: Send OTP to phone number
  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await AuthService.sendOtp(phone, mode);
      console.log('OTP sent successfully:', result);
      Alert.alert('Success', 'OTP sent to your phone number');
      setStep(2);
      startResendTimer();
      // Focus OTP input after a short delay
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP with server before moving to name input (register) or completing signin
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if OTP is valid
      await AuthService.checkOtp({ phone, otp });

      console.log('OTP verified successfully');
      
      if (mode === 'signin') {
        // Sign In mode: Complete authentication with a temporary name
        // The user already exists, so just verify OTP and login
        const result = await AuthService.verifyOtp({
          phone,
          otp,
          name: 'User', // Temporary, won't update existing user
        });

        // Store token
        if (result.token) {
          await AsyncStorage.setItem('authToken', result.token);
          await AsyncStorage.setItem('user', JSON.stringify(result.user));
          
          // IMPORTANT: Load user data into Redux immediately after sign-in
          console.log('🔄 Sign-in: Loading user data into Redux:', result.user);
          
          // Update name in Redux
          if (result.user?.name) {
            dispatch(setDisplayName(result.user.name));
            console.log('✅ Sign-in: Name loaded into Redux:', result.user.name);
          }
          
          // Update profile photo in Redux if available
          const photoUrl = result.user?.profilePhotoUrl || result.user?.profile_photo_url;
          if (photoUrl) {
            console.log('✅ Sign-in: Photo URL found:', photoUrl);
            dispatch(updateProfileImage({ processedUri: photoUrl, originalUri: photoUrl }));
            await dispatch(updateAndPersistProfilePicture({ imageUri: photoUrl, isProcessed: true }));
          }
        }

        // Check subscription status
        const subscription = await SubscriptionService.checkSubscriptionStatus();
        
        // Navigate based on subscription status
        const targetScreen = subscription.active ? 'HeroScreen' : 'SubscriptionGate';
        Alert.alert('Welcome Back!', 'You have been signed in successfully.', [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: targetScreen }],
              });
            },
          },
        ]);
      } else {
        // Register mode: Proceed to name entry
        setError('');
        setStep(3);
        setTimeout(() => nameInputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Invalid OTP. Please try again.');
      Alert.alert('Invalid OTP', err.message || 'The OTP you entered is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete registration with name
  const handleCompleteRegistration = async () => {
    if (!name || name.trim().length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔵 Starting registration with name:', name.trim());
      
      // First verify OTP (this creates/verifies the user with temporary name)
      const result = await AuthService.verifyOtp({
        phone,
        otp,
        name: 'User', // Use dummy name, we'll update it next
      });

      console.log('🔵 OTP verified, token received');

      // Now update the profile with the actual name using the /profile endpoint
      if (result.token) {
        await AsyncStorage.setItem('authToken', result.token);
        
        console.log('🔵 Updating profile with name:', name.trim());
        const profileUpdate = await AuthService.updateProfile(result.token, { name: name.trim() });
        console.log('🔵 Profile updated:', JSON.stringify(profileUpdate, null, 2));
        
        // Store the updated user data
        if (profileUpdate?.user) {
          await AsyncStorage.setItem('user', JSON.stringify(profileUpdate.user));
          console.log('✅ Name successfully saved to database:', profileUpdate.user.name);
          
          // Update Redux with the new user data
          dispatch(setDisplayName(profileUpdate.user.name));
          console.log('✅ Registration: Name loaded into Redux:', profileUpdate.user.name);
        }
      }

      // Check subscription status
      const subscription = await SubscriptionService.checkSubscriptionStatus();
      
      // Navigate based on subscription status
      const targetScreen = subscription.active ? 'HeroScreen' : 'SubscriptionGate';
      Alert.alert('Success', 'Registration completed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: targetScreen }],
            });
          },
        },
      ]);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      Alert.alert('Error', err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    setError('');

    try {
      await AuthService.resendOtp(phone, mode);
      Alert.alert('Success', 'OTP resent to your phone number');
      startResendTimer();
      setOtp('');
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'Failed to resend OTP');
      Alert.alert('Error', err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Edit phone number
  const handleEditPhone = () => {
    setStep(1);
    setOtp('');
    setName('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'register' ? 'Register' : 'Sign In'}</Text>
            <Text style={styles.subtitle}>
              {step === 1 && `Enter your phone number to ${mode === 'register' ? 'create an account' : 'sign in'}`}
              {step === 2 && 'Enter the OTP sent to your phone'}
              {step === 3 && 'Enter your name to complete registration'}
            </Text>
          </View>

          {/* Error Message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Step 1: Phone Number Input */}
          {step === 1 && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit phone number"
                  placeholderTextColor={COLORS.textSecondary}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text.replace(/\D/g, '').slice(0, 10));
                    setError('');
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: OTP Input */}
          {step === 2 && (
            <View style={styles.inputContainer}>
              <View style={styles.phoneDisplayContainer}>
                <Text style={styles.phoneDisplay}>{formatPhoneNumber(phone)}</Text>
                <TouchableOpacity onPress={handleEditPhone}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                ref={otpInputRef}
                style={styles.otpInput}
                placeholder="6-digit OTP"
                placeholderTextColor={COLORS.textSecondary}
                value={otp}
                onChangeText={(text) => {
                  setOtp(text.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>

              {/* Resend OTP */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive OTP? </Text>
                {resendTimer > 0 ? (
                  <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Step 3: Name Input (only for registration) */}
          {step === 3 && mode === 'register' && (
            <View style={styles.inputContainer}>
              <View style={styles.phoneDisplayContainer}>
                <Text style={styles.phoneDisplay}>{formatPhoneNumber(phone)}</Text>
                <TouchableOpacity onPress={handleEditPhone}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Your Name</Text>
              <TextInput
                ref={nameInputRef}
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError('');
                }}
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleCompleteRegistration}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Complete Registration</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Mode Toggle - Only show on step 1 */}
          {step === 1 && (
            <View style={styles.modeToggleContainer}>
              <Text style={styles.modeToggleText}>
                {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setMode(mode === 'register' ? 'signin' : 'register');
                  setError('');
                }}
              >
                <Text style={styles.modeToggleLink}>
                  {mode === 'register' ? 'Sign In' : 'Register'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputContainer: {
    width: '100%',
  },
  label: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  countryCode: {
    fontSize: 18,
    color: '#212529',
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    height: 56,
    fontSize: 18,
    color: '#212529',
    paddingRight: 16,
  },
  input: {
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#212529',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  otpInput: {
    height: 70,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 32,
    color: '#212529',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.primary || '#007AFF',
    textAlign: 'center',
    letterSpacing: 12,
    fontWeight: '700',
    shadowColor: COLORS.primary || '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    height: 56,
    backgroundColor: COLORS.primary || '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary || '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  phoneDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
  },
  phoneDisplay: {
    fontSize: 18,
    color: '#212529',
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    color: COLORS.primary || '#007AFF',
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#6c757d',
  },
  resendTimer: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 14,
    color: COLORS.primary || '#007AFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modeToggleText: {
    fontSize: 15,
    color: '#6c757d',
    marginRight: 8,
  },
  modeToggleLink: {
    fontSize: 15,
    color: COLORS.primary || '#007AFF',
    fontWeight: '700',
  },
});

export default RegisterWithOTP;
