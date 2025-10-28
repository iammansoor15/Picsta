import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Logo from '../../assets/PicStar_logo.png';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';

const SplashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Fade in and scale up animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Navigate to HeroScreen after delay
    const timer = setTimeout(() => {
      navigation.replace('HeroScreen');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image 
        source={Logo} 
        style={[styles.logo, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]} 
      />
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>Picstar</Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>Create beautiful memories</Animated.Text>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: SPACING.lg,
    resizeMode: 'contain',
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.primaryLight,
    marginBottom: SPACING.xl,
  },
});
