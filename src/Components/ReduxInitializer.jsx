import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testStore } from '../utils/storeTest';
import { loadExistingProfilePicture, updateAndPersistProfilePicture } from '../store/slices/profilePictureSlice';
import { setDisplayName, updateProfileImage } from '../store/slices/profileSlice';
import { setupPicstarServer } from '../utils/ServerSetup';
import AuthService from '../services/AuthService';

const ReduxInitializer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeApp = async () => {
      // Test the store
      testStore();
      
      // Auto-configure Picstar server
      console.log('🚀 Auto-configuring Picstar server...');
      await setupPicstarServer();

      // Load user name and profile photo into Redux so they're available before any screen mounts
      try {
        const token = (await AsyncStorage.getItem('authToken')) || (await AsyncStorage.getItem('AUTH_TOKEN'));
        if (token) {
          try {
            const me = await AuthService.me(token);
            const u = me?.user || me;
            const nameFromDb = u?.name || u?.fullName || u?.username;
            if (nameFromDb && typeof nameFromDb === 'string') {
              dispatch(setDisplayName(nameFromDb.trim()));
              console.log('👤 Loaded user name into Redux:', nameFromDb.trim());
            }

            // Load profile photo from backend if available
            const photoUrl = u?.profilePhotoUrl || u?.profile_photo_url;
            if (photoUrl) {
              console.log('📸 Loaded profile photo URL from backend:', photoUrl);
              dispatch(updateProfileImage({ processedUri: photoUrl, originalUri: photoUrl }));
              await dispatch(updateAndPersistProfilePicture({ imageUri: photoUrl, isProcessed: true }));
            }
          } catch (e) {
            console.warn('⚠️ Failed to load user from backend, trying local cache:', e?.message);
          }
        }

        // Fallback to local cache if backend failed or no token
        if (!token || !(await AsyncStorage.getItem('profileDisplayName'))) {
          const authUserJson = await AsyncStorage.getItem('AUTH_USER');
          const otpUserJson = !authUserJson ? await AsyncStorage.getItem('user') : null;
          let name = null;
          if (authUserJson) {
            const u = JSON.parse(authUserJson);
            name = u?.name || u?.fullName || u?.username;
          } else if (otpUserJson) {
            const u = JSON.parse(otpUserJson);
            name = u?.name || u?.fullName || u?.username;
          }
          if (name && typeof name === 'string' && name.trim()) {
            dispatch(setDisplayName(name.trim()));
            console.log('👤 Loaded user name from cache into Redux:', name.trim());
          }
        }
      } catch (err) {
        console.warn('⚠️ Failed to load user name during initialization:', err);
      }

      // Load any existing persisted profile picture on app start
      dispatch(loadExistingProfilePicture());
    };
    
    initializeApp();
  }, [dispatch]);

  // Keep-alive removed; no periodic tasks to clean up

  return children;
};

export default ReduxInitializer;
