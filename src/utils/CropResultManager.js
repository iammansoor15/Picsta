// Simple event-based crop result manager
// Allows Crop screen to send results back without relying on route params

const listeners = new Set();

export const cropResultManager = {
  setCropResult: (croppedUri, photoNumber = null, photoId = null, isDynamicPhoto = false) => {
    const payload = { croppedUri, photoNumber, photoId, isDynamicPhoto };
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
      return () => listeners.delete(fn);
    }
    return () => {};
  },
  clear: () => listeners.clear(),
};