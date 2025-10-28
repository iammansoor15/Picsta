import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import Video from 'react-native-video';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { COLORS, TYPOGRAPHY, SPACING, responsiveSize } from '../theme';
import localTemplateService from '../services/LocalTemplateService';
import likedTemplatesService from '../services/LikedTemplatesService';
import TemplatePreferences from '../services/TemplatePreferences';
import CustomIcon from './CustomIcon';
import {
  loadTemplatesByCategory,
  selectTemplatesByCategory,
  selectCategoryLoading,
  selectCategoryError,
  selectCategoryPagination,
  selectIsOnline,
  clearError as clearCloudinaryError,
  setOnlineStatus,
  deleteTemplate as deleteTemplateThunk
} from '../store/slices/cloudinaryTemplateSlice';
import { selectReligion as selectGlobalReligion } from '../store/slices/mainCategorySlice';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const numColumns = 1; // Single column full-width
const containerPadding = 0;
const itemSpacing = 0;
// Full width for single-column layout
const baseImageWidth = screenWidth;

const TemplateTabView = ({ 
  selectedCategory, 
  navigation 
}) => {
  const animatedScale = useRef(new Animated.Value(1)).current;
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadedTemplates, setDownloadedTemplates] = useState([]);
  const [downloadedLoading, setDownloadedLoading] = useState(false);
  const [likedTemplates, setLikedTemplates] = useState([]);
  const [likedLoading, setLikedLoading] = useState(false);

  // Memoized selectors to prevent unnecessary re-renders
  const selectCloudinaryTemplates = useMemo(() => selectTemplatesByCategory(selectedCategory), [selectedCategory]);
  const globalReligion = useSelector(selectGlobalReligion);
  const selectCloudinaryLoading = useMemo(() => selectCategoryLoading(selectedCategory), [selectedCategory]);
  const selectCloudinaryError = useMemo(() => selectCategoryError(selectedCategory), [selectedCategory]);
  const selectCloudinaryPagination = useMemo(() => selectCategoryPagination(selectedCategory), [selectedCategory]);

  // Redux selectors for Cloudinary templates (All Templates)
  const rawCloudinaryTemplates = useSelector(selectCloudinaryTemplates);
  const cloudinaryLoading = useSelector(selectCloudinaryLoading);
  const cloudinaryError = useSelector(selectCloudinaryError);
  const cloudinaryPagination = useSelector(selectCloudinaryPagination);
  const isOnline = useSelector(selectIsOnline);

  // Use raw templates directly without ratio enrichment
  const cloudinaryTemplates = useMemo(() => {
    return rawCloudinaryTemplates || [];
  }, [rawCloudinaryTemplates]);

  // Cloud templates loader
  const loadCloudinaryTemplates = useCallback(async () => {
    try {
      console.log('📂 Loading Cloudinary templates for category:', selectedCategory);
      console.log('🔄 Loading templates with higher limit and debug info');

      // Get main category preference(s) from storage
      let religions = [];
      try {
        const arr = await TemplatePreferences.getReligions();
        religions = Array.isArray(arr) ? arr : (arr ? [arr] : []);
      } catch (e) {
        console.warn('⚠️ Failed to get religions from preferences:', e?.message || e);
      }

      await dispatch(loadTemplatesByCategory({
        category: selectedCategory,
        options: { 
          page: 1, 
          limit: 10, // Load up to 10 templates initially
          reset: true,
          useCache: false, // Force fresh fetch
          religion: religions,
        }
      })).unwrap();
      console.log('✅ Template loading completed for category:', selectedCategory);
    } catch (error) {
      console.error('Error loading Cloudinary templates:', error);
      // Update online status based on error type
      const errorMessage = error.message || error.toString() || 'Unknown error';
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        dispatch(setOnlineStatus(false));
        Alert.alert(
          'Offline',
          'You are currently offline. Please check your internet connection to load downloaded templates.',
          [{ text: 'OK' }]
        );
      } else {
        // For other errors, assume we're online but there's a server issue
        dispatch(setOnlineStatus(true));
      }
    }
  }, [selectedCategory, dispatch, isOnline]);

  // Load downloaded templates from local storage
  const loadDownloadedTemplates = useCallback(async () => {
    try {
      setDownloadedLoading(true);
      console.log('📱 Loading downloaded templates for category:', selectedCategory);
      const templates = await localTemplateService.getDownloadedTemplatesByCategory(selectedCategory);
      setDownloadedTemplates(templates);
      console.log('✅ Loaded downloaded templates:', templates.length);
    } catch (error) {
      console.error('Error loading downloaded templates:', error);
      setDownloadedTemplates([]);
    } finally {
      setDownloadedLoading(false);
    }
  }, [selectedCategory]);

  // Load liked templates from local storage
  const loadLikedTemplates = useCallback(async () => {
    try {
      setLikedLoading(true);
      console.log('💖 Loading liked templates for category:', selectedCategory);
      const templates = await likedTemplatesService.getLikedTemplatesByCategory(selectedCategory);
      setLikedTemplates(templates);
      console.log('✅ Loaded liked templates:', templates.length);
    } catch (error) {
      console.error('Error loading liked templates:', error);
      setLikedTemplates([]);
    } finally {
      setLikedLoading(false);
    }
  }, [selectedCategory]);


  // Load templates when component mounts or category changes
  useEffect(() => {
    if (selectedCategory) {
      loadCloudinaryTemplates();
      loadDownloadedTemplates();
      loadLikedTemplates();
    }
  }, [selectedCategory, globalReligion, loadCloudinaryTemplates, loadDownloadedTemplates, loadLikedTemplates]);

  // Also reload when this screen regains focus (e.g., returning from Profile screen after changing preferences)
  useFocusEffect(
    useCallback(() => {
      if (selectedCategory) {
        loadCloudinaryTemplates();
      }
      // No cleanup needed
      return () => {};
    }, [selectedCategory, globalReligion, loadCloudinaryTemplates])
  );


  // Handle like/unlike functionality
  const handleLikeTemplate = useCallback(async (template, isCurrentlyLiked) => {
    try {
      if (isCurrentlyLiked) {
        await likedTemplatesService.unlikeTemplate(template.id || template.localId);
      } else {
        await likedTemplatesService.likeTemplate(template);
      }
      // Refresh liked templates
      await loadLikedTemplates();
    } catch (error) {
      console.error('Error handling like/unlike:', error);
      Alert.alert('Error', 'Failed to update template. Please try again.');
    }
  }, [loadLikedTemplates]);

  // Handle download functionality
  const handleDownloadTemplate = useCallback(async (template) => {
    try {
      await localTemplateService.saveTemplate(template);
      await loadDownloadedTemplates();
      Alert.alert('Success', 'Template downloaded successfully!');
    } catch (error) {
      console.error('Error downloading template:', error);
      Alert.alert('Error', 'Failed to download template. Please try again.');
    }
  }, [loadDownloadedTemplates]);

  // Handle delete functionality (cloud templates)
  const handleDeleteTemplate = useCallback((template) => {
    try {
      if (!template?.id) {
        Alert.alert('Error', 'Missing template ID.');
        return;
      }
      Alert.alert(
        'Delete Template',
        'Are you sure you want to delete this template from the cloud? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: async () => {
              try {
                await dispatch(deleteTemplateThunk({ category: selectedCategory, templateId: template.id })).unwrap();
                Alert.alert('Deleted', 'Template deleted successfully.');
                // Refresh list explicitly (defensive)
                await loadCloudinaryTemplates();
              } catch (err) {
                console.error('Error deleting template:', err);
                Alert.alert('Error', 'Failed to delete template. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in delete handler:', error);
      Alert.alert('Error', 'Failed to initiate delete.');
    }
  }, [dispatch, selectedCategory, loadCloudinaryTemplates]);


  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      dispatch(clearCloudinaryError('templates'));
      if (activeTab === 'all') {
        await loadCloudinaryTemplates();
      } else if (activeTab === 'downloaded') {
        await loadDownloadedTemplates();
      }
    } catch (error) {
      console.error('Error refreshing templates:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, loadCloudinaryTemplates, loadDownloadedTemplates, loadLikedTemplates, dispatch]);

  const handleTemplatePress = useCallback(async (template, index, isCloudTemplate = false) => {
    console.log('Template selected:', { template, index, isCloudTemplate, activeTab });
    
    try {
      let imageSource, templateData;
      
      if (isCloudTemplate || activeTab === 'all') {
        // Cloud template (from Cloudinary)
        imageSource = { uri: template.image_url || template.secure_url || template.url };
        templateData = {
          id: template.id,
          name: template.name,
          description: template.description,
          isCloudinary: true,
          cloudinaryData: template
        };
      } else {
        // Downloaded template (from local storage)
        imageSource = { uri: template.image_url || template.secure_url || template.url };
        templateData = {
          id: template.localId || template.id,
          name: template.name,
          description: template.description,
          isDownloaded: true,
          downloadedAt: template.downloadedAt,
          originalData: template
        };
      }

      const navigationParams = {
        image: imageSource,
        templateId: template.id || template.localId || index,
        templateType: selectedCategory,
        isCustomTemplate: true, // All templates are now considered custom (not default assets)
        customTemplateData: templateData,
        isCloudinaryTemplate: isCloudTemplate || activeTab === 'all',
        isDownloadedTemplate: activeTab === 'downloaded'
      };
      
      // Navigate directly to HeroScreen
      navigation.navigate('HeroScreen', navigationParams);
      
    } catch (error) {
      console.error('❌ Error handling template navigation:', error);
      Alert.alert('Error', 'Unable to open template. Please try again.');
    }
  }, [navigation, selectedCategory, activeTab]);


  // Template renderer with like/download buttons
  const renderTemplate = useCallback(({ item, index }) => {
    const isLiked = likedTemplates.some(t => t.id === item.id || t.public_id === item.public_id);
    const isDownloaded = downloadedTemplates.some(t => t.id === item.id || t.public_id === item.public_id);
    const isCloudTemplate = activeTab === 'all';
    const isVideo = item.resource_type === 'video' || item.video_url;
    const videoRef = useRef(null);
    
    // Use standard template dimensions
    const standardTemplateStyle = {
      width: baseImageWidth,
      height: screenHeight, // Full device height per item
      marginRight: 0,
      marginBottom: 0,
      borderRadius: 0,
    };
    
    return (
      <TouchableOpacity
        style={[
          styles.templateItem,
          standardTemplateStyle
        ]}
        onPress={() => handleTemplatePress(item, index, isCloudTemplate)}
        activeOpacity={0.7}
      >
        {isVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: item.video_url || item.image_url || item.url || item.secure_url }}
            style={styles.templateImage}
            resizeMode="cover"
            repeat={true}
            muted={false}
            paused={false}
            ignoreSilentSwitch="ignore"
            playInBackground={false}
            playWhenInactive={false}
            onError={(error) => {
              console.warn('Template video load error:', error);
            }}
            onEnd={() => {
              // Auto-restart video when it completes
              if (videoRef.current) {
                videoRef.current.seek(0);
              }
            }}
          />
        ) : (
          <Image
            source={{ uri: item.image_url || item.secure_url || item.url }}
            style={styles.templateImage}
            resizeMode="cover"
            onError={(error) => {
              console.warn('Template image load error:', error.nativeEvent.error);
            }}
          />
        )}
        
        {/* Action buttons overlay */}
        <View style={styles.actionButtonsContainer}>
          {/* Like button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton, isLiked && styles.likedButton]}
            onPress={() => handleLikeTemplate(item, isLiked)}
            activeOpacity={0.7}
          >
            <CustomIcon
              name={isLiked ? 'heart-filled' : 'heart-outline'}
              size={20}
              color={isLiked ? '#FF69B4' : '#FFF'}
              strokeColor={isLiked ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.8)'}
            />
          </TouchableOpacity>
          
          {/* Download arrow - only show for cloud templates */}
          {isCloudTemplate && (
            <>
              <TouchableOpacity
                onPress={() => handleDownloadTemplate(item)}
                activeOpacity={0.7}
                style={styles.downloadArrowOnly}
              >
                <CustomIcon
                  name="download-arrow"
                  size={20}
                  color={isDownloaded ? '#4CAF50' : '#FFF'}
                  strokeColor={isDownloaded ? 'rgba(76, 175, 80, 0.8)' : 'rgba(0,0,0,0.8)'}
                />
              </TouchableOpacity>

              {/* Delete (trash) icon below download */}
              <TouchableOpacity
                onPress={() => handleDeleteTemplate(item)}
                activeOpacity={0.7}
                style={styles.deleteButton}
              >
                <CustomIcon
                  name="trash"
                  size={18}
                  color={'#FFF'}
                  strokeColor={'rgba(0,0,0,0.8)'}
                />
              </TouchableOpacity>
            </>
          )}
          
        </View>
      </TouchableOpacity>
    );
  }, [activeTab, handleTemplatePress, handleLikeTemplate, handleDownloadTemplate, likedTemplates, downloadedTemplates]);

  const getCurrentTabData = useMemo(() => {
    if (activeTab === 'all') {
      return cloudinaryTemplates;
    } else if (activeTab === 'downloaded') {
      return downloadedTemplates;
    }
    return [];
  }, [activeTab, cloudinaryTemplates, downloadedTemplates]);

  const renderEmptyState = () => {
    if (activeTab === 'all') {
      if (cloudinaryError) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Unable to Load Templates</Text>
            <Text style={styles.emptyMessage}>
              {!isOnline 
                ? 'You are currently offline. Please check your internet connection.'
                : 'There was an error loading cloud templates. Please try again.'
              }
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );
      } else {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Cloud Templates</Text>
            <Text style={styles.emptyMessage}>
              Cloud templates from the server will appear here.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        );
      }
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No Downloaded Templates
          </Text>
          <Text style={styles.emptyMessage}>
            Templates you download will appear here for offline use.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderTabContent = () => {
    const data = getCurrentTabData;
    const isLoading = activeTab === 'all' ? cloudinaryLoading : downloadedLoading;
    
    if (isLoading && data.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {activeTab === 'all' ? 'Loading cloud templates...' : 'Loading downloaded templates...'}
          </Text>
        </View>
      );
    }

    if (data.length === 0) {
      return renderEmptyState();
    }

    // Standard content container style
    const dynamicListStyle = [styles.listContainer, { padding: 0 }];

    return (
      <FlatList
        data={data}
        renderItem={renderTemplate}
        keyExtractor={(item, index) => {
          if (activeTab === 'all') {
            return `cloud-${item.id || index}`;
          } else {
            return `downloaded-${item.localId || item.id || index}`;
          }
        }}
        numColumns={numColumns}
        scrollEnabled={false}
        contentContainerStyle={dynamicListStyle}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'downloaded' && styles.activeTab]}
          onPress={() => setActiveTab('downloaded')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'downloaded' && styles.activeTabText]}>
            Downloaded
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            transform: [{ scale: animatedScale }]
          }
        ]}
      >
        {renderTabContent()}
      </Animated.View>

      {/* Inline loading overlay while fetching templates */}
      {cloudinaryLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingOverlayText}>Loading templates...</Text>
        </View>
      )}

      {/* Connection Status */}
      {activeTab === 'downloaded' && !isOnline && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>🔴 Offline - Some features may be limited</Text>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  likedActiveTab: {
    backgroundColor: '#FF69B4', // Pink color for liked tab
  },
  tabText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontSize: 13,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  likedActiveTabText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  likedBadge: {
    backgroundColor: '#FF1493', // Deeper pink for liked badge
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 0,
  },
  rowContainer: {
    flexDirection: 'row',
  },
  filterColumn: {
    width: responsiveSize(80),
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  listColumn: {
    flex: 1,
  },
  filterButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: SPACING.borderRadius,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  templateItem: {
    // Width and height will be set dynamically via inline styles
    borderRadius: 0,
    overflow: 'hidden',
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    backgroundColor: COLORS.white,
    marginBottom: 0,
    position: 'relative',
  },
  templateImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: COLORS.backgroundLight,
  },
  actionButtonsContainer: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'transparent', // Ensure no background
  },
  actionButton: {
    width: 32, // 4:3 aspect ratio - width remains 32
    height: 24, // 4:3 aspect ratio - height is 32 * 3/4 = 24
    borderRadius: 12, // Adjusted radius (24/2)
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  likeButton: {
    backgroundColor: 'transparent',
  },
  likedButton: {
    backgroundColor: 'transparent',
  },
  downloadArrowOnly: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    width: 32, // 4:3 aspect ratio - width remains 32
    height: 24, // 4:3 aspect ratio - height is 32 * 3/4 = 24
    borderRadius: 12, // Adjusted radius (24/2)
    padding: SPACING.xs, // Small padding for touch target
    marginBottom: SPACING.sm,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 24,
    borderRadius: 12,
    padding: SPACING.xs,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  loadingOverlay: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: SPACING.borderRadius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingOverlayText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    marginLeft: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
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
  offlineIndicator: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: SPACING.borderRadius,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  offlineText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    fontWeight: '500',
  },
});

export default TemplateTabView;