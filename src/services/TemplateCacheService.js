import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class TemplateCacheService {
  constructor() {
    this.cacheDirectory = `${RNFS.DocumentDirectoryPath}/template_cache`;
    this.metadataKey = '@template_cache_metadata';
    this.maxCacheSize = 100 * 1024 * 1024; // 100MB
    this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.initializeCache();
  }

  /**
   * Initialize cache directory
   */
  async initializeCache() {
    try {
      const exists = await RNFS.exists(this.cacheDirectory);
      if (!exists) {
        await RNFS.mkdir(this.cacheDirectory);
        console.log('📁 Template cache directory created');
      }
    } catch (error) {
      console.error('Error initializing template cache:', error);
    }
  }

  /**
   * Generate cache filename for a template
   */
  generateCacheFilename(templateId, format = 'jpg') {
    return `template_${templateId}.${format}`;
  }

  /**
   * Get cache file path for a template
   */
  getCacheFilePath(templateId, format = 'jpg') {
    const filename = this.generateCacheFilename(templateId, format);
    return `${this.cacheDirectory}/${filename}`;
  }

  /**
   * Download and cache a template from URL
   */
  async cacheTemplate(templateId, templateUrl, metadata = {}) {
    try {
      console.log(`📥 Caching template ${templateId} from ${templateUrl}`);
      
      // Check if already cached and up to date
      const cachedPath = await this.getCachedTemplatePath(templateId);
      if (cachedPath) {
        console.log(`💾 Template ${templateId} already cached`);
        return cachedPath;
      }

      // Determine file format from URL
      const format = this.extractFormatFromUrl(templateUrl);
      const cacheFilePath = this.getCacheFilePath(templateId, format);
      
      // Download the template
      const downloadResult = await RNFS.downloadFile({
        fromUrl: templateUrl,
        toFile: cacheFilePath,
        background: true,
        discretionary: true,
        cacheable: true,
        headers: {
          'User-Agent': 'NarayanaApp/1.0'
        }
      }).promise;

      if (downloadResult.statusCode === 200) {
        // Get file stats
        const fileStat = await RNFS.stat(cacheFilePath);
        
        // Update metadata
        await this.updateCacheMetadata(templateId, {
          ...metadata,
          url: templateUrl,
          format: format,
          size: fileStat.size,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          path: cacheFilePath
        });

        // Clean up old cache if needed
        await this.cleanupOldCache();

        console.log(`✅ Template ${templateId} cached successfully`);
        return cacheFilePath;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error(`Error caching template ${templateId}:`, error);
      
      // Clean up partial download
      const cacheFilePath = this.getCacheFilePath(templateId);
      try {
        const exists = await RNFS.exists(cacheFilePath);
        if (exists) {
          await RNFS.unlink(cacheFilePath);
        }
      } catch (cleanupError) {
        console.warn('Error cleaning up failed download:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Quick boolean check if a template is cached
   */
  async isTemplateCached(templateId) {
    try {
      const path = await this.getCachedTemplatePath(templateId);
      return !!path;
    } catch (_) {
      return false;
    }
  }

  /**
   * Get cached template path if available and valid
   */
  async getCachedTemplatePath(templateId) {
    try {
      const metadata = await this.getCacheMetadata();
      const templateMeta = metadata[templateId];
      
      if (!templateMeta) {
        return null;
      }

      // Check if cache is expired
      const isExpired = Date.now() - templateMeta.cachedAt > this.maxCacheAge;
      if (isExpired) {
        console.log(`⏰ Cache expired for template ${templateId}`);
        await this.removeCachedTemplate(templateId);
        return null;
      }

      // Check if file exists
      const exists = await RNFS.exists(templateMeta.path);
      if (!exists) {
        console.log(`📂 Cache file missing for template ${templateId}`);
        await this.removeCacheMetadata(templateId);
        return null;
      }

      // Update last accessed time
      await this.updateCacheMetadata(templateId, {
        ...templateMeta,
        lastAccessed: Date.now()
      });

      return `file://${templateMeta.path}`;
    } catch (error) {
      console.error(`Error checking cached template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Cache a template when selected for hero screen
   */
  async cacheTemplateForHeroScreen(template) {
    try {
      console.log(`🎨 Caching template for hero screen: ${template.name}`);
      
      const sourceUrl = template.image_url || template.secure_url || template.url;
      const cachedPath = await this.cacheTemplate(template.id, sourceUrl, {
        name: template.name,
        category: template.category,
        width: template.width,
        height: template.height,
        usedInHeroScreen: true
      });

      console.log(`✅ Template cached for hero screen: ${cachedPath}`);
      return cachedPath;
    } catch (error) {
      console.error('Error caching template for hero screen:', error);
      // Return original URL as fallback
      return template.image_url || template.secure_url || template.url;
    }
  }

  /**
   * Get template for hero screen (cached or download if needed)
   */
  async getTemplateForHeroScreen(template) {
    try {
      // First check if already cached
      let cachedPath = await this.getCachedTemplatePath(template.id);
      
      if (cachedPath) {
        console.log(`💾 Using cached template: ${template.name}`);
        return cachedPath;
      }

      // Cache the template
      console.log(`📥 Downloading template for offline use: ${template.name}`);
      cachedPath = await this.cacheTemplateForHeroScreen(template);
      
      return cachedPath;
    } catch (error) {
      console.error('Error getting template for hero screen:', error);
      // Return online URL as fallback
      return template.image_url || template.secure_url || template.url;
    }
  }

  /**
   * Extract image format from URL
   */
  extractFormatFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = pathname.split('.').pop().toLowerCase();
      
      // Common image formats
      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
        return extension === 'jpeg' ? 'jpg' : extension;
      }
      
      // Default to jpg for Cloudinary URLs or unknown formats
      return 'jpg';
    } catch (error) {
      console.warn('Error extracting format from URL:', error);
      return 'jpg';
    }
  }

  /**
   * Update cache metadata
   */
  async updateCacheMetadata(templateId, metadata) {
    try {
      const currentMetadata = await this.getCacheMetadata();
      currentMetadata[templateId] = metadata;
      
      await AsyncStorage.setItem(this.metadataKey, JSON.stringify(currentMetadata));
    } catch (error) {
      console.error('Error updating cache metadata:', error);
    }
  }

  /**
   * Get cache metadata
   */
  async getCacheMetadata() {
    try {
      const metadata = await AsyncStorage.getItem(this.metadataKey);
      return metadata ? JSON.parse(metadata) : {};
    } catch (error) {
      console.error('Error getting cache metadata:', error);
      return {};
    }
  }

  /**
   * Remove cache metadata for a template
   */
  async removeCacheMetadata(templateId) {
    try {
      const metadata = await this.getCacheMetadata();
      delete metadata[templateId];
      await AsyncStorage.setItem(this.metadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error removing cache metadata:', error);
    }
  }

  /**
   * Remove cached template
   */
  async removeCachedTemplate(templateId) {
    try {
      const metadata = await this.getCacheMetadata();
      const templateMeta = metadata[templateId];
      
      if (templateMeta && templateMeta.path) {
        const exists = await RNFS.exists(templateMeta.path);
        if (exists) {
          await RNFS.unlink(templateMeta.path);
        }
      }
      
      await this.removeCacheMetadata(templateId);
      console.log(`🗑️ Removed cached template: ${templateId}`);
    } catch (error) {
      console.error(`Error removing cached template ${templateId}:`, error);
    }
  }

  /**
   * Clean up old cache files
   */
  async cleanupOldCache() {
    try {
      const metadata = await this.getCacheMetadata();
      const now = Date.now();
      let totalSize = 0;
      
      // Calculate total cache size and find expired items
      const templateEntries = Object.entries(metadata);
      const expiredTemplates = [];
      
      for (const [templateId, meta] of templateEntries) {
        totalSize += meta.size || 0;
        
        // Check if expired
        if (now - meta.cachedAt > this.maxCacheAge) {
          expiredTemplates.push(templateId);
        }
      }

      // Remove expired templates
      for (const templateId of expiredTemplates) {
        await this.removeCachedTemplate(templateId);
        console.log(`⏰ Removed expired template: ${templateId}`);
      }

      // If still over cache size limit, remove least recently accessed
      if (totalSize > this.maxCacheSize) {
        console.log(`💾 Cache size (${totalSize}) exceeds limit (${this.maxCacheSize}), cleaning up...`);
        
        const remainingEntries = Object.entries(metadata)
          .filter(([id]) => !expiredTemplates.includes(id))
          .sort(([,a], [,b]) => (a.lastAccessed || 0) - (b.lastAccessed || 0));
        
        let currentSize = totalSize;
        for (const [templateId, meta] of remainingEntries) {
          if (currentSize <= this.maxCacheSize * 0.8) { // Keep 80% of max size
            break;
          }
          
          await this.removeCachedTemplate(templateId);
          currentSize -= meta.size || 0;
          console.log(`🧹 Removed template to free space: ${templateId}`);
        }
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const metadata = await this.getCacheMetadata();
      const templateEntries = Object.entries(metadata);
      
      let totalSize = 0;
      let totalFiles = 0;
      let expiredFiles = 0;
      const now = Date.now();
      
      for (const [templateId, meta] of templateEntries) {
        totalFiles++;
        totalSize += meta.size || 0;
        
        if (now - meta.cachedAt > this.maxCacheAge) {
          expiredFiles++;
        }
      }

      return {
        totalFiles,
        totalSize,
        expiredFiles,
        cacheDirectory: this.cacheDirectory,
        maxCacheSize: this.maxCacheSize,
        maxCacheAge: this.maxCacheAge,
        usagePercentage: Math.round((totalSize / this.maxCacheSize) * 100)
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Clear entire cache
   */
  async clearCache() {
    try {
      console.log('🗑️ Clearing entire template cache...');
      
      // Remove cache directory
      const exists = await RNFS.exists(this.cacheDirectory);
      if (exists) {
        await RNFS.unlink(this.cacheDirectory);
      }
      
      // Clear metadata
      await AsyncStorage.removeItem(this.metadataKey);
      
      // Recreate cache directory
      await this.initializeCache();
      
      console.log('✅ Template cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Pre-cache popular templates
   */
  async precachePopularTemplates(templates, maxCount = 5) {
    try {
      console.log(`📥 Pre-caching ${Math.min(maxCount, templates.length)} popular templates...`);
      
      const templatesToCache = templates.slice(0, maxCount);
      const cachePromises = templatesToCache.map(template =>
        this.cacheTemplate(template.id, (template.image_url || template.secure_url || template.url), {
          name: template.name,
          category: template.category,
          width: template.width,
          height: template.height,
          precached: true
        }).catch(error => {
          console.warn(`Failed to pre-cache template ${template.id}:`, error);
          return null;
        })
      );

      const results = await Promise.all(cachePromises);
      const successCount = results.filter(result => result !== null).length;
      
      console.log(`✅ Pre-cached ${successCount}/${templatesToCache.length} templates`);
      return successCount;
    } catch (error) {
      console.error('Error pre-caching templates:', error);
      return 0;
    }
  }

  /**
   * Check if template is cached
   */
  async isTemplateCached(templateId) {
    try {
      const cachedPath = await this.getCachedTemplatePath(templateId);
      return cachedPath !== null;
    } catch (error) {
      console.error(`Error checking if template ${templateId} is cached:`, error);
      return false;
    }
  }
}

// Create and export singleton instance
const templateCacheService = new TemplateCacheService();
export default templateCacheService;