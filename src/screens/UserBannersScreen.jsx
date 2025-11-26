import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import BannerStorageService from '../services/BannerStorageService';
import { cropResultManager } from '../utils/CropResultManager';
import RNFS from 'react-native-fs';

const { width: screenWidth } = Dimensions.get('window');
const BANNER_WIDTH = screenWidth - 40; // 20px padding on each side
const BANNER_ASPECT_RATIO = 5; // 5:1 ratio

const UserBannersScreen = ({ navigation, route }) => {
  // Get sourceScreen from navigation params to route banner back to correct HeroScreen instance
  const sourceScreen = route?.params?.sourceScreen;
  console.log('📥 UserBannersScreen: Mounted with sourceScreen:', sourceScreen);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const list = await BannerStorageService.listBanners();
      console.log('📋 Loaded banners:', {
        count: list.length,
        banners: list.map(b => ({
          id: b.id,
          uri: b.uri,
          filename: b.filename,
          uriLength: b.uri?.length || 0
        }))
      });
      setBanners(list);
    } catch (error) {
      console.error('❌ Error loading banners:', error);
      Alert.alert('Error', 'Failed to load saved banners');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBanners();
    setRefreshing(false);
  };

  const debugBannerStorage = async () => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🔍 DEBUG: Banner Storage Check');
      console.log('='.repeat(60));
      
      const bannersDir = `${RNFS.DocumentDirectoryPath}/banners`;
      console.log('📁 Directory:', bannersDir);
      
      const dirExists = await RNFS.exists(bannersDir);
      console.log('📁 Directory exists:', dirExists);
      
      if (dirExists) {
        const files = await RNFS.readDir(bannersDir);
        console.log('📂 Files in directory:', files.length);
        files.forEach((file, idx) => {
          console.log(`  [${idx}] ${file.name}`);
          console.log(`       Size: ${file.size} bytes`);
          console.log(`       Path: ${file.path}`);
        });
      }
      
      const list = await BannerStorageService.listBanners();
      console.log('\n💾 Banners in AsyncStorage:', list.length);
      list.forEach((banner, idx) => {
        console.log(`  [${idx}] ${banner.filename}`);
        console.log(`       ID: ${banner.id}`);
        console.log(`       URI: ${banner.uri}`);
      });
      
      console.log('='.repeat(60) + '\n');
      
      Alert.alert(
        'Debug Info',
        `Directory exists: ${dirExists}\nFiles: ${dirExists ? (await RNFS.readDir(bannersDir)).length : 0}\nBanners in list: ${list.length}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Debug error:', error);
      Alert.alert('Debug Error', error.message);
    }
  };

  const handleUseBanner = (banner) => {
    try {
      console.log('🎯 UserBannersScreen: Using banner:', {
        id: banner.id,
        uri: banner.uri,
        filename: banner.filename,
        sourceScreen: sourceScreen
      });

      // Format URI properly - ensure it has file:// prefix for React Native Image
      let formattedUri = banner.uri.startsWith('file://')
        ? banner.uri
        : `file://${banner.uri}`;

      // Add cache-busting parameter to force reload
      const cacheSuffix = `t=${Date.now()}`;
      formattedUri = formattedUri.includes('?')
        ? `${formattedUri}&${cacheSuffix}`
        : `${formattedUri}?${cacheSuffix}`;

      console.log('✅ UserBannersScreen: Formatted banner URI:', formattedUri);

      // Set the banner as crop result - pass sourceScreen so correct HeroScreen receives it
      console.log('📤 UserBannersScreen: Sending banner to sourceScreen:', sourceScreen);
      cropResultManager.setCropResult(formattedUri, 'banner', null, false, sourceScreen);

      console.log('✅ UserBannersScreen: Banner set via cropResultManager with sourceScreen');

      // Navigate back to editor
      navigation.goBack();
    } catch (error) {
      console.error('❌ UserBannersScreen: Error using banner:', error);
      Alert.alert('Error', 'Failed to use banner: ' + error.message);
    }
  };

  const handleDeleteBanner = (banner) => {
    Alert.alert(
      'Delete Banner',
      'Are you sure you want to delete this banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await BannerStorageService.removeBanner(banner.id);
              await loadBanners(); // Reload list
            } catch (error) {
              console.error('Error deleting banner:', error);
              Alert.alert('Error', 'Failed to delete banner');
            }
          },
        },
      ]
    );
  };

  const renderBannerItem = ({ item }) => {
    // Format URI properly for React Native Image component
    const imageUri = item.uri.startsWith('file://') 
      ? item.uri 
      : `file://${item.uri}`;
    
    const hasError = imageErrors[item.id];
    
    return (
      <View style={styles.bannerCard}>
        {hasError ? (
          <View style={[styles.bannerImage, styles.bannerImageError]}>
            <Text style={styles.errorText}>⚠️ Image not found</Text>
            <Text style={styles.errorSubtext}>{item.filename}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: imageUri }}
            style={styles.bannerImage}
            resizeMode="cover"
            onError={(e) => {
              console.error('❌ Failed to load banner image:', {
                id: item.id,
                uri: item.uri,
                imageUri,
                error: e.nativeEvent.error
              });
              setImageErrors(prev => ({ ...prev, [item.id]: true }));
            }}
            onLoad={() => {
              console.log('✅ Banner image loaded successfully:', item.id);
            }}
          />
        )}
        <View style={styles.bannerActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.useButton]}
          onPress={() => handleUseBanner(item)}
        >
          <Text style={styles.actionButtonText}>Use</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteBanner(item)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No saved banners yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Create a banner to save it here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Banners</Text>
        <TouchableOpacity
          onPress={debugBannerStorage}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading banners...</Text>
        </View>
      ) : (
        <FlatList
          data={banners}
          renderItem={renderBannerItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
};

export default UserBannersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: COLORS.text,
  },
  headerTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  listContent: {
    padding: SPACING.lg,
  },
  bannerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bannerImage: {
    width: BANNER_WIDTH,
    height: BANNER_WIDTH / BANNER_ASPECT_RATIO,
    backgroundColor: COLORS.lightGray,
  },
  bannerImageError: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray || '#e0e0e0',
  },
  errorText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.error || '#F44336',
    marginBottom: SPACING.xs,
  },
  errorSubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  bannerActions: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButton: {
    backgroundColor: COLORS.accent,
  },
  deleteButton: {
    backgroundColor: COLORS.error || '#F44336',
  },
  actionButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 3,
  },
  emptyStateText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyStateSubtext: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
