import AsyncStorage from '@react-native-async-storage/async-storage';

// Service for managing liked templates
class LikedTemplatesService {
  constructor() {
    this.storageKey = '@narayana_liked_templates';
  }

  /**
   * Get liked template references (lightweight) from local storage
   */
  async getLikedTemplateReferences() {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return data.templates || [];
      }
      return [];
    } catch (error) {
      console.error('Error loading liked template references:', error);
      return [];
    }
  }

  /**
   * Get all liked templates from local storage (alias for backward compatibility)
   */
  async getLikedTemplates() {
    return this.getLikedTemplateReferences();
  }

  /**
   * Get liked templates by category
   */
  async getLikedTemplatesByCategory(category) {
    try {
      const allTemplates = await this.getLikedTemplates();
      return allTemplates.filter(template => 
        template.category === category || 
        template.public_id?.includes(category)
      );
    } catch (error) {
      console.error('Error loading liked templates by category:', error);
      return [];
    }
  }

  /**
   * Add a template to liked templates (reference-based approach)
   */
  async likeTemplate(templateData) {
    try {
      const existingReferences = await this.getLikedTemplateReferences();
      
      const templateId = templateData.id || templateData.public_id;
      
      // Check if template already exists
      if (existingReferences.some(ref => ref.id === templateId || ref.public_id === templateData.public_id)) {
        console.log('Template already liked:', templateData.name);
        return templateData;
      }

      // Save only reference data, not full template
      const templateReference = {
        id: templateId,
        public_id: templateData.public_id,
        name: templateData.name,
        category: templateData.category || 'unknown',
        secure_url: templateData.secure_url,
        url: templateData.url,
        likedAt: new Date().toISOString(),
        localId: templateId || `liked_${Date.now()}`
      };

      existingReferences.push(templateReference);

      await AsyncStorage.setItem(this.storageKey, JSON.stringify({
        templates: existingReferences,
        lastUpdated: new Date().toISOString()
      }));

      console.log('✅ Template reference liked and saved:', templateData.name);
      return templateData;
    } catch (error) {
      console.error('Error liking template:', error);
      throw error;
    }
  }

  /**
   * Remove a template from liked templates
   */
  async unlikeTemplate(templateId) {
    try {
      const existingTemplates = await this.getLikedTemplates();
      const filteredTemplates = existingTemplates.filter(
        t => t.id !== templateId && t.localId !== templateId && t.public_id !== templateId
      );

      await AsyncStorage.setItem(this.storageKey, JSON.stringify({
        templates: filteredTemplates,
        lastUpdated: new Date().toISOString()
      }));

      console.log('💔 Template unliked:', templateId);
      return true;
    } catch (error) {
      console.error('Error unliking template:', error);
      throw error;
    }
  }

  /**
   * Check if a template is liked
   */
  async isTemplateLiked(templateId) {
    try {
      const templates = await this.getLikedTemplates();
      return templates.some(
        t => t.id === templateId || t.localId === templateId || t.public_id === templateId
      );
    } catch (error) {
      console.error('Error checking if template is liked:', error);
      return false;
    }
  }

  /**
   * Get liked templates statistics
   */
  async getLikedStats() {
    try {
      const templates = await this.getLikedTemplates();
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
      console.error('Error getting liked stats:', error);
      return { total: 0, byCategory: {} };
    }
  }

  /**
   * Clear all liked templates
   */
  async clearAllLikedTemplates() {
    try {
      await AsyncStorage.removeItem(this.storageKey);
      console.log('💔 All liked templates cleared');
      return true;
    } catch (error) {
      console.error('Error clearing liked templates:', error);
      throw error;
    }
  }

  /**
   * Export liked templates data
   */
  async exportLikedTemplates() {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : { templates: [], lastUpdated: null };
    } catch (error) {
      console.error('Error exporting liked templates:', error);
      throw error;
    }
  }

  /**
   * Import liked templates data
   */
  async importLikedTemplates(data) {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(data));
      console.log('💖 Liked templates imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing liked templates:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const likedTemplatesService = new LikedTemplatesService();
export default likedTemplatesService;