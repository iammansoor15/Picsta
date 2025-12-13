import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS, TYPOGRAPHY } from '../theme';
import BannerBuilder from '../Components/BannerBuilder';
import BannerCreate from '../Components/BannerCreate';

const TAB_SIMPLE = 'simple';
const TAB_COLORFUL = 'colorful';

const BannerCreatorScreen = ({ navigation, route }) => {
  const sourceScreen = route?.params?.sourceScreen;
  const initialTab = route?.params?.initialTab;

  const [activeTab, setActiveTab] = useState(
    initialTab === 'colorful' ? TAB_COLORFUL : TAB_SIMPLE
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
        <Text style={styles.headerTitle}>Create Banner</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_SIMPLE && styles.tabActive]}
          onPress={() => setActiveTab(TAB_SIMPLE)}
        >
          <Text style={[styles.tabText, activeTab === TAB_SIMPLE && styles.tabTextActive]}>
            Simple
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_COLORFUL && styles.tabActive]}
          onPress={() => setActiveTab(TAB_COLORFUL)}
        >
          <Text style={[styles.tabText, activeTab === TAB_COLORFUL && styles.tabTextActive]}>
            Colorful
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === TAB_SIMPLE ? (
        <BannerCreate
          navigation={navigation}
          route={{ params: { sourceScreen } }}
        />
      ) : (
        <BannerBuilder
          navigation={navigation}
          sourceScreen={sourceScreen}
        />
      )}
    </View>
  );
};

export default BannerCreatorScreen;

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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.accent,
  },
});
