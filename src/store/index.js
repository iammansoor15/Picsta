import { configureStore } from '@reduxjs/toolkit';
import profileSlice from './slices/profileSlice';
import profilePictureSlice from './slices/profilePictureSlice';
import templateSlice from './slices/templateSlice';
import categorySlice from './slices/categorySlice';
import cloudinaryTemplateSlice from './slices/cloudinaryTemplateSlice';
import mainCategorySlice from './slices/mainCategorySlice';

export const store = configureStore({
  reducer: {
    profile: profileSlice,
    profilePicture: profilePictureSlice,
    template: templateSlice,
    categories: categorySlice,
    cloudinaryTemplate: cloudinaryTemplateSlice,
    mainCategory: mainCategorySlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: [
          'meta.arg', 
          'payload.timestamp',
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'items.dates',
        ],
      },
    }),
});

export default store;
