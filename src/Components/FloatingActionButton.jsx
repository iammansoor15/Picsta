import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { COLORS, SPACING, responsiveSize } from '../theme';

const FloatingActionButton = ({ onPress, style, disabled = false, testID }) => {
  return (
    <TouchableOpacity
      style={[styles.container, style, disabled && styles.disabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      testID={testID}
    >
      <View style={styles.buttonContent}>
        <Text style={styles.plusIcon}>+</Text>
      </View>
    </TouchableOpacity>
  );
};

export default FloatingActionButton;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: responsiveSize(30),
    right: responsiveSize(20),
    width: responsiveSize(56),
    height: responsiveSize(56),
    borderRadius: responsiveSize(28),
    backgroundColor: COLORS.primary,
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontSize: responsiveSize(24),
    color: COLORS.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
});