import AsyncStorage from '@react-native-async-storage/async-storage';

// Service for managing locally downloaded templates
class LocalTemplateService {
  constructor() {
    this.storageKey = '@narayana_downloaded_templates';
  }

  /**
   * Get all downloaded templates from local storage
   */
  async getDownloadedTemplates() {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return data.templates || [];
      }
      return [];
    } catch (error) {
      console.error('Error loading downloaded templates:', error);
      return [];
    }
  }

  /**
   * Get downloaded templates by category
   */
  async getDownloadedTemplatesByCategory(category) {
    try {
      const allTemplates = await this.getDownloadedTemplates();
      return allTemplates.filter(template => 
        template.category === category || 
        template.public_id?.includes(category)
      );
    } catch (error) {
      console.error('Error loading downloaded templates by category:', error);
      return [];
    }
  }

  /**
   * Save a template to local storage
   */
  async saveTemplate(templateData) {
    try {
      const existingTemplates = await this.getDownloadedTemplates();
      
      // Check if template already exists
      const existingIndex = existingTemplates.findIndex(
        t => t.id === templateData.id || t.public_id === templateData.public_id
      );

      const templateToSave = {
        ...templateData,
        downloadedAt: new Date().toISOString(),
        localId: templateData.id || `local_${Date.now()}`
      };

      if (existingIndex >= 0) {
        // Update existing template
        existingTemplates[existingIndex] = templateToSave;
      } else {
        // Add new template
        existingTemplates.push(templateToSave);
      }

      await AsyncStorage.setItem(this.storageKey, JSON.stringify({
        templates: existingTemplates,
        lastUpdated: new Date().toISOString()
      }));

      console.log('✅ Template saved to local storage:', templateData.name);
      return templateToSave;
    } catch (error) {
      console.error('Error saving template to local storage:', error);
      throw error;
    }
  }

  /**
   * Remove a template from local storage
   */
  async removeTemplate(templateId) {
    try {
      const existingTemplates = await this.getDownloadedTemplates();
      const filteredTemplates = existingTemplates.filter(
        t => t.id !== templateId && t.localId !== templateId && t.public_id !== templateId
      );

      await AsyncStorage.setItem(this.storageKey, JSON.stringify({
        templates: filteredTemplates,
        lastUpdated: new Date().toISOString()
      }));

      console.log('🗑️ Template removed from local storage:', templateId);
      return true;
    } catch (error) {
      console.error('Error removing template from local storage:', error);
      throw error;
    }
  }

  /**
   * Check if a template is downloaded
   */
  async isTemplateDownloaded(templateId) {
    try {
      const templates = await this.getDownloadedTemplates();
      return templates.some(
        t => t.id === templateId || t.localId === templateId || t.public_id === templateId
      );
    } catch (error) {
      console.error('Error checking if template is downloaded:', error);
      return false;
    }
  }

  /**
   * Get download statistics
   */
  async getDownloadStats() {
    try {
      const templates = await this.getDownloadedTemplates();
      const stats = {
        total: templates.length,
        byCategory: {}
      };

      templates.forEach(template => {
        const category = template.category || 'unknown';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting download stats:', error);
      return { total: 0, byCategory: {} };
    }
  }

  /**
   * Clear all downloaded templates
   */
  async clearAllDownloadedTemplates() {
    try {
      await AsyncStorage.removeItem(this.storageKey);
      console.log('🗑️ All downloaded templates cleared');
      return true;
    } catch (error) {
      console.error('Error clearing downloaded templates:', error);
      throw error;
    }
  }

  /**
   * Export downloaded templates data
   */
  async exportDownloadedTemplates() {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : { templates: [], lastUpdated: null };
    } catch (error) {
      console.error('Error exporting downloaded templates:', error);
      throw error;
    }
  }

  /**
   * Import downloaded templates data
   */
  async importDownloadedTemplates(data) {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(data));
      console.log('📥 Downloaded templates imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing downloaded templates:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const localTemplateService = new LocalTemplateService();
export default localTemplateService;