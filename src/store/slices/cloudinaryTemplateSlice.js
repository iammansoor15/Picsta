import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import cloudinaryTemplateService from '../../services/CloudinaryTemplateService';

// Async thunks for template operations

/**
 * Load all template categories
 */
export const loadTemplateCategories = createAsyncThunk(
  'cloudinaryTemplate/loadCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await cloudinaryTemplateService.getTemplateCategories();
      return categories;
    } catch (error) {
      console.error('Error loading template categories:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Load templates by category with pagination
 */
export const loadTemplatesByCategory = createAsyncThunk(
  'cloudinaryTemplate/loadByCategory',
  async ({ category, options = {} }, { rejectWithValue, getState }) => {
    try {
      const { page = 1, limit = 10, reset = false, ratio = null, religion = null } = options;
      const state = getState();
      
      // Get existing pagination info
      const categoryData = state.cloudinaryTemplate.categories[category];
      const nextCursor = (!reset && categoryData?.pagination?.next_cursor) ? 
        categoryData.pagination.next_cursor : null;
      
      const requestOptions = {
        page,
        limit,
        next_cursor: nextCursor,
        useCache: page === 1 && !nextCursor && !reset, // Bypass cache when reset is true
        ...(ratio ? { ratio } : {}),
        ...(religion ? { religion } : {}),
      };
      
      const result = await cloudinaryTemplateService.getTemplatesByCategory(category, requestOptions);
      
      return {
        category,
        templates: result.templates || [],
        pagination: result.pagination || {},
        reset: reset || false,
        page: options.page || 1,
        ratio: ratio || null
      };
    } catch (error) {
      console.error(`Error loading templates for category ${category}:`, error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Upload a new template
 */
export const uploadTemplate = createAsyncThunk(
  'cloudinaryTemplate/upload',
  async ({ imageUri, category, templateData }, { rejectWithValue, dispatch }) => {
    try {
const template = await cloudinaryTemplateService.uploadTemplate(imageUri, category, templateData);
      
      // Refresh the category to show the new template
      console.log('🔄 Triggering category refresh after upload for category:', category);
      await dispatch(loadTemplatesByCategory({ 
        category, 
        options: { page: 1, reset: true, ratio: templateData?.ratio || null } 
      }));
      console.log('✅ Category refresh completed after upload');
      
      return {
        category,
        template
      };
    } catch (error) {
      console.error('Error uploading template:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Delete a template
 */
export const deleteTemplate = createAsyncThunk(
  'cloudinaryTemplate/delete',
  async ({ category, templateId }, { rejectWithValue, dispatch }) => {
    try {
      await cloudinaryTemplateService.deleteTemplate(category, templateId);
      
      // Refresh the category to remove the deleted template
      dispatch(loadTemplatesByCategory({ 
        category, 
        options: { page: 1, reset: true } 
      }));
      
      return {
        category,
        templateId
      };
    } catch (error) {
      console.error('Error deleting template:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Search templates across categories
 */
export const searchTemplates = createAsyncThunk(
  'cloudinaryTemplate/search',
  async ({ query, options = {} }, { rejectWithValue }) => {
    try {
      const result = await cloudinaryTemplateService.searchTemplates(query, options);
      return {
        query,
        ...result
      };
    } catch (error) {
      console.error('Error searching templates:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Clear template cache
 */
export const clearTemplateCache = createAsyncThunk(
  'cloudinaryTemplate/clearCache',
  async (_, { rejectWithValue }) => {
    try {
      await cloudinaryTemplateService.clearCache();
      return true;
    } catch (error) {
      console.error('Error clearing template cache:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  // Template categories with their templates and pagination
  categories: {},
  
  // Available category list
  categoryList: [],
  
  // Search results
  searchResults: {
    templates: [],
    pagination: {},
    query: '',
    loading: false
  },
  
  // Loading states
  loading: {
    categories: false,
    upload: false,
    delete: false
  },
  
  // Error states
  error: {
    categories: null,
    templates: null,
    upload: null,
    delete: null,
    search: null
  },
  
  // UI states
  lastUpdated: null,
  isOnline: true, // Default to online
};

// Create slice
const cloudinaryTemplateSlice = createSlice({
  name: 'cloudinaryTemplate',
  initialState,
  reducers: {
    // Clear all errors
    clearErrors: (state) => {
      Object.keys(state.error).forEach(key => {
        state.error[key] = null;
      });
    },
    
    // Clear specific error
    clearError: (state, action) => {
      const errorType = action.payload;
      if (state.error[errorType] !== undefined) {
        state.error[errorType] = null;
      }
    },
    
    // Set online status
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    
    // Reset search results
    resetSearchResults: (state) => {
      state.searchResults = {
        templates: [],
        pagination: {},
        query: '',
        loading: false
      };
    },
    
    // Update template in category (for optimistic updates)
    updateTemplateInCategory: (state, action) => {
      const { category, templateId, updates } = action.payload;
      if (state.categories[category]?.templates) {
        const templateIndex = state.categories[category].templates.findIndex(
          t => t.id === templateId
        );
        if (templateIndex !== -1) {
          state.categories[category].templates[templateIndex] = {
            ...state.categories[category].templates[templateIndex],
            ...updates
          };
        }
      }
    },
    
    // Remove template from category (for optimistic updates)
    removeTemplateFromCategory: (state, action) => {
      const { category, templateId } = action.payload;
      if (state.categories[category]?.templates) {
        state.categories[category].templates = state.categories[category].templates.filter(
          t => t.id !== templateId
        );
      }
    }
  },
  
  extraReducers: (builder) => {
    // Load template categories
    builder
      .addCase(loadTemplateCategories.pending, (state) => {
        state.loading.categories = true;
        state.error.categories = null;
      })
      .addCase(loadTemplateCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categoryList = action.payload;
        state.lastUpdated = Date.now();
        
        // Initialize category data structure for each category
        action.payload.forEach(category => {
          if (!state.categories[category.name]) {
            state.categories[category.name] = {
              templates: [],
              pagination: {},
              loading: false,
              error: null,
              prefetch: []
            };
          }
        });
      })
      .addCase(loadTemplateCategories.rejected, (state, action) => {
        state.loading.categories = false;
        state.error.categories = action.payload;
      });
    
    // Load templates by category
    builder
      .addCase(loadTemplatesByCategory.pending, (state, action) => {
        const category = action.meta.arg.category;
        if (!state.categories[category]) {
          state.categories[category] = {
            templates: [],
            pagination: {},
            loading: false,
            error: null,
            prefetch: []
          };
        }
        state.categories[category].loading = true;
        state.categories[category].error = null;
      })
      .addCase(loadTemplatesByCategory.fulfilled, (state, action) => {
        const { category, templates, pagination, reset } = action.payload;
        
        if (!state.categories[category]) {
          state.categories[category] = {
            templates: [],
            pagination: {},
            loading: false,
            error: null,
            prefetch: []
          };
        }
        
        state.categories[category].loading = false;
        
        if (reset || !state.categories[category].templates.length) {
          // Replace templates (first page or reset)
          state.categories[category].templates = templates;
        } else {
          // Append templates (pagination)
          const existingIds = new Set(state.categories[category].templates.map(t => t.id));
          const newTemplates = templates.filter(t => !existingIds.has(t.id));
          state.categories[category].templates.push(...newTemplates);
        }
        
        state.categories[category].pagination = pagination;

        // Build a prefetch buffer of up to 10 images; if fewer are available, store remaining without error
        const fullList = state.categories[category].templates || [];
        state.categories[category].prefetch = fullList.slice(0, 10);

        state.lastUpdated = Date.now();
      })
      .addCase(loadTemplatesByCategory.rejected, (state, action) => {
        const category = action.meta.arg.category;
        if (!state.categories[category]) {
          state.categories[category] = {
            templates: [],
            pagination: {},
            loading: false,
            error: null,
            prefetch: []
          };
        }
        state.categories[category].loading = false;
        state.categories[category].error = action.payload;
        state.error.templates = action.payload;
      });
    
    // Upload template
    builder
      .addCase(uploadTemplate.pending, (state) => {
        state.loading.upload = true;
        state.error.upload = null;
      })
      .addCase(uploadTemplate.fulfilled, (state, action) => {
        state.loading.upload = false;
        // Template will be added when category is refreshed
      })
      .addCase(uploadTemplate.rejected, (state, action) => {
        state.loading.upload = false;
        state.error.upload = action.payload;
      });
    
    // Delete template
    builder
      .addCase(deleteTemplate.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.loading.delete = false;
        // Template will be removed when category is refreshed
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload;
      });
    
    // Search templates
    builder
      .addCase(searchTemplates.pending, (state) => {
        state.searchResults.loading = true;
        state.error.search = null;
      })
      .addCase(searchTemplates.fulfilled, (state, action) => {
        const { query, templates, pagination } = action.payload;
        state.searchResults = {
          templates,
          pagination,
          query,
          loading: false
        };
      })
      .addCase(searchTemplates.rejected, (state, action) => {
        state.searchResults.loading = false;
        state.error.search = action.payload;
      });
    
    // Clear cache
    builder
      .addCase(clearTemplateCache.fulfilled, (state) => {
        // Reset all cached data
        state.categories = {};
        state.searchResults = {
          templates: [],
          pagination: {},
          query: '',
          loading: false
        };
      });
  }
});

// Export actions
export const {
  clearErrors,
  clearError,
  setOnlineStatus,
  resetSearchResults,
  updateTemplateInCategory,
  removeTemplateFromCategory
} = cloudinaryTemplateSlice.actions;

// Selectors
export const selectCategoryList = (state) => state.cloudinaryTemplate.categoryList;
export const selectCategoriesLoading = (state) => state.cloudinaryTemplate.loading.categories;
export const selectCategoriesError = (state) => state.cloudinaryTemplate.error.categories;

// Memoized selectors for category-specific data
export const selectTemplatesByCategory = (category) => createSelector(
  [(state) => state.cloudinaryTemplate.categories[category]],
  (categoryData) => categoryData?.templates || []
);

export const selectCategoryLoading = (category) => createSelector(
  [(state) => state.cloudinaryTemplate.categories[category]],
  (categoryData) => categoryData?.loading || false
);

export const selectCategoryError = (category) => createSelector(
  [(state) => state.cloudinaryTemplate.categories[category]],
  (categoryData) => categoryData?.error || null
);

export const selectCategoryPagination = (category) => createSelector(
  [(state) => state.cloudinaryTemplate.categories[category]],
  (categoryData) => categoryData?.pagination || {}
);

// Prefetched buffer (up to 10) for quick access/display
export const selectCategoryPrefetch = (category) => createSelector(
  [(state) => state.cloudinaryTemplate.categories[category]],
  (categoryData) => categoryData?.prefetch || []
);

export const selectSearchResults = (state) => state.cloudinaryTemplate.searchResults;
export const selectUploadLoading = (state) => state.cloudinaryTemplate.loading.upload;
export const selectUploadError = (state) => state.cloudinaryTemplate.error.upload;
export const selectDeleteLoading = (state) => state.cloudinaryTemplate.loading.delete;
export const selectDeleteError = (state) => state.cloudinaryTemplate.error.delete;
export const selectIsOnline = (state) => state.cloudinaryTemplate.isOnline;
export const selectLastUpdated = (state) => state.cloudinaryTemplate.lastUpdated;

// Memoized selectors
export const selectAllTemplates = createSelector(
  [(state) => state.cloudinaryTemplate.categories],
  (categories) => {
    const allTemplates = [];
    Object.values(categories).forEach(categoryData => {
      if (categoryData.templates) {
        allTemplates.push(...categoryData.templates);
      }
    });
    return allTemplates;
  }
);

export const selectTemplateCount = createSelector(
  [(state) => state.cloudinaryTemplate.categories],
  (categories) => {
    let totalCount = 0;
    Object.values(categories).forEach(categoryData => {
      if (categoryData.templates) {
        totalCount += categoryData.templates.length;
      }
    });
    return totalCount;
  }
);

export const selectCategoryStats = createSelector(
  [(state) => state.cloudinaryTemplate.categories],
  (categories) => {
    const stats = {};
    Object.entries(categories).forEach(([categoryName, categoryData]) => {
      stats[categoryName] = {
        templateCount: categoryData.templates?.length || 0,
        hasMore: categoryData.pagination?.has_next_page || false,
        loading: categoryData.loading || false,
        error: categoryData.error
      };
    });
    return stats;
  }
);

export default cloudinaryTemplateSlice.reducer;