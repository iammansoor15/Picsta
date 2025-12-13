import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { cropResultManager } from '../utils/CropResultManager';
import BannerStorageService from '../services/BannerStorageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --------- Expanded Themes (background + primary/shop color) ----------
const THEMES = [
  { id: 't1', name: 'Ivory & Brown', bg: '#fffaf3', shop: '#111827' },
  { id: 't2', name: 'Cream & Indigo', bg: '#fffaf3', shop: '#0b3b82' },
  { id: 't3', name: 'Jet Black', bg: '#0a0a0a', shop: '#fafaf9' },
  { id: 't4', name: 'Soft Mint', bg: '#f0fdf4', shop: '#065f46' },
  { id: 't5', name: 'Peach Bliss', bg: '#fff1f0', shop: '#7f1d1d' },
  { id: 't6', name: 'Lavender Haze', bg: '#faf5ff', shop: '#6b21a8' },
  { id: 't7', name: 'Ocean Deep', bg: '#ecfeff', shop: '#0369a1' },
  { id: 't8', name: 'Sandy Beige', bg: '#fffbeb', shop: '#7c4a2b' },
  { id: 't9', name: 'Charcoal & Gold', bg: '#111827', shop: '#facc15' },
  { id: 't10', name: 'Forest', bg: '#f7fff8', shop: '#065f46' },
  { id: 't11', name: 'Sunset Glow', bg: '#fff7ed', shop: '#c2410c' },
  { id: 't12', name: 'Vintage Paper', bg: '#f6efde', shop: '#6b4f3a' },
  { id: 't13', name: 'Cool Slate', bg: '#f1f5f9', shop: '#0f172a' },
  { id: 't14', name: 'Berry Pop', bg: '#fff1f7', shop: '#be185d' },
  { id: 't15', name: 'Minimal White', bg: '#ffffff', shop: '#111827' },
  { id: 't16', name: 'Deep Navy', bg: '#07104b', shop: '#a7f3d0' },
  { id: 't17', name: 'Olive Earth', bg: '#fbfef6', shop: '#535b28' },
  { id: 't18', name: 'Coral Reef', bg: '#fff5f0', shop: '#ef4444' },
];

