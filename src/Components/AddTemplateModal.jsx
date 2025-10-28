import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import TemplatePositioner from './TemplatePositioner';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, TYPOGRAPHY, SPACING, responsiveSize } from '../theme';
import ImagePickerService from '../services/ImagePickerService';
import TemplatePreferences from '../services/TemplatePreferences';
import {
  selectCategories,
  addCategory
} from '../store/slices/categorySlice';
import {
  uploadTemplate,
  selectUploadLoading,
  selectUploadError,
  clearError
} from '../store/slices/cloudinaryTemplateSlice';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AddTemplateModal = ({ visible, onClose, onSelectCategory }) => {
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);
  const uploadLoading = useSelector(selectUploadLoading);
  const uploadError = useSelector(selectUploadError);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const [isSelectingImage, setIsSelectingImage] = React.useState(false);
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = React.useState('');
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);

  // Main/Sub category inputs for upload
  const RELIGIONS = ['hindu','muslim','christian'];
  const [uploadReligion, setUploadReligion] = React.useState(RELIGIONS[0]);
  const [uploadSubcategory, setUploadSubcategory] = React.useState(null);
  const [showReligionDropdown, setShowReligionDropdown] = React.useState(false);

  React.useEffect(() => { (async () => {
    try {
      const [r,s] = await Promise.all([TemplatePreferences.getReligion(), TemplatePreferences.getSubcategory()]);
      if (r && RELIGIONS.includes(r)) setUploadReligion(r);
      if (s) setUploadSubcategory(s);
    } catch {}
  })(); }, []);

  // New: positioning step state
  const [isPositioning, setIsPositioning] = React.useState(false);
  const [pendingImageUri, setPendingImageUri] = React.useState(null);
  const [pendingCategory, setPendingCategory] = React.useState(null);
  const [currentAxis, setCurrentAxis] = React.useState({ x: 0, y: 0 });
  const [isUploadingTemplate, setIsUploadingTemplate] = React.useState(false);

  // Ratio selection state
  const [showRatioSelector, setShowRatioSelector] = React.useState(false);
  const [pendingCategoryKey, setPendingCategoryKey] = React.useState(null);
  const [selectedRatio, setSelectedRatio] = React.useState('9:16'); // default portrait
  const RATIO_OPTIONS = [
    { key: '1:1', label: '1:1' },
    { key: '3:4', label: '3:4' },
    { key: '4:3', label: '4:3' },
    { key: '9:16', label: '9:16' },
  ];

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

