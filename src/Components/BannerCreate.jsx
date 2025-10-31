import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ViewShot from 'react-native-view-shot';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { cropResultManager } from '../utils/CropResultManager';
import BannerStorageService from '../services/BannerStorageService';

const { width: screenWidth } = Dimensions.get('window');

export default function BannerCreate({ navigation }) {
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [theme, setTheme] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const viewShotRef = useRef(null);

  const themes = useMemo(() => ([
    { name: 'Ivory & Brown', bg: '#fffaf3', shop: '#92400e', addr: '#4b5563', top: '#78350f', font: 'serif' },
    { name: 'Cream & Indigo', bg: '#fffaf3', shop: '#3b0764', addr: '#4338ca', top: '#1e1b4b', font: 'sans-serif' },
    { name: 'Peach & Maroon', bg: '#fffaf3', shop: '#7f1d1d', addr: '#9b2c2c', top: '#450a0a', font: 'serif' },
    { name: 'Mint & Teal', bg: '#fffaf3', shop: '#115e59', addr: '#0f766e', top: '#134e4a', font: 'sans-serif' },
    { name: 'Lavender & Violet', bg: '#fffaf3', shop: '#6b21a8', addr: '#7e22ce', top: '#581c87', font: 'cursive' },
    { name: 'Sky & Navy', bg: '#fffaf3', shop: '#1e3a8a', addr: '#1d4ed8', top: '#1e40af', font: 'sans-serif' },
    { name: 'Beige & Coffee', bg: '#fffaf3', shop: '#5c4033', addr: '#654321', top: '#3e2723', font: 'serif' },
    { name: 'Powder Blue & Midnight', bg: '#fffaf3', shop: '#0f172a', addr: '#1e293b', top: '#0a0a23', font: 'monospace' },
    { name: 'Blush & Burgundy', bg: '#fffaf3', shop: '#800020', addr: '#991b1b', top: '#450a0a', font: 'cursive' },
    { name: 'Pearl & Olive', bg: '#fffaf3', shop: '#3f6212', addr: '#4d7c0f', top: '#365314', font: 'sans-serif' },
    { name: 'Honey & Walnut', bg: '#fffaf3', shop: '#5c3317', addr: '#7c2d12', top: '#431407', font: 'serif' },
    { name: 'Mist & Steel', bg: '#fffaf3', shop: '#334155', addr: '#1e293b', top: '#0f172a', font: 'monospace' },
    { name: 'Lilac & Plum', bg: '#fffaf3', shop: '#4c1d95', addr: '#6d28d9', top: '#3b0764', font: 'serif' },
    { name: 'Rose & Chestnut', bg: '#fffaf3', shop: '#7f1d1d', addr: '#9f1239', top: '#450a0a', font: 'cursive' },
    { name: 'Aqua & Navy', bg: '#fffaf3', shop: '#082f49', addr: '#0c4a6e', top: '#172554', font: 'sans-serif' },
    { name: 'Sand & Rust', bg: '#fffaf3', shop: '#78350f', addr: '#92400e', top: '#451a03', font: 'serif' },
    { name: 'Butter & Emerald', bg: '#fffaf3', shop: '#065f46', addr: '#047857', top: '#064e3b', font: 'sans-serif' },
    { name: 'Coral & Charcoal', bg: '#fffaf3', shop: '#292524', addr: '#44403c', top: '#1c1917', font: 'monospace' },
    { name: 'Snow & Sapphire', bg: '#fffaf3', shop: '#1e40af', addr: '#F5E427', top: '#172554', font: 'sans-serif' },
    { name: 'Lemon & Forest', bg: '#fffaf3', shop: '#14532d', addr: '#166534', top: '#052e16', font: 'serif' },
  ]), []);

  const saveBanner = async () => {
    try {
      setIsSaving(true);
      if (!theme) return; // need a theme selected to capture proper preview
      const uri = await viewShotRef.current?.capture({ format: 'png', quality: 1, result: 'tmpfile' });
      if (!uri) return;
      await BannerStorageService.saveBanner(uri);
      const finalUri = uri.includes('?') ? `${uri}&t=${Date.now()}` : `${uri}?t=${Date.now()}`;
      try { cropResultManager.setCropResult(finalUri, 'banner'); } catch {}
      navigation.goBack();
    } finally {
      setIsSaving(false);
    }
  };

  const bannerWidth = Math.min(screenWidth - 40, 720);
  const baseW = 720;
  const scale = Math.min(1, bannerWidth / baseW);
  // Base sizes
  const shopBase = Math.round(48 * scale);
  const addrBase = Math.round(22 * scale);
  const ownerBase = Math.round(14 * scale);
  const phoneBase = Math.round(13 * scale);
  // Apply requested reductions: shop -20%, details -50%
  const sizes = {
    shop: Math.max(20, Math.round(shopBase * 0.8)),
    addr: Math.max(10, Math.round(addrBase * 0.5)),
    owner: Math.max(10, Math.round(ownerBase * 0.5)),
    phone: Math.max(10, Math.round(phoneBase * 0.5)),
    pad: Math.max(12, Math.round(25 * scale)),
  };
  const previewTheme = theme || themes[0];

  return (
    <View style={styles.root}>
      <View style={styles.stickyHeader}>
        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <View style={[styles.banner, { width: bannerWidth, aspectRatio: 5, backgroundColor: previewTheme.bg, borderColor: previewTheme.shop, paddingTop: sizes.pad, paddingHorizontal: sizes.pad, paddingBottom: 4 }]} collapsable={false}>
              <View style={styles.topRight}>
                <Text style={[styles.owner, { color: previewTheme.top, fontFamily: previewTheme.font, fontSize: sizes.owner }]} numberOfLines={1}>{ownerName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Ionicons name="call-outline" size={Math.max(10, Math.round((14 * scale) * 0.5))} color={previewTheme.top} style={{ marginRight: 4 }} />
                  <Text style={[styles.phone, { color: previewTheme.top, fontFamily: previewTheme.font, fontSize: sizes.phone }]} numberOfLines={1}>{phone}</Text>
                </View>
              </View>
              <View style={styles.bottomContent}>
                <Text style={[styles.shopName, { color: previewTheme.shop, fontFamily: previewTheme.font, fontSize: sizes.shop }]} numberOfLines={1} adjustsFontSizeToFit ellipsizeMode="tail">{shopName || 'Your Shop Name'}</Text>
                <Text style={[styles.address, { color: previewTheme.addr, fontFamily: previewTheme.font, fontSize: sizes.addr, marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit ellipsizeMode="tail">{address || 'Your Address'}</Text>
              </View>
            </View>
          </ViewShot>
        </View>
      </View>

      <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}>
        <Text style={styles.sectionTitle}>Details</Text>

        <Text style={styles.hint}>shop/company name</Text>
        <TextInput
          placeholder="shop/company name"
          value={shopName}
          onChangeText={setShopName}
          style={styles.input}
          accessibilityLabel="shop/company name"
        />

        <Text style={styles.hint}>address</Text>
        <TextInput
          placeholder="address"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          accessibilityLabel="address"
        />

        <Text style={styles.hint}>your name</Text>
        <TextInput
          placeholder="your name"
          value={ownerName}
          onChangeText={setOwnerName}
          style={styles.input}
          accessibilityLabel="your name"
        />

        <Text style={styles.hint}>ph no</Text>
        <TextInput
          placeholder="ph no"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
          accessibilityLabel="phone number"
        />

        <Text style={styles.subheading}>🎨 Choose a Color Theme</Text>
        <View style={styles.themeContainer}>
          {themes.map((t, i) => (
            <TouchableOpacity
              key={String(i)}
              style={[styles.themeButton, { backgroundColor: t.bg }, theme?.name === t.name && styles.themeButtonSelected]}
              onPress={() => setTheme(t)}
              activeOpacity={0.85}
            >
              <Text style={[styles.themeText, { color: t.shop }]} numberOfLines={1}>
                {t.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.saveButton, (!theme || isSaving) && { opacity: 0.6 }]} disabled={!theme || isSaving} onPress={saveBanner}>
          {isSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>Save Banner</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { backgroundColor: '#f3f4f6', padding: 20 },
  formScroll: { flex: 1, paddingTop: 12 },
  heading: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 4 },
  subheading: { fontSize: 20, fontWeight: '600', marginVertical: 10 },
  themeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  themeButton: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, width: '48%', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  themeButtonSelected: { borderColor: COLORS.accent, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  themeText: { fontSize: 15, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 8, color: '#111827' },
  stickyHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  previewCard: { alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff' },
  bannerWrapper: { alignItems: 'center', justifyContent: 'center', marginTop: 16, borderWidth: 0 },
  banner: { padding: 25, position: 'relative', alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1 },
  shopName: { fontSize: 48, fontWeight: '800', textAlign: 'center' },
  address: { fontSize: 28, marginTop: 2, textAlign: 'center' },
  topRight: { position: 'absolute', top: 2, right: 10, alignItems: 'flex-end' },
  owner: { fontSize: 14, fontWeight: '600' },
  phone: { fontSize: 13 },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  bottomContent: { position: 'absolute', left: 10, right: 10, bottom: 4, alignItems: 'center' },
  saveButton: { backgroundColor: COLORS.accent, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: 8, marginTop: SPACING.lg, alignSelf: 'center' },
  saveButtonText: { ...TYPOGRAPHY.button, color: COLORS.white },
});
