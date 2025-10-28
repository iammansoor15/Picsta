import { createSlice, createSelector } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMPLATES_STORAGE_KEY = '@narayana_templates';

const initialState = {
  congratulationTemplates: [],
  birthdayTemplates: [],
  isLoading: false,
  error: null,
};

const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    loadTemplatesSuccess: (state, action) => {
      const { congratulationTemplates, birthdayTemplates } = action.payload;
      state.congratulationTemplates = congratulationTemplates || [];
      state.birthdayTemplates = birthdayTemplates || [];
      state.isLoading = false;
      state.error = null;
    },
    addTemplateSuccess: (state, action) => {
      const { category, template } = action.payload;
      const categoryKey = category === 'congratulations' ? 'congratulationTemplates' : 'birthdayTemplates';
      state[categoryKey].push(template);
      state.error = null;
    },
    removeTemplateSuccess: (state, action) => {
      const { category, templateId } = action.payload;
      const categoryKey = category === 'congratulations' ? 'congratulationTemplates' : 'birthdayTemplates';
      state[categoryKey] = state[categoryKey].filter(t => t.id !== templateId);
      state.error = null;
    },
    clearAllTemplatesSuccess: (state) => {
      state.congratulationTemplates = [];
      state.birthdayTemplates = [];
      state.error = null;
    },
  },
});

// Async thunks
export const loadTemplates = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const storedTemplates = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
    
    if (storedTemplates) {
      const templates = JSON.parse(storedTemplates);
      dispatch(loadTemplatesSuccess(templates));
    } else {
      dispatch(loadTemplatesSuccess({}));
    }
  } catch (error) {
    console.error('Error loading templates:', error);
    dispatch(setError('Failed to load templates'));
  }
};

export const saveTemplates = () => async (dispatch, getState) => {
  try {
    const { template } = getState();
    const templates = {
      congratulationTemplates: template.congratulationTemplates,
      birthdayTemplates: template.birthdayTemplates,
    };
    await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving templates:', error);
    dispatch(setError('Failed to save templates'));
  }
};

export const addTemplate = (category, templateData) => async (dispatch) => {
  try {
    const newTemplate = {
      id: Date.now().toString(),
      ...templateData,
      createdAt: new Date().toISOString(),
      category,
    };
    
    dispatch(addTemplateSuccess({ category, template: newTemplate }));
    
    // Save to storage after adding
    dispatch(saveTemplates());
    
    return newTemplate;
  } catch (error) {
    console.error('Error adding template:', error);
    dispatch(setError('Failed to add template'));
    throw error;
  }
};

export const removeTemplate = (category, templateId) => async (dispatch) => {
  try {
    dispatch(removeTemplateSuccess({ category, templateId }));
    
    // Save to storage after removing
    dispatch(saveTemplates());
  } catch (error) {
    console.error('Error removing template:', error);
    dispatch(setError('Failed to remove template'));
    throw error;
  }
};

export const clearAllTemplates = () => async (dispatch) => {
  try {
    await AsyncStorage.removeItem(TEMPLATES_STORAGE_KEY);
    dispatch(clearAllTemplatesSuccess());
    console.log('All templates cleared from storage');
  } catch (error) {
    console.error('Error clearing templates:', error);
    dispatch(setError('Failed to clear templates'));
  }
};

export const {
  setLoading,
  setError,
  clearError,
  loadTemplatesSuccess,
  addTemplateSuccess,
  removeTemplateSuccess,
  clearAllTemplatesSuccess,
} = templateSlice.actions;

// Selectors
export const selectCongratulationTemplates = (state) => state.template.congratulationTemplates;
export const selectBirthdayTemplates = (state) => state.template.birthdayTemplates;
export const selectIsLoading = (state) => state.template.isLoading;
export const selectError = (state) => state.template.error;

// Memoized selector for templates by category
export const selectAllTemplates = createSelector(
  [selectCongratulationTemplates, selectBirthdayTemplates],
  (congratulationTemplates, birthdayTemplates) => ({
    congratulations: congratulationTemplates,
    birthday: birthdayTemplates,
  })
);

// Memoized selector for getting templates by category
export const getTemplatesByCategory = (category) => createSelector(
  [(state) => state.template],
  (templateState) => {
    const categoryKey = category === 'congratulations' ? 'congratulationTemplates' : 'birthdayTemplates';
    return templateState[categoryKey] || [];
  }
);

export default templateSlice.reducer;
