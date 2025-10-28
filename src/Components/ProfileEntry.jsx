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
  Animated,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthService from '../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'AUTH_TOKEN';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileEntry({ navigation }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // email or Indian phone
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState('');
  const [inputErrors, setInputErrors] = useState({});
  
  // Animation values (default to visible to avoid blank screen if animations fail)
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('ProfileEntry mounted');
    // Entrance animations
    Animated.parallel([
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
    ]).start();
  }, []);

  useEffect(() => {
    console.log('ProfileEntry mode changed:', mode);
    // Clear errors when switching modes
    setInputErrors({});
    // Animate mode switch
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  const isEmail = /@/.test(identifier);

  const validate = () => {
    const errors = {};
    
    if (mode === 'register' && name.trim().length < 2) {
      console.warn('Auth validate: invalid name for register');
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!identifier.trim()) {
      console.warn('Auth validate: missing identifier');
      errors.identifier = 'Email or phone number is required';
    } else if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      errors.identifier = 'Please enter a valid email address';
    } else if (!isEmail && !/^(\+91)?[6-9]\d{9}$/.test(identifier.replace(/\s/g, ''))) {
      errors.identifier = 'Please enter a valid Indian phone number';
    }
    
    if (password.length < 6) {
      console.warn('Auth validate: password too short');
      errors.password = 'Password must be at least 6 characters';
    }
    
    setInputErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      // Shake animation for errors
      const shakeAnimation = Animated.sequence([
        Animated.timing(slideAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
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
      console.log('Auth submit clicked:', { mode, hasIdentifier: Boolean(identifier), passwordLength: password.length });
      if (mode === 'register') {
        const payload = inferPayload(identifier, { name, password });
        console.log('Auth register start:', { hasName: Boolean(name?.trim()), usingEmail: /@/.test(identifier) });
        const data = await AuthService.register(payload);
        console.log('Auth register success: received user data');
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        await AsyncStorage.setItem('AUTH_USER', JSON.stringify(data.user || {}));
        console.log('Auth token stored (register)');
        Alert.alert('Welcome', `Account created, ${data.user.name}!`);
        navigation.goBack();
        console.log('Navigated back after register');
      } else {
        const payload = inferPayload(identifier, { password });
        console.log('Auth login start:', { usingEmail: /@/.test(identifier) });
        // Send email or phone based on identifier, for consistency with register
        const data = await AuthService.login(payload);
        console.log('Auth login success: received user data');
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        await AsyncStorage.setItem('AUTH_USER', JSON.stringify(data.user || {}));
        console.log('Auth token stored (login)');
        Alert.alert('Logged in', `Hello, ${data.user.name}!`);
        navigation.goBack();
        console.log('Navigated back after login');
      }
    } catch (e) {
      console.error('Auth submit error:', e?.message || e);
      Alert.alert('Error', e.message || 'Request failed');
    } finally {
      setLoading(false);
      console.log('Auth submit finished');
    }
  };

  const inferPayload = (id, extra) => {
    const isEmail = /@/.test(id);
    if (isEmail) return { email: id.trim(), ...extra };
    return { phone: id.trim(), ...extra };
  };

  const renderInput = (placeholder, value, onChangeText, keyboardType = 'default', secureTextEntry = false, fieldName) => (
    <Animated.View 
      style={[
        styles.inputContainer,
        focusedInput === fieldName && styles.inputContainerFocused,
        inputErrors[fieldName] && styles.inputContainerError
      ]}
    >
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
        placeholderTextColor="#9CA3AF"
      />
      {inputErrors[fieldName] && (
        <Text style={styles.errorText}>{inputErrors[fieldName]}</Text>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView edges={['top','bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        {/* Modern Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <View style={styles.backIcon}>
              <Text style={styles.backText}>←</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>PICSTAR</Text>
          <View style={styles.headerSpacer} />
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
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {mode === 'login' 
                ? 'Sign in to continue your creative journey' 
                : 'Join us to start creating amazing content'
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

          {/* Form Inputs */}
          <View style={styles.formContainer}>
            {mode === 'register' && renderInput(
              'Full Name',
              name,
              setName,
              'default',
              false,
              'name'
            )}

            {renderInput(
              'Email or Phone Number',
              identifier,
              setIdentifier,
              isEmail ? 'email-address' : 'phone-pad',
              false,
              'identifier'
            )}

            {renderInput(
              'Password',
              password,
              setPassword,
              'default',
              true,
              'password'
            )}
          </View>

          {/* Submit Button */}
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
                {mode === 'register' ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Footer Text */}
          <Text style={styles.footerText}>
            {mode === 'login' 
              ? "Don't have an account? Tap Sign Up above" 
              : "Already have an account? Tap Sign In above"
            }
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backText: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 44,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  welcomeSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  switchText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeSwitchText: {
    color: '#111827',
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputContainerFocused: {
    transform: [{ scale: 1.02 }],
  },
  inputContainerError: {
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FEFEFF',
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 16,
  },
});