// --------- Palettes (friendly options) ----------
const PALETTES = [
  { id: 'p1', name: 'Warm (Sunrise)', colors: ['#ff7a18', '#ff512f', '#ff8a65', '#f97316', '#ef4444'] },
  { id: 'p2', name: 'Cool Blues', colors: ['#00c6ff', '#0072ff', '#00bcd4', '#1e90ff', '#60a5fa'] },
  { id: 'p3', name: 'Bright Pop', colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'] },
  { id: 'p4', name: 'Pastel Soft', colors: ['#ffd6e0', '#c7f9cc', '#cfe9ff', '#fff1b6', '#fce7f3'] },
  { id: 'p5', name: 'Neon Glow', colors: ['#ff00cc', '#ff0077', '#00ffcc', '#00ffd5', '#7cff00'] },
  { id: 'p6', name: 'Vintage', colors: ['#d4b483', '#b77b57', '#8b5e3c', '#e7cfa3', '#6b4f3a'] },
  { id: 'p7', name: 'Earthy', colors: ['#6b4226', '#a67c52', '#c9b79c', '#7a5c40', '#3d2b1f'] },
  { id: 'p8', name: 'Jewel Tones', colors: ['#0f766e', '#06b6d4', '#7c3aed', '#b91c1c', '#0ea5a4'] },
  { id: 'p9', name: 'Sunset', colors: ['#ff9a8b', '#ff6b6b', '#ffb199', '#ff7a7a', '#ff3d00'] },
  { id: 'p10', name: 'Ocean', colors: ['#0369a1', '#075985', '#0ea5a4', '#38bdf8', '#7dd3fc'] },
  { id: 'p11', name: 'Monochrome', colors: ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db'] },
  { id: 'p12', name: 'Retro', colors: ['#f97316', '#f59e0b', '#86efac', '#60a5fa', '#be185d'] },
  { id: 'p13', name: 'Holiday', colors: ['#0ea5a4', '#ef4444', '#ffd166', '#b91c1c', '#06b6d4'] },
  { id: 'p14', name: 'Spring Bloom', colors: ['#f472b6', '#fca5a5', '#fde68a', '#86efac', '#a7f3d0'] },
  { id: 'p15', name: 'Stone', colors: ['#9ca3af', '#6b7280', '#4b5563', '#374151', '#111827'] },
];

const TEMPLATES = [
  { id: 'center', label: 'Centered' },
  { id: 'tag', label: 'Address' },
  { id: 'logo-left', label: 'Logo Left' },
];

export default function BannerBuilder({ navigation, sourceScreen, onBannerSaved }) {
  const [shopName, setShopName] = useState('DigitalHUB');
  const [subtitle, setSubtitle] = useState('Groceries • Since 1996');
  const [theme, setTheme] = useState(THEMES[0]);
  const [palette, setPalette] = useState(PALETTES[2]);
  const [template, setTemplate] = useState('center');
  const [mobileNumber, setMobileNumber] = useState('+919999999999');
  const [isSaving, setIsSaving] = useState(false);
  const viewShotRef = useRef(null);

  const baseFont = SCREEN_WIDTH > 420 ? 86 : 68;
  const getFontSize = (txt) => {
    const len = (txt || '').replace(/\s+/g, '').length || 6;
    if (len <= 6) return baseFont;
    if (len <= 10) return Math.round(baseFont * 0.86);
    if (len <= 16) return Math.round(baseFont * 0.7);
    return Math.round(baseFont * 0.56);
  };
  const shopFontSize = getFontSize(shopName);
  const displayText = (shopName || 'YOUR SHOP NAME').toUpperCase();

  const saveBanner = async () => {
    try {
      setIsSaving(true);
      const uri = await viewShotRef.current?.capture({ format: 'png', quality: 1, result: 'tmpfile' });
      if (!uri) return;
      await BannerStorageService.saveBanner(uri);
      const finalUri = uri.includes('?') ? `${uri}&t=${Date.now()}` : `${uri}?t=${Date.now()}`;
      console.log('📤 BannerBuilder: Sending banner to sourceScreen:', sourceScreen);
      try {
        cropResultManager.setCropResult(finalUri, 'banner', null, false, sourceScreen);
      } catch {}
      if (onBannerSaved) {
        onBannerSaved();
      }
      if (navigation) {
        navigation.goBack();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Banner Builder</Text>

      <TextInput
        style={styles.input}
        value={shopName}
        onChangeText={setShopName}
        placeholder="Shop name"
        placeholderTextColor="#9ca3af"
      />
      <TextInput
        style={styles.input}
        value={subtitle}
        onChangeText={setSubtitle}
        placeholder="Subtitle / tagline"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>Mobile Number (shown lower-left)</Text>
      <TextInput
        style={styles.input}
        value={mobileNumber}
        onChangeText={setMobileNumber}
        placeholder="+91xxxxxxxxxx"
        keyboardType="phone-pad"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>Template</Text>
      <View style={styles.templateRow}>
        {TEMPLATES.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTemplate(t.id)}
            style={[styles.btn, template === t.id && styles.btnActive]}
          >
            <Text style={template === t.id ? styles.btnTextActive : styles.btnText}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Theme</Text>
      <FlatList
        data={THEMES}
        horizontal
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setTheme(item)}
            style={[styles.themeCard, { borderColor: theme.id === item.id ? item.shop : '#444' }]}
          >
            <View style={{ backgroundColor: item.bg, width: 40, height: 28, borderRadius: 4, borderWidth: 1, borderColor: '#555' }} />
            <Text style={{ color: item.shop, fontWeight: '700', marginTop: 6, fontSize: 11 }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.label}>Letter Palettes — pick a mood</Text>
      <FlatList
        data={PALETTES}
        horizontal
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setPalette(item)}
            style={[styles.paletteCard, { borderColor: palette.id === item.id ? COLORS.accent : '#444' }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {item.colors.slice(0, 5).map((c, idx) => (
                <View key={idx} style={{ width: 28, height: 20, backgroundColor: c, marginRight: 4, borderRadius: 3, borderWidth: 0.6, borderColor: '#555' }} />
              ))}
            </View>
            <Text style={{ marginTop: 6, fontWeight: '700', color: COLORS.text, fontSize: 11 }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={{ height: 16 }} />

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
        <View style={[styles.previewWrap, { backgroundColor: theme.bg }]}>
          <View style={[styles.previewInner, { borderColor: theme.shop }]} collapsable={false}>
            {template === 'logo-left' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                <View style={styles.logoPlaceholder}>
                  <Text style={{ fontSize: 12 }}>LOGO</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {displayText.split('').map((ch, i) => (
                      <Text key={i} style={{ color: palette.colors[i % palette.colors.length], fontSize: shopFontSize * 0.5, fontWeight: '900', marginRight: 1 }}>{ch}</Text>
                    ))}
                  </View>
                  {subtitle ? <Text style={{ marginTop: 4, color: theme.shop, fontSize: 12 }}>{subtitle}</Text> : null}
                </View>
              </View>
            ) : template === 'tag' ? (
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {displayText.split('').map((ch, i) => (
                    <Text key={i} style={{ color: palette.colors[i % palette.colors.length], fontSize: shopFontSize * 0.5, fontWeight: '900', marginRight: 1 }}>{ch}</Text>
                  ))}
                </View>
                {subtitle ? <Text style={{ marginTop: 4, color: theme.shop, fontSize: 12 }}>{subtitle}</Text> : null}
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {displayText.split('').map((ch, i) => (
                    <Text key={i} style={{ color: palette.colors[i % palette.colors.length], fontSize: shopFontSize * 0.5, fontWeight: '900', marginRight: 1 }}>{ch}</Text>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.mobileWrap}>
              <View style={styles.mobileBadge}>
                <Text style={styles.mobileIcon}>📱</Text>
                <Text style={styles.mobileText}>{mobileNumber}</Text>
              </View>
            </View>
          </View>
        </View>
      </ViewShot>

      <TouchableOpacity
        style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
        disabled={isSaving}
        onPress={saveBanner}
      >
        {isSaving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.saveButtonText}>Save Banner</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    paddingTop: 18,
    textAlign: 'center',
    color: COLORS.text,
  },
  input: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    color: COLORS.text,
  },
  label: {
    marginLeft: 16,
    marginTop: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  templateRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  btn: {
    marginRight: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: COLORS.surface,
  },
  btnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  btnText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  btnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  horizontalList: {
    marginTop: 8,
  },
  themeCard: {
    marginLeft: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    width: 120,
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
  },
  paletteCard: {
    marginLeft: 12,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    width: 180,
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
  },
  previewWrap: {
    marginTop: 18,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 8,
  },
  previewInner: {
    minHeight: 180,
    borderRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoPlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mobileWrap: {
    position: 'absolute',
    left: 12,
    bottom: 10,
  },
  mobileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffffdd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.6,
  },
  mobileIcon: {
    marginRight: 6,
    fontSize: 12,
  },
  mobileText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    marginTop: SPACING.lg,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
});
