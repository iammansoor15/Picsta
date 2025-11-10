import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const STORAGE_KEY = '@user_templates';
const TEMPLATES_DIR = `${RNFS.DocumentDirectoryPath}/user_templates`;

const normalizeInPath = (u) => {
  if (!u) return '';
  let s = String(u).replace(/^"|"$/g, '');
  // strip file:// for filesystem ops
  if (s.startsWith('file://')) s = s.replace(/^file:\/\//, '');
  return s;
};

const toFileUri = (p) => (p && !String(p).startsWith('file://')) ? `file://${p}` : p;

class UserTemplatesService {
  /**
   * Save a new user template
   * Persists the image into app documents so it won't disappear (cache files are ephemeral)
   * @param {string} uri - The image URI of the cropped template
   * @returns {Promise<Object>} The saved template object
   */
  async saveTemplate(uri) {
    try {
      const templates = await this.getAllTemplates();

      // Ensure persistent dir exists
      try { await RNFS.mkdir(TEMPLATES_DIR); } catch {}

      // Prepare destination path
      const srcPath = normalizeInPath(uri);
      const extMatch = srcPath.match(/\.(png|jpg|jpeg|webp)$/i);
      const ext = (extMatch && extMatch[1]) ? extMatch[1].toLowerCase() : 'jpg';
      const destPath = `${TEMPLATES_DIR}/template_${Date.now()}.${ext}`;

      // Copy into persistent storage (fallback to move if copy fails)
      try {
        await RNFS.copyFile(srcPath, destPath);
      } catch (copyErr) {
        try { await RNFS.moveFile(srcPath, destPath); } catch (moveErr) { throw copyErr; }
      }

      const persistedUri = toFileUri(destPath);

      const newTemplate = {
        id: Date.now().toString(),
        uri: persistedUri,
        createdAt: new Date().toISOString(),
      };

      templates.push(newTemplate);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(templates));

      console.log('✅ Template saved successfully:', newTemplate.id);
      return newTemplate;
    } catch (error) {
      console.error('❌ Failed to save template:', error);
      throw error;
    }
  }

  /**
   * Get all user templates (auto-clean missing files)
   * @returns {Promise<Array>} Array of template objects
   */
  async getAllTemplates() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      let templates = JSON.parse(stored) || [];

      // Filter out missing files to avoid ENOENT
      const checks = await Promise.all(
        templates.map(async (t) => {
          try {
            const path = normalizeInPath(t?.uri || t?.image_url || t?.url);
            if (!path) return null;
            const exists = await RNFS.exists(path);
            return exists ? t : null;
          } catch {
            return null;
          }
        })
      );
      const filtered = checks.filter(Boolean);
      if (filtered.length !== templates.length) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }

      // Sort by createdAt descending (newest first)
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return filtered;
    } catch (error) {
      console.error('❌ Failed to get templates:', error);
      return [];
    }
  }

  /**
   * Delete a template by ID (also removes file)
   */
  async deleteTemplate(templateId) {
    try {
      const templates = await this.getAllTemplates();
      const target = templates.find(t => t.id === templateId);

      const filtered = templates.filter(t => t.id !== templateId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      // Try to delete file on disk
      try {
        const path = normalizeInPath(target?.uri || target?.image_url || target?.url);
        if (path && await RNFS.exists(path)) {
          await RNFS.unlink(path);
        }
      } catch {}

      console.log('✅ Template deleted successfully:', templateId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete template:', error);
      return false;
    }
  }

  /**
   * Clear all user templates (and files)
   */
  async clearAllTemplates() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      try {
        const exists = await RNFS.exists(TEMPLATES_DIR);
        if (exists) await RNFS.unlink(TEMPLATES_DIR);
      } catch {}
      console.log('✅ All templates cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear templates:', error);
      return false;
    }
  }
}

export default new UserTemplatesService();
