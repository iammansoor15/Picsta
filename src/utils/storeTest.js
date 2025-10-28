// Simple test to check if Redux store is working
import { store } from '../store';

export const testStore = () => {
  try {
    console.log('🧪 Testing Redux store...');
    
    // Test if store exists
    if (!store) {
      console.error('❌ Store is undefined');
      return false;
    }
    
    // Test if store has getState method
    if (typeof store.getState !== 'function') {
      console.error('❌ Store.getState is not a function');
      return false;
    }
    
    // Test if we can get state
    const state = store.getState();
    console.log('✅ Store state:', state);
    
    // Test if we can dispatch
    if (typeof store.dispatch !== 'function') {
      console.error('❌ Store.dispatch is not a function');
      return false;
    }
    
    console.log('✅ Redux store is working correctly');
    return true;
  } catch (error) {
    console.error('❌ Store test failed:', error);
    return false;
  }
};
