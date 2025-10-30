import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  RefreshControl,
  Dimensions,
  Alert,
  StyleSheet,
} from 'react-native';
import Video from 'react-native-video';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, SPACING, TYPOGRAPHY, responsiveSize } from '../theme';
import {
  loadTemplatesByCategory,
  selectTemplatesByCategory,
  selectCategoryLoading,
  selectCategoryError,
  selectCategoryPagination,
  selectIsOnline,
  clearError
} from '../store/slices/cloudinaryTemplateSlice';
import templateCacheService from '../services/TemplateCacheService';
import TemplatePreferences from '../services/TemplatePreferences';

const { width: screenWidth } = Dimensions.get('window');

// Template grid component with lazy loading and infinite scroll
const TemplateGrid = ({ 
  category, 
  onTemplateSelect, 
  numColumns = 2,
  showLoadMoreButton = false,
  refreshEnabled = true 
}) => {
  const dispatch = useDispatch();
  
  // Redux state
  const templates = useSelector(selectTemplatesByCategory(category));
  const loading = useSelector(selectCategoryLoading(category));
  const error = useSelector(selectCategoryError(category));
  const pagination = useSelector(selectCategoryPagination(category));
  const isOnline = useSelector(selectIsOnline);
  
  // Component state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [cachedTemplates, setCachedTemplates] = useState(new Set());
  
  // Configuration
  const INITIAL_LOAD_LIMIT = 10;
  const LOAD_MORE_LIMIT = 10;
  const MAX_RETRY_ATTEMPTS = 3;
  const PREFETCH_THRESHOLD = 2; // Start loading more when 2 items from end

  // Calculate item dimensions
  const itemMargin = SPACING.sm;
  const containerPadding = SPACING.md;
  const itemWidth = useMemo(() => {
    return (screenWidth - (containerPadding * 2) - (itemMargin * (numColumns - 1))) / numColumns;
  }, [numColumns]);
  const itemHeight = itemWidth * 1.2; // Aspect ratio 1:1.2

  // Initial load
  useEffect(() => {
    if (category && templates.length === 0 && !loading && !error) {
      loadInitialTemplates();
    }
  }, [category]);
  
  // Update cache status when templates change
  useEffect(() => {
    if (templates.length > 0) {
      updateCacheStatus(templates);
    }
  }, [templates, updateCacheStatus]);

  // Load initial templates
  const loadInitialTemplates = useCallback(async () => {
    try {
      setRetryAttempts(0);
      const result = await dispatch(loadTemplatesByCategory({
        category,
        options: { 
          page: 1, 
          limit: INITIAL_LOAD_LIMIT, 
          reset: true 
        }
      })).unwrap();
      
      // Check cache status for loaded templates
      await updateCacheStatus(result.templates || templates);
    } catch (error) {
      console.error('Error loading initial templates:', error);
      handleLoadError(error);
    }
  }, [category, dispatch]);

  // Load more templates (pagination)
  const loadMoreTemplates = useCallback(async () => {
    if (!pagination.has_next_page || isLoadingMore || loading) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const currentPage = pagination.current_page || 1;

      // Keep using the same main category preference(s) when paginating
      let religions = [];
      try {
        const arr = await TemplatePreferences.getReligions();
        religions = Array.isArray(arr) ? arr : (arr ? [arr] : []);
      } catch (e) {
        console.warn('⚠️ Failed to get religions for pagination:', e?.message || e);
      }
      
      const result = await dispatch(loadTemplatesByCategory({
        category,
        options: { 
          page: currentPage + 1, 
          limit: LOAD_MORE_LIMIT, 
          reset: false,
          religion: religions,
        }
      })).unwrap();
      
      // Check cache status for newly loaded templates
      await updateCacheStatus(result.templates || []);
      
      setRetryAttempts(0);
    } catch (error) {
      console.error('Error loading more templates:', error);
      handleLoadError(error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [category, dispatch, pagination, isLoadingMore, loading]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!refreshEnabled) return;
    
    try {
      setIsRefreshing(true);
      dispatch(clearError('templates'));
      await loadInitialTemplates();
    } catch (error) {
      console.error('Error refreshing templates:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadInitialTemplates, dispatch, refreshEnabled]);

  // Handle load error
  const handleLoadError = useCallback((error) => {
    if (retryAttempts < MAX_RETRY_ATTEMPTS) {
      const newAttempts = retryAttempts + 1;
      setRetryAttempts(newAttempts);
      
      // Auto-retry with exponential backoff
      setTimeout(() => {
        if (templates.length === 0) {
          loadInitialTemplates();
        } else {
          loadMoreTemplates();
        }
      }, Math.pow(2, newAttempts) * 1000);
    } else {
      // Max retries reached, show error to user
      if (!isOnline) {
        Alert.alert(
          'Offline',
          'You are currently offline. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error Loading Templates',
          'There was an error loading templates. Please try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handleRefresh() }
          ]
        );
      }
    }
  }, [retryAttempts, isOnline, templates.length, loadInitialTemplates, loadMoreTemplates, handleRefresh]);

  // Handle template selection
  const handleTemplateSelect = useCallback(async (template) => {
    try {
      // Cache the template for offline use when selected
      console.log('🎨 Caching selected template for offline use...');
      const cachedPath = await templateCacheService.getTemplateForHeroScreen(template);
      
      // Create template object with cached path
      const templateWithCache = {
        ...template,
        cachedPath,
        isFromCache: cachedPath.startsWith('file://')
      };
      
      if (onTemplateSelect) {
        onTemplateSelect(templateWithCache);
      }
    } catch (error) {
      console.error('Error caching template:', error);
      // Fallback to original template without cache
      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
    }
  }, [onTemplateSelect]);

  // Handle end reached (infinite scroll)
  const handleEndReached = useCallback(() => {
    if (!showLoadMoreButton) {
      loadMoreTemplates();
    }
  }, [loadMoreTemplates, showLoadMoreButton]);

  // Handle load more button press
  const handleLoadMorePress = useCallback(() => {
    loadMoreTemplates();
  }, [loadMoreTemplates]);

  // Render loading skeleton
  const renderLoadingSkeleton = () => {
    const skeletonItems = Array(INITIAL_LOAD_LIMIT).fill(null);
    
    return (
      <View style={styles.container}>
        <FlatList
          data={skeletonItems}
          renderItem={renderSkeletonItem}
          numColumns={numColumns}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.gridContainer}
          scrollEnabled={false}
        />
      </View>
    );
  };

  // Render skeleton item
  const renderSkeletonItem = ({ index }) => (
    <View style={[styles.templateItem, { width: itemWidth, height: itemHeight, marginRight: getMarginRight(index) }]}>
      <View style={[styles.skeletonImage, { width: itemWidth, height: itemHeight }]} />
    </View>
  );

  // Render template item
  const renderTemplateItem = ({ item, index }) => {
    const isCached = cachedTemplates.has(item.id);
    // Check if URL ends with video extensions or resource_type is video
    const imageUrl = item.video_url || item.image_url || item.url || item.secure_url;
    const isVideo = item.resource_type === 'video' || 
                   (imageUrl && (imageUrl.endsWith('.mp4') || imageUrl.endsWith('.mov') || 
                    imageUrl.endsWith('.avi') || imageUrl.includes('/video/upload/')));
    
    // DETAILED LOGGING FOR VIDEOS
    if (item.serial_no === 15 || item.serial_no === 16 || isVideo) {
      console.log('🎥 TEMPLATE ITEM DEBUG:', {
        serial_no: item.serial_no,
        id: item.id,
        resource_type: item.resource_type,
        isVideo: isVideo,
        has_video_url: !!item.video_url,
        has_image_url: !!item.image_url,
        video_url: item.video_url?.substring(0, 80) + '...',
        image_url: item.image_url?.substring(0, 80) + '...',
        url: item.url?.substring(0, 80) + '...',
        secure_url: item.secure_url?.substring(0, 80) + '...',
        detectedUrl: imageUrl?.substring(0, 80) + '...'
      });
    }
    
    return (
      <TouchableOpacity
        style={[styles.templateItem, { width: itemWidth, marginRight: getMarginRight(index) }]}
        onPress={() => handleTemplateSelect(item)}
        activeOpacity={0.8}
      >
        {isVideo ? (
          <Video
            source={{ uri: imageUrl }}
            style={[styles.templateImage, { width: itemWidth, height: itemHeight }]}
            resizeMode="cover"
            repeat={true}
            muted={true}
            paused={false}
            controls={false}
            ignoreSilentSwitch="ignore"
            playInBackground={false}
            playWhenInactive={false}
            posterResizeMode="cover"
            bufferConfig={{
              minBufferMs: 15000,
              maxBufferMs: 50000,
              bufferForPlaybackMs: 2500,
              bufferForPlaybackAfterRebufferMs: 5000
            }}
            maxBitRate={2000000}
            onLoad={(data) => {
              console.log('✅ Video loaded successfully:', item.serial_no, data);
            }}
            onBuffer={(buffering) => {
              console.log('📊 Video buffering status:', item.serial_no, buffering);
            }}
            onError={(error) => {
              console.error('❌ Template video load error:', item.serial_no, error);
              console.log('Failed video URL:', imageUrl);
            }}
          />
        ) : (
          <Image
            source={{ uri: item.image_url || item.secure_url || item.url }}
            style={[styles.templateImage, { width: itemWidth, height: itemHeight }]}
            resizeMode="cover"
            onError={(error) => {
              console.warn('Template image load error:', error.nativeEvent?.error || 'unknown');
            }}
          />
        )}
        
        {/* Video indicator */}
        {isVideo && (
          <View style={styles.videoIndicator}>
            <Text style={styles.videoIcon}>▶️</Text>
          </View>
        )}
        
        {/* Cache indicator */}
        {isCached && (
          <View style={styles.cacheIndicator}>
            <Text style={styles.cacheIcon}>💾</Text>
          </View>
        )}
        
        <View style={styles.templateOverlay}>
          <Text style={styles.templateName} numberOfLines={1}>
            {item.name}
          </Text>
          {isCached && (
            <Text style={styles.cacheStatus}>Available Offline</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Update cache status for templates
  const updateCacheStatus = useCallback(async (templatesToCheck) => {
    try {
      const cacheStatusPromises = templatesToCheck.map(async (template) => {
        const isCached = await templateCacheService.isTemplateCached(template.id);
        return { templateId: template.id, isCached };
      });
      
      const cacheStatuses = await Promise.all(cacheStatusPromises);
      
      setCachedTemplates(prev => {
        const newSet = new Set(prev);
        cacheStatuses.forEach(({ templateId, isCached }) => {
          if (isCached) {
            newSet.add(templateId);
          } else {
            newSet.delete(templateId);
          }
        });
        return newSet;
      });
    } catch (error) {
      console.warn('Error updating cache status:', error);
    }
  }, []);

  // Get margin right for item (grid spacing)
  const getMarginRight = useCallback((index) => {
    return (index + 1) % numColumns === 0 ? 0 : itemMargin;
  }, [numColumns, itemMargin]);

  // Render footer (loading more or load more button)
  const renderFooter = () => {
    if (!pagination.has_next_page) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.endText}>No more templates to load</Text>
        </View>
      );
    }

    if (showLoadMoreButton) {
      return (
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={handleLoadMorePress}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.loadMoreText}>Load More Templates</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.loadingText}>Loading more templates...</Text>
        </View>
      );
    }

    return null;
  };

  // Render error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Unable to Load Templates</Text>
      <Text style={styles.errorMessage}>
        {!isOnline 
          ? 'You are currently offline. Please check your internet connection.'
          : 'There was an error loading templates. Please try again.'
        }
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Templates Found</Text>
      <Text style={styles.emptyMessage}>
        There are no templates in this category yet.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Main render
  if (loading && templates.length === 0) {
    return renderLoadingSkeleton();
  }

  if (error && templates.length === 0) {
    return renderError();
  }

  if (!loading && templates.length === 0) {
    return renderEmpty();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        renderItem={renderTemplateItem}
        keyExtractor={(item) => item.id || item._id}
        numColumns={numColumns}
        contentContainerStyle={styles.gridContainer}
        onEndReached={handleEndReached}
        onEndReachedThreshold={PREFETCH_THRESHOLD / 10} // Convert to fraction
        ListFooterComponent={renderFooter}
        refreshControl={
          refreshEnabled ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: itemHeight + SPACING.md,
          offset: Math.floor(index / numColumns) * (itemHeight + SPACING.md),
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gridContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  templateItem: {
    marginBottom: SPACING.md,
    borderRadius: SPACING.borderRadius,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  templateImage: {
    backgroundColor: COLORS.backgroundLight,
  },
  templateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  templateName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '600',
  },
  skeletonImage: {
    backgroundColor: COLORS.border,
    borderRadius: SPACING.borderRadius,
  },
  footerContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.borderRadius,
    minWidth: responsiveSize(120),
    alignItems: 'center',
  },
  loadMoreText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.white,
    fontWeight: '600',
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  endText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.borderRadius,
  },
  retryButtonText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  refreshButton: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.borderRadius,
  },
  refreshButtonText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cacheIndicator: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cacheIcon: {
    fontSize: 12,
  },
  cacheStatus: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.success,
    marginTop: 2,
    fontWeight: '500',
  },
  videoIndicator: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  videoIcon: {
    fontSize: 12,
  },
});

export default TemplateGrid;