import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppConfig from '../../config/AppConfig';

const CATEGORIES_STORAGE_KEY = '@narayana_categories';

// Default categories
const defaultCategories = [
  { key: 'congratulations', label: 'Congratulations', icon: '🎉' },
  { key: 'birthday', label: 'Birthday', icon: '🎂' },
  { key: 'liked', label: 'Liked', icon: '💖' }
];

const initialState = {
  categories: defaultCategories,
  isLoading: false,
  error: null,
};

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setCategoriesSuccess: (state, action) => {
      state.categories = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setCategoriesError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    addCategorySuccess: (state, action) => {
      state.categories.push(action.payload);
      state.error = null;
    },
    removeCategorySuccess: (state, action) => {
      state.categories = state.categories.filter(cat => cat.key !== action.payload);
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

// Async thunks
export const loadCategories = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    console.log('📂 CategorySlice: Loading categories from storage...');
    
    const categoriesJson = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
    
    if (categoriesJson) {
      const categories = JSON.parse(categoriesJson);
      console.log('📂 CategorySlice: Loaded categories:', categories);
      dispatch(setCategoriesSuccess(categories));
    } else {
      // First time - save default categories
      console.log('📂 CategorySlice: No categories found, using defaults');
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(defaultCategories));
      dispatch(setCategoriesSuccess(defaultCategories));
    }
  } catch (error) {
    console.error('❌ CategorySlice: Error loading categories:', error);
    dispatch(setCategoriesError('Failed to load categories'));
    // Fallback to default categories
    dispatch(setCategoriesSuccess(defaultCategories));
  }
};

export const addCategory = (categoryData) => async (dispatch, getState) => {
  try {
    console.log('📂 CategorySlice: Adding new category:', categoryData);
    
    const { categories } = getState().categories;
    
    // Check if category already exists
    const existingCategory = categories.find(cat => cat.key === categoryData.key);
    if (existingCategory) {
      throw new Error('Category already exists');
    }
    
    const newCategories = [...categories, categoryData];
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
    console.log('📂 CategorySlice: Category saved to storage');
    
    // Update Redux state
    dispatch(addCategorySuccess(categoryData));
    
    return { success: true };
  } catch (error) {
    console.error('❌ CategorySlice: Error adding category:', error);
    dispatch(setCategoriesError(error.message || 'Failed to add category'));
    return { success: false, error: error.message };
  }
};

export const removeCategory = (categoryKey) => async (dispatch, getState) => {
  try {
    console.log('📂 CategorySlice: Removing category:', categoryKey);

    const { categories } = getState().categories;
    const newCategories = categories.filter(cat => cat.key !== categoryKey);

    // Save to AsyncStorage
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));

    // Update Redux state
    dispatch(removeCategorySuccess(categoryKey));

    return { success: true };
  } catch (error) {
    console.error('❌ CategorySlice: Error removing category:', error);
    dispatch(setCategoriesError('Failed to remove category'));
    return { success: false, error: error.message };
  }
};

// Fetch categories from server and merge with local ones
export const fetchCategoriesFromServer = (forceRefresh = false) => async (dispatch, getState) => {
  try {
    // Always fetch fresh from server (no caching) to ensure new categories appear immediately

    dispatch(setLoading(true));
    console.log('📂 CategorySlice: Fetching categories from server...');

    // Build server URL candidates
    const allowProd = (AppConfig?.DEVELOPMENT?.USE_PRODUCTION_FALLBACK === true);
    const candidates = [
      AppConfig?.DEVELOPMENT?.DEV_SERVER_URL,
      'http://10.0.2.2:10000',
      'http://127.0.0.1:10000',
      'http://localhost:10000',
      allowProd ? AppConfig?.PRODUCTION_SERVER_URL : null,
    ].filter(Boolean).map(u => u.replace(/\/$/, ''));

    let serverCategories = [];
    let success = false;

    for (const baseURL of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const resp = await fetch(`${baseURL}/api/templates/categories`, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-store' }
        });

        clearTimeout(timeoutId);

        if (resp.ok) {
          const json = await resp.json();
          if (json?.success && Array.isArray(json?.data?.categories)) {
            serverCategories = json.data.categories;
            success = true;
            console.log('📂 CategorySlice: Fetched categories from server:', serverCategories.length);
            break;
          }
        }
      } catch (e) {
        console.log(`📂 CategorySlice: Failed to fetch from ${baseURL}:`, e?.message);
        // try next candidate
      }
    }

    if (!success) {
      console.log('📂 CategorySlice: Could not fetch from server, using local categories');
      dispatch(setLoading(false));
      return { success: false, error: 'Could not reach server' };
    }

    // Merge server categories with local ones
    const { categories: currentCategories } = getState().categories;

    // Keep 'liked' as a local-only category
    const likedCategory = currentCategories.find(c => c.key === 'liked');

    // Start with server categories
    const mergedCategories = [...serverCategories];

    // Add 'liked' if not present from server
    if (likedCategory && !mergedCategories.find(c => c.key === 'liked')) {
      mergedCategories.push(likedCategory);
    }

    // Add any local custom categories not in server response
    for (const localCat of currentCategories) {
      if (!mergedCategories.find(c => c.key === localCat.key)) {
        mergedCategories.push(localCat);
      }
    }

    // Save to AsyncStorage
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(mergedCategories));

    // Update Redux state
    dispatch(setCategoriesSuccess(mergedCategories));

    console.log('📂 CategorySlice: Merged categories saved:', mergedCategories.length);
    return { success: true };
  } catch (error) {
    console.error('❌ CategorySlice: Error fetching categories from server:', error);
    dispatch(setLoading(false));
    return { success: false, error: error.message };
  }
};

// Export actions and reducer
export const {
  setLoading,
  setCategoriesSuccess,
  setCategoriesError,
  addCategorySuccess,
  removeCategorySuccess,
  clearError,
} = categorySlice.actions;

// Selectors
export const selectCategories = (state) => state.categories.categories;
export const selectCategoriesLoading = (state) => state.categories.isLoading;
export const selectCategoriesError = (state) => state.categories.error;

export default categorySlice.reducer;