import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import likedTemplatesService from '../services/LikedTemplatesService';
import CustomIcon from './CustomIcon';

const { width: screenWidth } = Dimensions.get('window');
const numColumns = 2; // Two columns
const containerPadding = SPACING.lg;
const itemSpacing = SPACING.lg;
// Two-column width with fixed spacing between columns
const imageWidth = Math.round((screenWidth - (containerPadding * 2) - itemSpacing) / numColumns);
// Portrait 9:16 (height = width * 16/9)
const imageHeight = Math.round((imageWidth * 16) / 9);

const LikedTemplatesView = ({ navigation }) => {
  const [likedTemplates, setLikedTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load liked templates
  const loadLikedTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('💖 Loading all liked templates...');
      const templates = await likedTemplatesService.getLikedTemplates();
      setLikedTemplates(templates);
      console.log('✅ Loaded liked templates:', templates.length);
    } catch (error) {
      console.error('Error loading liked templates:', error);
      setLikedTemplates([]);
      Alert.alert('Error', 'Failed to load liked templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadLikedTemplates();
    } catch (error) {
      console.error('Error refreshing liked templates:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLikedTemplates]);

  // Handle unlike functionality
  const handleUnlikeTemplate = useCallback(async (template) => {
    try {
      await likedTemplatesService.unlikeTemplate(template.id || template.localId);
      // Refresh liked templates
      await loadLikedTemplates();
    } catch (error) {
      console.error('Error unliking template:', error);
      Alert.alert('Error', 'Failed to unlike template. Please try again.');
    }
  }, [loadLikedTemplates]);

  // Handle template selection
  const handleTemplatePress = useCallback((template, index) => {
    console.log('Liked template selected:', { template, index });
    
const imageSource = { uri: template.image_url || template.secure_url || template.url };
    const templateData = {
      id: template.localId || template.id,
      name: template.name,
      description: template.description,
      isLiked: true,
      likedAt: template.likedAt,
      originalData: template
    };

    navigation.navigate('HeroScreen', {
      image: imageSource,
      templateId: template.id || template.localId || index,
      templateType: 'liked',
      isCustomTemplate: true,
      customTemplateData: templateData,
      isLikedTemplate: true
    });
  }, [navigation]);

  // Load templates on mount
  useEffect(() => {
    loadLikedTemplates();
  }, [loadLikedTemplates]);

  // Render template item
  const renderTemplate = useCallback(({ item, index }) => {
    return (
      <TouchableOpacity
        style={[
          styles.templateItem,
          { marginRight: index % numColumns === 0 ? itemSpacing : 0 }
        ]}
        onPress={() => handleTemplatePress(item, index)}
        activeOpacity={0.7}
      >
        <Image
source={{ uri: item.image_url || item.secure_url || item.url }}
          style={styles.templateImage}
          resizeMode="cover"
          onError={(error) => {
            console.warn('Liked template image load error:', error.nativeEvent.error);
          }}
        />
        
        {/* Action buttons overlay */}
        <View style={styles.actionButtonsContainer}>
          {/* Unlike button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => handleUnlikeTemplate(item)}
            activeOpacity={0.7}
          >
            <CustomIcon
              name="heart-filled"
              size={20}
              color="#FF69B4"
              strokeColor="rgba(0,0,0,0.3)"
            />
          </TouchableOpacity>
        </View>

        {/* Category indicator */}
        {item.category && (
          <View style={styles.categoryIndicator}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [handleTemplatePress, handleUnlikeTemplate]);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Liked Templates</Text>
      <Text style={styles.emptyMessage}>
        Templates you like will appear here. Tap the ❤️ button on any template to save it to your favorites.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading state
  if (isLoading && likedTemplates.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading liked templates...</Text>
      </View>
    );
  }

  // Render empty state
  if (!isLoading && likedTemplates.length === 0) {
    return renderEmptyState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={likedTemplates}
        renderItem={renderTemplate}
        keyExtractor={(item, index) => `liked-${item.localId || item.id || index}`}
        numColumns={numColumns}
        scrollEnabled={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingHorizontal: containerPadding,
  },
  templateItem: {
    width: imageWidth,
    height: imageHeight,
    borderRadius: SPACING.borderRadius * 1.5,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    backgroundColor: COLORS.white,
    marginBottom: itemSpacing,
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
    backgroundColor: 'transparent',
  },
  actionButton: {
    width: 32,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  likeButton: {
    backgroundColor: 'transparent',
  },
  categoryIndicator: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.borderRadius,
  },
  categoryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
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
});

export default LikedTemplatesView;