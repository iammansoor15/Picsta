import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, TextInput, ActivityIndicator, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { cropResultManager } from '../utils/CropResultManager';
import BannerStorageService from '../services/BannerStorageService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const parseRatio = (r) => {
  if (!r) return 5;
  if (typeof r === 'number') return r > 0 ? r : 5;
  if (typeof r === 'string') {
    const parts = r.split(':');
    const w = Number(parts[0]);
    const h = parts[1] ? Number(parts[1]) : 1;
    if (Number.isFinite(w) && Number.isFinite(h) && h > 0) return w / h;
  }
  return 5;
};

const BannerCreate = ({ route, navigation }) => {
  const { ratio } = route.params || {};
  const ratioWH = parseRatio(ratio);
  const cropWidth = Math.min(screenWidth * 0.95, screenWidth);
  const cropHeight = Math.min(screenHeight * 0.6, Math.round(cropWidth / ratioWH));

  const viewShotRef = useRef();
  const [companyName, setCompanyName] = useState('CodeBinaryCreations');
  const [address, setAddress] = useState('Santhapet Nellore');
  const [name, setName] = useState('Aashish Vitta');
  const [phoneNumber, setPhoneNumber] = useState('8247714545');
  const [bgColor, setBgColor] = useState('#5B9BD5');
  const [isSaving, setIsSaving] = useState(false);
  const [activeField, setActiveField] = useState('companyName');
  const [companyNameFont, setCompanyNameFont] = useState('BungeeShade-Regular');
  const [addressFont, setAddressFont] = useState('LondrinaSolid-Regular');
  const [nameFont, setNameFont] = useState('LondrinaSolid-Regular');
  const [phoneNumberFont, setPhoneNumberFont] = useState('LondrinaSolid-Regular');

  const fonts = [
    'BungeeShade-Regular',
    'LondrinaSolid-Regular',
    'LondrinaSketch-Regular',
    'KumarOneOutline-Regular',
    'MontserratAlternates-Regular',
    'Pacifico-Regular'
  ];

  const getCurrentFont = () => {
    switch (activeField) {
      case 'companyName': return companyNameFont;
      case 'address': return addressFont;
      case 'name': return nameFont;
      case 'phoneNumber': return phoneNumberFont;
      default: return 'Londrina';
    }
  };

  const setCurrentFont = (font) => {
    switch (activeField) {
      case 'companyName': setCompanyNameFont(font); break;
      case 'address': setAddressFont(font); break;
      case 'name': setNameFont(font); break;
      case 'phoneNumber': setPhoneNumberFont(font); break;
    }
  };

  const saveBanner = async () => {
    try {
      setIsSaving(true);
      const uri = await viewShotRef.current.capture({ format: 'png', quality: 1, result: 'tmpfile' });
      
      // Save banner to storage
      await BannerStorageService.saveBanner(uri);
      
      const cacheSuffix = `t=${Date.now()}`;
      const finalUri = uri.includes('?') ? `${uri}&${cacheSuffix}` : `${uri}?${cacheSuffix}`;
      try { cropResultManager.setCropResult(finalUri, 'banner'); } catch {}
      navigation.goBack();
    } catch (e) {
      // Ignore for now
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Simple header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Banner</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Banner Preview</Text>
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1 }}>
          <View style={[styles.bannerArea, { width: cropWidth, height: cropHeight, backgroundColor: bgColor }]}
                collapsable={false}>
            {/* Company name - center */}
            <Text style={[styles.companyNameText, { color: '#FFFFFF', fontFamily: companyNameFont, fontWeight: 'normal' }]} numberOfLines={1}>
              {companyName}
            </Text>
            {/* Address - center below company */}
            <Text style={[styles.addressText, { color: '#FFFFFF', fontFamily: addressFont, fontWeight: 'normal' }]} numberOfLines={1}>
              {address}
            </Text>
            {/* Name and phone - top right */}
            <View style={styles.topRightInfo}>
              <Text style={[styles.nameText, { color: '#FFFFFF', fontFamily: nameFont, fontWeight: 'normal' }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.phoneText, { color: '#FFFFFF', fontFamily: phoneNumberFont, fontWeight: 'normal' }]} numberOfLines={1}>
                {phoneNumber}
              </Text>
            </View>
          </View>
        </ViewShot>

        <View style={[styles.controls, { width: cropWidth }] }>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            onFocus={() => setActiveField('companyName')}
            placeholder="Company Name"
            placeholderTextColor={COLORS.textSecondary}
            style={[styles.input, activeField === 'companyName' && styles.inputActive]}
          />
          <TextInput
            value={address}
            onChangeText={setAddress}
            onFocus={() => setActiveField('address')}
            placeholder="Address"
            placeholderTextColor={COLORS.textSecondary}
            style={[styles.input, activeField === 'address' && styles.inputActive]}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            onFocus={() => setActiveField('name')}
            placeholder="Your Name"
            placeholderTextColor={COLORS.textSecondary}
            style={[styles.input, activeField === 'name' && styles.inputActive]}
          />
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            onFocus={() => setActiveField('phoneNumber')}
            placeholder="Phone Number"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
            style={[styles.input, activeField === 'phoneNumber' && styles.inputActive]}
          />
          <Text style={styles.colorLabel}>Font Style (for {activeField === 'companyName' ? 'Company Name' : activeField === 'address' ? 'Address' : activeField === 'name' ? 'Name' : 'Phone Number'})</Text>
          <View style={styles.fontGrid}>
            {fonts.map((font) => (
              <TouchableOpacity
                key={font}
                style={[styles.fontButton, getCurrentFont() === font && styles.fontButtonActive]}
                onPress={() => setCurrentFont(font)}
              >
                <Text style={[styles.fontButtonText, { fontFamily: font }]} numberOfLines={1}>
                  {font.replace('-Regular', '').replace(/([A-Z])/g, ' $1').trim()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.colorLabel}>Banner Background Color</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.colorSwatch, { backgroundColor: '#5B9BD5' }]} onPress={() => setBgColor('#5B9BD5')} />
            <TouchableOpacity style={[styles.colorSwatch, { backgroundColor: '#FF6B6B' }]} onPress={() => setBgColor('#FF6B6B')} />
            <TouchableOpacity style={[styles.colorSwatch, { backgroundColor: '#4ECDC4' }]} onPress={() => setBgColor('#4ECDC4')} />
            <TouchableOpacity style={[styles.colorSwatch, { backgroundColor: '#FFD93D' }]} onPress={() => setBgColor('#FFD93D')} />
            <TouchableOpacity style={[styles.colorSwatch, { backgroundColor: '#A78BFA' }]} onPress={() => setBgColor('#A78BFA')} />
          </View>
        </View>

        <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.6 }]} onPress={saveBanner} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>Save Banner</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BannerCreate;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: COLORS.surface },
  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 18, color: COLORS.text },
  headerTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700', color: COLORS.text },
  content: { flex: 1, alignItems: 'center', paddingVertical: SPACING.xl },
  title: { ...TYPOGRAPHY.bodyMedium, color: COLORS.text, marginBottom: SPACING.md },
  bannerArea: { justifyContent: 'center', alignItems: 'center', borderRadius: 0, overflow: 'hidden', position: 'relative' },
  companyNameText: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  addressText: { fontSize: 9, fontWeight: '400', letterSpacing: 0.3, textAlign: 'center', marginTop: 1.4 },
  topRightInfo: { position: 'absolute', top: 8, right: 12 },
  nameText: { fontSize: 8, fontWeight: '600', textAlign: 'right' },
  phoneText: { fontSize: 8, fontWeight: '600', textAlign: 'right', marginTop: 2 },
  controls: { marginTop: SPACING.lg },
  input: { backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, marginBottom: SPACING.md },
  inputActive: { borderWidth: 2, borderColor: COLORS.accent },
  colorLabel: { ...TYPOGRAPHY.bodyMedium, color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  fontGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.md },
  fontButton: { backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: COLORS.lightGray },
  fontButtonActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight || '#E8F4F8' },
  fontButtonText: { fontSize: 12, color: COLORS.text },
  row: { flexDirection: 'row', marginBottom: SPACING.sm },
  colorSwatch: { width: 48, height: 48, borderRadius: 8, marginRight: 10, borderWidth: 2, borderColor: COLORS.lightGray },
  saveButton: { backgroundColor: COLORS.accent, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: 8, marginTop: SPACING.lg },
  saveButtonText: { ...TYPOGRAPHY.button, color: COLORS.white },
});
