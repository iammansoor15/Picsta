// Simple event-based crop result manager
// Allows Crop screen to send results back without relying on route params

const listeners = new Set();

// Track which screen initiated the last banner/crop action
let lastSourceScreen = null;

// Store the last banner URI for each screen type (persists across remounts)
const lastBannerByType = {
  localMode: null,
  normal: null,
};

export const cropResultManager = {
  setCropResult: (croppedUri, photoNumber = null, photoId = null, isDynamicPhoto = false, sourceScreen = null) => {
    const payload = { croppedUri, photoNumber, photoId, isDynamicPhoto, sourceScreen };
    console.log('📤 CropResultManager.setCropResult:', { photoNumber, sourceScreen, hasUri: !!croppedUri });

    // If this is a banner, store it for the target screen type so it persists across remounts
    if (photoNumber === 'banner' && croppedUri && sourceScreen) {
      lastBannerByType[sourceScreen] = croppedUri;
      console.log('💾 CropResultManager: Stored banner for', sourceScreen, ':', croppedUri?.substring(0, 50) + '...');
    }

    try {
      listeners.forEach((fn) => {
        try { fn(payload); } catch (e) { /* no-op */ }
      });
    } catch (e) {
      // no-op
    }
  },
  addListener: (fn) => {
    if (typeof fn === 'function') {
      listeners.add(fn);
      console.log('📥 CropResultManager: Listener added, total listeners:', listeners.size);
      return () => {
        listeners.delete(fn);
        console.log('📥 CropResultManager: Listener removed, total listeners:', listeners.size);
      };
    }
    return () => {};
  },
  clear: () => listeners.clear(),
  // Track source screen for banner/crop actions
  setSourceScreen: (screenName) => {
    console.log('🎯 CropResultManager.setSourceScreen:', screenName);
    lastSourceScreen = screenName;
  },
  getSourceScreen: () => lastSourceScreen,
  clearSourceScreen: () => {
    console.log('🧹 CropResultManager.clearSourceScreen');
    lastSourceScreen = null;
  },
  // Get stored banner for a screen type (for restoring after remount)
  getStoredBanner: (screenType) => {
    const banner = lastBannerByType[screenType];
    console.log('📦 CropResultManager.getStoredBanner for', screenType, ':', banner ? 'found' : 'none');
    return banner;
  },
  // Clear stored banner for a screen type
  clearStoredBanner: (screenType) => {
    console.log('🗑️ CropResultManager.clearStoredBanner for', screenType);
    lastBannerByType[screenType] = null;
  },
};