const handleCategorySelect = async (category) => {
    // Directly proceed with default 9:16 ratio (no ratio selector)
    await proceedWithUpload(category, '9:16');
  };

  const proceedWithUpload = async (categoryKey, ratioKey) => {
    try {
      setIsSelectingImage(true);
      // Pick image from gallery
      const imageData = await ImagePickerService.pickImageForTemplate(categoryKey);
      
      if (imageData) {
        // Validate the selected image
        const validation = ImagePickerService.validateImageForTemplate(imageData);
        if (!validation.isValid) {
          Alert.alert('Invalid Image', validation.error, [{ text: 'OK' }]);
          return;
        }
        // New behavior: show positioning step before uploading
        setPendingImageUri(imageData.uri);
        setPendingCategory(categoryKey);
        setIsPositioning(true);
      } else {
        console.log('No image selected, keeping modal open');
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error','Failed to select image. Please try again.',[{ text: 'OK' }]);
    } finally {
      setIsSelectingImage(false);
      setShowRatioSelector(false);
      setPendingCategoryKey(null);
    }
  };

  // Finalize upload after positioning
  const handleConfirmPosition = async (axes) => {
    try {
      setIsUploadingTemplate(true);
      setCurrentAxis(axes?.photo_axis || axes);
      console.log('📍 Confirmed axes:', axes);
      const TemplateService = (await import('../services/TemplateService')).default;
      const result = await TemplateService.uploadTemplate(
        pendingImageUri,
        pendingCategory,
        {
          ...(axes?.photo_axis ? { photo_container_axis: axes.photo_axis } : {}),
          ...(axes?.text_axis ? { text_container_axis: axes.text_axis } : {}),
          religion: uploadReligion,
          // Use the category the user just selected as the subcategory for this upload
          subcategory: pendingCategory,
        }
      );

      Alert.alert(
        'Success! 🎉',
        `Your template has been uploaded successfully!\n\nCategory: ${result.category}\nSerial: ${result.serial_no}`,
        [{ text: 'OK' }]
      );
      if (onSelectCategory) {
        onSelectCategory(pendingCategory, { uri: pendingImageUri });
      }
      onClose();
    } catch (uploadError) {
      console.error('Error uploading template with axis:', uploadError);
      Alert.alert(
        'Upload Failed',
        uploadError.message || 'Failed to upload template. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploadingTemplate(false);
      setIsPositioning(false);
      setPendingImageUri(null);
      setPendingCategory(null);
    }
  };

  const handleAddNewCategory = () => {
    setShowAddCategory(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    if (!newCategoryEmoji.trim()) {
      Alert.alert('Error', 'Please enter an emoji for the subcategory');
      return;
    }
    try {
      setIsCreatingCategory(true);
      
      // Create the new category key from name (lowercase, no spaces)
      const categoryKey = newCategoryName.toLowerCase().replace(/\s+/g, '');
      
      const newCategory = {
        key: categoryKey,
        label: newCategoryName.trim(),
        icon: newCategoryEmoji.trim(),
      };
      
      console.log('📂 AddTemplateModal: Creating new category:', newCategory);
      const result = await dispatch(addCategory(newCategory));
      
      if (result.success) {
        Alert.alert(
          'Category Created! 🎉',
          `New subcategory "${newCategoryEmoji} ${newCategoryName}" has been created successfully!`,
          [{ text: 'OK', onPress: () => {
            setShowAddCategory(false);
            setNewCategoryName('');
            setNewCategoryEmoji('');
            console.log('📂 New subcategory created and modal reset');
          }}]
        );
      } else {
        throw new Error(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('❌ AddTemplateModal: Error creating category:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create category. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCancelAddCategory = () => {
    setShowAddCategory(false);
    setNewCategoryName('');
    setNewCategoryEmoji('');
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.modalContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim,
                }
              ]}
            >
              <View style={styles.modalContent}>
                {/* Close Icon - Top Right */}
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={showAddCategory ? handleCancelAddCategory : onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
                
                {!showAddCategory && !showRatioSelector && !isPositioning ? (
                  // Main category selection view
                  <>
                    <Text style={styles.title}>Add New Template</Text>
                    <Text style={styles.subtitle}>Choose a category for your new template:</Text>

                    {/* Main and Sub category selectors */}
                    <View style={styles.prefRow}> 
                      {/* Religion selector */}
                      <View style={styles.prefCol}>
                        <Text style={styles.inputLabel}>Religion</Text>
                        <TouchableOpacity style={styles.selector} onPress={() => setShowReligionDropdown(v=>!v)} activeOpacity={0.8}>
                          <Text style={styles.selectorValue}>{uploadReligion}</Text>
                          <Text style={styles.selectorCaret}>▾</Text>
                        </TouchableOpacity>
                        {showReligionDropdown && (
                          <View style={styles.selectorDropdown}>
                            {RELIGIONS.map(r => (
                              <TouchableOpacity key={r} style={styles.selectorItem} onPress={async ()=>{
                                setUploadReligion(r); setShowReligionDropdown(false); await TemplatePreferences.setReligion(r);
                              }}>
                                <Text style={styles.selectorItemText}>{r}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.buttonsContainer}>
                      {categories.map((category, index) => {
                        return (
                          <TouchableOpacity
                            key={category.key}
                            style={[
                              styles.categoryButton,
                              (isSelectingImage || uploadLoading) && styles.disabledButton
                            ]}
                            onPress={() => handleCategorySelect(category.key)}
                            activeOpacity={(isSelectingImage || uploadLoading) ? 1 : 0.8}
                            disabled={isSelectingImage || uploadLoading}
                          >
                            {(isSelectingImage || uploadLoading) ? (
                              <ActivityIndicator color={COLORS.primary} size="small" />
                            ) : (
                              <Text style={styles.categoryButtonText}>{category.icon} {category.label}</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                      
                      {/* Add New Category Button */}
                      <TouchableOpacity
                        style={[styles.categoryButton, styles.addCategoryButton, isSelectingImage && styles.disabledButton]}
                        onPress={handleAddNewCategory}
                        activeOpacity={isSelectingImage ? 1 : 0.8}
                        disabled={isSelectingImage}
                      >
                        <Text style={styles.addCategoryButtonText}>+ Add a new category</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {isSelectingImage && (
                      <Text style={styles.loadingText}>Opening gallery...</Text>
                    )}
                    
                    {uploadLoading && (
                      <Text style={styles.loadingText}>Uploading template to cloud...</Text>
                    )}
                  </>
                ) : showRatioSelector ? (
                  // Ratio selection view
                  <>
                    <Text style={styles.title}>Select Aspect Ratio</Text>
                    <Text style={styles.subtitle}>Choose the ratio for the image container. This will be used as a subfolder in the category.</Text>
                    <View style={styles.ratioGrid}>
                      {RATIO_OPTIONS.map(r => (
                        <TouchableOpacity
                          key={r.key}
                          style={[styles.ratioButton, selectedRatio === r.key && styles.ratioButtonSelected]}
                          onPress={() => setSelectedRatio(r.key)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.ratioButtonText, selectedRatio === r.key && styles.ratioButtonTextSelected]}>{r.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.ratioActions}>
                      <TouchableOpacity style={styles.ratioCancel} onPress={() => { setShowRatioSelector(false); setPendingCategoryKey(null); }}>
                        <Text style={styles.ratioCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.ratioConfirm, (isSelectingImage || uploadLoading) && styles.disabledButton]}
                        onPress={() => proceedWithUpload(pendingCategoryKey, selectedRatio)}
                        disabled={isSelectingImage || uploadLoading}
                        activeOpacity={0.8}
                      >
                        {isSelectingImage || uploadLoading ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <Text style={styles.ratioConfirmText}>Continue</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : isPositioning ? (
                  // Positioning view (wrap with GestureHandlerRootView to enable gestures inside Modal)
                  <GestureHandlerRootView style={{ width: '100%' }}>
                    <TemplatePositioner
                      imageUri={pendingImageUri}
                      onCancel={() => { setIsPositioning(false); setPendingImageUri(null); setPendingCategory(null); }}
                      onConfirm={handleConfirmPosition}
                      isUploading={isUploadingTemplate}
                    />
                  </GestureHandlerRootView>
                ) : (
                  // Add new category view
                  <>
                    <Text style={styles.title}>Add Subcategory</Text>
                    <Text style={styles.subtitle}>Create a subcategory for your templates:</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Subcategory Name:</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., Anniversary, Wedding"
                        value={newCategoryName}
                        onChangeText={setNewCategoryName}
                        placeholderTextColor={COLORS.gray}
                        maxLength={20}
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Emoji:</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 💖"
                        value={newCategoryEmoji}
                        onChangeText={setNewCategoryEmoji}
                        placeholderTextColor={COLORS.gray}
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.createButtonContainer}>
                      <TouchableOpacity 
                        style={[styles.createButton, isCreatingCategory && styles.disabledButton]} 
                        onPress={handleCreateCategory}
                        disabled={isCreatingCategory}
                      >
                        {isCreatingCategory ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <Text style={styles.createButtonText}>Create Subcategory</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default AddTemplateModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.85,
    maxWidth: responsiveSize(400),
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius * 2,
    padding: 0,
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalContent: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  categoryButton: {
    width: '100%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.borderRadius,
    marginBottom: SPACING.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)', // Light primary color border
  },
  categoryButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text, // Black text color
    fontWeight: '600',
    textAlign: 'center',
  },
  // Close Button Styles
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(0, 0, 0, 0.7)',
  },
  disabledButton: {
    opacity: 0.6,
  },
  ratioGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  ratioButton: {
    width: '48%',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: SPACING.borderRadius,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
    alignItems: 'center',
  },
  ratioButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ratioButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    fontWeight: '600',
  },
  ratioButtonTextSelected: {
    color: COLORS.white,
  },
  ratioActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  ratioCancel: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.borderRadius,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratioCancelText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
    fontWeight: '600',
  },
  ratioConfirm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.borderRadius,
    backgroundColor: COLORS.primary,
  },
  ratioConfirmText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.white,
    fontWeight: '700',
  },
  disabledText: {
    color: COLORS.gray,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  // Add New Category Button Styles
  addCategoryButton: {
    backgroundColor: COLORS.primary, // Primary color background
    borderStyle: 'dashed', // Keep dashed border for distinction
    borderColor: COLORS.primary, // Solid primary color for the dashed border
  },
  addCategoryButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.white, // White text for contrast on purple background
    fontWeight: '600',
    textAlign: 'center',
  },
  // Add Category Form Styles
  inputContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  textInput: {
    width: '100%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SPACING.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  createButtonContainer: {
    width: '100%',
    marginTop: SPACING.md,
  },
  createButton: {
    width: '100%',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.borderRadius,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  createButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  // new selectors
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  prefCol: { flex: 1, marginHorizontal: 4 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1f1f1f', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  selectorValue: { color: COLORS.white, ...TYPOGRAPHY.bodySmall },
  selectorCaret: { color: COLORS.white, marginLeft: 8 },
  selectorDropdown: { backgroundColor: '#1f1f1f', borderRadius: 8, marginTop: 6 },
  selectorItem: { paddingHorizontal: 12, paddingVertical: 10 },
  selectorItemText: { color: COLORS.white, ...TYPOGRAPHY.bodySmall },
  placeholderBox: { backgroundColor: COLORS.backgroundLight, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  placeholderText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall },
});
