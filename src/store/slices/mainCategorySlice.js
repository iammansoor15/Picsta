import { createSlice, createSelector } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@template_main_sub_selection';

const initialState = {
  // Main category (religion)
  religion: 'all',
  // Subcategory (e.g., congratulations, birthday)
  subcategory: 'congratulations',
  // Timestamp for last change (can be used to trigger refreshes)
  updatedAt: null,
};

const mainCategorySlice = createSlice({
  name: 'mainCategory',
  initialState,
  reducers: {
    setReligion: (state, action) => {
      state.religion = String(action.payload || 'all').toLowerCase().trim();
      state.updatedAt = Date.now();
    },
    setSubcategory: (state, action) => {
      state.subcategory = String(action.payload || 'congratulations').toLowerCase().trim();
      state.updatedAt = Date.now();
    },
    setMainAndSub: (state, action) => {
      const { religion, subcategory } = action.payload || {};
      if (religion) state.religion = String(religion).toLowerCase().trim();
      if (subcategory) state.subcategory = String(subcategory).toLowerCase().trim();
      state.updatedAt = Date.now();
    },
    hydrateFromStorage: (state, action) => {
      const data = action.payload || {};
      if (data.religion) state.religion = data.religion;
      if (data.subcategory) state.subcategory = data.subcategory;
      state.updatedAt = Date.now();
    }
  }
});

export const { setReligion, setSubcategory, setMainAndSub, hydrateFromStorage } = mainCategorySlice.actions;

// Thunks for persistence
export const loadMainSubFromStorage = () => async (dispatch) => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      dispatch(hydrateFromStorage(data));
    }
  } catch {}
};

export const saveMainSubToStorage = () => async (dispatch, getState) => {
  try {
    const state = getState().mainCategory;
    const data = { religion: state.religion, subcategory: state.subcategory };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

// Selectors
export const selectReligion = (state) => state.mainCategory.religion;
export const selectSubcategory = (state) => state.mainCategory.subcategory;
export const selectMainSubUpdatedAt = (state) => state.mainCategory.updatedAt;

// Path helpers (just the path portion under /api/templates)
export const selectLatestPath = createSelector([selectReligion], (religion) => `/latest/${religion}`);
export const selectLatestPathWithSub = createSelector(
  [selectReligion, selectSubcategory],
  (religion, subcategory) => `/latest/${religion}/${subcategory}`
);

export default mainCategorySlice.reducer;
