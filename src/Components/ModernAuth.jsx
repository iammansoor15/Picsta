import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Dimensions,
  StatusBar
} from 'react-native';
import AuthService from '../services/AuthService';
import SubscriptionService from '../services/SubscriptionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'AUTH_TOKEN';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ModernAuth({ navigation }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState('');
  const [inputErrors, setInputErrors] = useState({});
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    
    // Entrance animations
    Animated.stagger(150, [
      Animated.timing(backgroundAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    setInputErrors({});
    // Smooth transition when switching modes
    Animated.sequence([
      Animated.timing(formAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  const isEmail = /@/.test(identifier);

  const validate = () => {
    const errors = {};
    
    if (mode === 'register' && name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!identifier.trim()) {
      errors.identifier = 'Email or phone number is required';
    } else if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      errors.identifier = 'Please enter a valid email address';
    } else if (!isEmail && !/^(\+91)?[6-9]\d{9}$/.test(identifier.replace(/\s/g, ''))) {
      errors.identifier = 'Please enter a valid Indian phone number';
    }
    
    if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setInputErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      // Shake animation for errors
      const shakeAnimation = Animated.sequence([
        Animated.timing(slideAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 3, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]);
      shakeAnimation.start();
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      if (mode === 'register') {
        const payload = inferPayload(identifier, { name, password });
        const data = await AuthService.register(payload);
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('AUTH_USER', JSON.stringify(data.user || {}));

        // Check subscription status
        const subscription = await SubscriptionService.checkSubscriptionStatus();

        // Navigate based on subscription status
        const targetScreen = subscription.active ? 'HeroScreen' : 'SubscriptionGate';
        Alert.alert('🎉 Welcome!', `Account created successfully, ${data.user.name}!`, [
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
        const payload = inferPayload(identifier, { password });
        const data = await AuthService.login(payload);
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('AUTH_USER', JSON.stringify(data.user || {}));

        // Check subscription status
        const subscription = await SubscriptionService.checkSubscriptionStatus();

        // Navigate based on subscription status
        const targetScreen = subscription.active ? 'HeroScreen' : 'SubscriptionGate';
        Alert.alert('👋 Welcome back!', `Hello, ${data.user.name}!`, [
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
      }
    } catch (e) {
      Alert.alert('❌ Error', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inferPayload = (id, extra) => {
    const isEmail = /@/.test(id);
    if (isEmail) return { email: id.trim(), ...extra };
    return { phone: id.trim(), ...extra };
  };

  const renderInput = (placeholder, value, onChangeText, keyboardType = 'default', secureTextEntry = false, fieldName, icon) => (
    <Animated.View 
      style={[
        styles.inputWrapper,
        { 
          transform: [{ scale: formAnim }],
          opacity: formAnim 
        }
      ]}
    >
      <View style={[
        styles.inputContainer,
        focusedInput === fieldName && styles.inputContainerFocused,
        inputErrors[fieldName] && styles.inputContainerError
      ]}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          style={[
            styles.input,
            focusedInput === fieldName && styles.inputFocused,
            inputErrors[fieldName] && styles.inputError
          ]}
          keyboardType={keyboardType}
          autoCapitalize={fieldName === 'name' ? 'words' : 'none'}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocusedInput(fieldName)}
          onBlur={() => setFocusedInput('')}
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
        />
      </View>
      {inputErrors[fieldName] && (
        <Text style={styles.errorText}>{inputErrors[fieldName]}</Text>
      )}
    </Animated.View>
  );

  const backgroundInterpolation = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(59, 130, 246, 0.8)', 'rgba(147, 51, 234, 0.8)']
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Animated Background */}
      <Animated.View style={[
        styles.backgroundGradient,
        { backgroundColor: backgroundInterpolation }
      ]} />
      
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        {[...Array(6)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.backgroundCircle,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { rotate: `${i * 60}deg` }
                ]
              }
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <View style={styles.backIcon}>
              <Text style={styles.backText}>✕</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Main Content */}
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Logo/Brand Section */}
          <Animated.View style={[styles.brandSection, { opacity: fadeAnim }]}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>PICSTAR</Text>
            </View>
            <Text style={styles.tagline}>Create • Edit • Share</Text>
          </Animated.View>

          {/* Glassmorphism Card */}
          <Animated.View 
            style={[
              styles.glassCard,
              { 
                opacity: formAnim,
                transform: [{ scale: formAnim }] 
              }
            ]}
          >
            {/* Welcome Text */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>
                {mode === 'login' ? 'Welcome Back' : 'Join PICSTAR'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {mode === 'login' 
                  ? 'Continue your creative journey' 
                  : 'Start creating amazing content'
                }
              </Text>
            </View>

            {/* Mode Switch */}
            <View style={styles.switchContainer}>
              <TouchableOpacity 
                onPress={() => setMode('login')} 
                style={[styles.switchBtn, mode === 'login' && styles.activeSwitchBtn]}
                activeOpacity={0.8}
              >
                <Text style={[styles.switchText, mode === 'login' && styles.activeSwitchText]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setMode('register')} 
                style={[styles.switchBtn, mode === 'register' && styles.activeSwitchBtn]}
                activeOpacity={0.8}
              >
                <Text style={[styles.switchText, mode === 'register' && styles.activeSwitchText]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {mode === 'register' && renderInput(
                'Your Full Name',
                name,
                setName,
                'default',
                false,
                'name',
                '👤'
              )}

              {renderInput(
                'Email or Phone',
                identifier,
                setIdentifier,
                isEmail ? 'email-address' : 'phone-pad',
                false,
                'identifier',
                isEmail ? '✉️' : '📱'
              )}

              {renderInput(
                'Password',
                password,
                setPassword,
                'default',
                true,
                'password',
                '🔒'
              )}
            </View>

            {/* Submit Button */}
            <Animated.View style={{ opacity: formAnim }}>
              <TouchableOpacity 
                onPress={onSubmit} 
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'register' ? '🚀 Create Account' : '🎯 Sign In'}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Text style={styles.footerText}>
              {mode === 'login' 
                ? "New to PICSTAR? Tap Sign Up" 
                : "Already have an account? Tap Sign In"
              }
            </Text>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E40AF',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -2,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: '10%',
    left: -50,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    letterSpacing: 2,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSwitchBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  switchText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeSwitchText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputContainerFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainerError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  inputIcon: {
    fontSize: 20,
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingRight: 20,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  inputFocused: {
    color: '#FFFFFF',
  },
  inputError: {
    color: '#FFB3B3',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitText: {
    color: '#1E40AF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    fontWeight: '500',
  },
});