import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'AUTH_TOKEN';

export default function Header({ title = 'PICSTAR' }) {
  const navigation = useNavigation();

  const onAvatarPress = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        // Not logged in: go to sign-in/register screen
        navigation.navigate('ProfileEntry');
      } else {
        // Already logged in: go to profile home
        navigation.navigate('ProfileHome');
      }
    } catch (e) {
      // If storage read fails, fall back to sign-in page
      navigation.navigate('ProfileEntry');
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={{ fontSize: 18 }}>{'<'}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.avatar} onPress={onAvatarPress}>
        {/* Placeholder circle as profile picture */}
        <View style={styles.avatarCircle} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#eee' },
  back: { width: 32, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: 'bold' },
  avatar: { width: 32, alignItems: 'flex-end' },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ddd' },
});
