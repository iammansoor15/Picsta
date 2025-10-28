import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

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