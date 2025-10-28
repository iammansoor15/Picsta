import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { testStore } from '../utils/storeTest';
import { loadExistingProfilePicture } from '../store/slices/profilePictureSlice';
import { setupPicstarServer } from '../utils/ServerSetup';

const ReduxInitializer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeApp = async () => {
      // Test the store
      testStore();
      
      // Auto-configure Picstar server
      console.log('🚀 Auto-configuring Picstar server...');
      await setupPicstarServer();

      // Load any existing persisted profile picture on app start
      dispatch(loadExistingProfilePicture());
    };
    
    initializeApp();
  }, [dispatch]);

  // Keep-alive removed; no periodic tasks to clean up

  return children;
};

export default ReduxInitializer;
