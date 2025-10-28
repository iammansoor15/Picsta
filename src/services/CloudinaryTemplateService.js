import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import AppConfig from '../config/AppConfig';

// Template service for Cloudinary-based template management
class CloudinaryTemplateService {
  constructor() {
    // Prefer local/dev API when developing, with optional production fallback
    const devServer = AppConfig?.DEVELOPMENT?.DEV_SERVER_URL
      ? AppConfig.DEVELOPMENT.DEV_SERVER_URL.replace(/\/$/, '')
      : null;

    const platformDevUrls = Platform.select({
      android: [
        // Prefer USB reverse for physical devices with IP address
        'http://192.168.1.64:10000',
        'http://127.0.0.1:10000',
        'http://localhost:10000',
        // Emulator loopback
        'http://10.0.2.2:10000'
      ],
      ios: [
        'http://192.168.1.64:10000',
        'http://127.0.0.1:10000',
        'http://localhost:10000'
      ],
      default: []
    });

    const candidates = [];
    const prod = AppConfig?.PRODUCTION_SERVER_URL ? `${AppConfig.PRODUCTION_SERVER_URL.replace(/\/$/, '')}/api/templates` : null;
    const allowProd = AppConfig?.DEVELOPMENT?.USE_PRODUCTION_FALLBACK === true;

    if (prod && allowProd) candidates.push(prod);
    if (devServer) candidates.push(`${devServer}/api/templates`);
    candidates.push(...platformDevUrls.map(u => `${u}/api/templates`));
    // Note: baseURL points to /api/templates so we can append path routes like /category/:main

    // Deduplicate
    this.apiUrls = candidates.filter((u, i) => u && candidates.indexOf(u) === i);
    this.baseURL = this.apiUrls[0] || prod;
    this.cachePrefix = '@cloudinary_templates_';
    this.cacheTTL = 3600000; // 1 hour in milliseconds
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Test API connectivity and select best URL
   */
  async testAndSelectBestApiUrl() {
    // If no candidates, seed with baseURL
    const urls = (this.apiUrls && this.apiUrls.length > 0) ? this.apiUrls : [this.baseURL];
    for (const url of urls) {
      try {
        console.log(`🧪 Testing API URL: ${url}`);
        // Probe the root of the templates API first (fast), then /health as fallback
        const probes = [url, `${url}/health`];
        let worked = false;
        for (const probe of probes) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);
          try {
            const response = await fetch(probe, {
              method: 'GET',
              cache: 'no-store',
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
              console.log(`✅ API probe OK: ${probe}`);
              worked = true;
              break;
            } else {
              console.warn(`⚠️ API probe returned ${response.status}: ${probe}`);
            }
          } catch (err) {
            clearTimeout(timeoutId);
            console.warn(`❌ API probe failed: ${probe} ${err?.message || err}`);
          }
        }
        if (worked) {
          this.baseURL = url;
          return true;
        }
      } catch (error) {
        console.warn(`❌ API URL failed: ${url}`, error.message);
      }
    }

    console.error('❌ No working API URLs found');
    return false;
  }

  /**
   * Check network connectivity
   * Simple connectivity check without netinfo dependency
   */
  async checkNetworkConnectivity() {
    try {
      // Simple fetch test to check connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Network check failed:', error);
      return false;
    }
  }

  /**
   * Get cache key for a specific resource
   */
  getCacheKey(resource, params = {}) {
    const paramString = Object.keys(params).length > 0 ? 
      '_' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('_') : '';
    return `${this.cachePrefix}${resource}${paramString}`;
  }

  /**
   * Get cached data
   */
  async getCachedData(cacheKey) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > this.cacheTTL;
        
        if (!isExpired) {
          console.log(`📱 Using cached data for: ${cacheKey}`);
          return data;
        } else {
          console.log(`🕐 Cache expired for: ${cacheKey}`);
          await AsyncStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    return null;
  }

  /**
   * Cache data
   */
  async setCachedData(cacheKey, data) {
    try {
      const cacheObject = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheObject));
      console.log(`💾 Cached data for: ${cacheKey}`);
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(url, options = {}, retryCount = 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`API request failed (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < this.maxRetries) {
        console.log(`Retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.makeRequest(url, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Get all template categories
   */
  async getTemplateCategories() {
    try {
      console.log('📂 Fetching template categories...');
      
      const cacheKey = this.getCacheKey('categories');
      
      // Check cache first
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Test API connectivity and select best URL
      const apiWorking = await this.testAndSelectBestApiUrl();
      if (!apiWorking) {
        console.warn('Backend API health check failed; proceeding with existing baseURL:', this.baseURL);
      }

      // Fetch from API
      const result = await this.makeRequest(`${this.baseURL}/categories`);
      const categories = result.data.categories || [];

      // Cache the result
      await this.setCachedData(cacheKey, categories);

      console.log(`✅ Fetched ${categories.length} template categories`);
      return categories;

    } catch (error) {
      console.error('Error fetching template categories:', error);
      
      // Try to return cached data even if expired
      const cacheKey = this.getCacheKey('categories');
      const expiredCache = await AsyncStorage.getItem(cacheKey);
      if (expiredCache) {
        console.log('🕐 Using expired cache due to error');
        const { data } = JSON.parse(expiredCache);
        return data || [];
      }
      
      throw error;
    }
  }

  /**
   * Get templates by category with pagination
   */
  async getTemplatesByCategory(category, options = {}) {
    // Destructure at function level so catch block can access them
    const {
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      order = 'desc',
      next_cursor = null,
      useCache = true,
      ratio = null, // Optional ratio filter, e.g., '1_1','3_4','4_3','9_16'
      religion = null, // main category (e.g., 'hindu')
      main_category = null,
    } = options;

    try {
      console.log(`📂 Fetching templates for category: ${category} (page ${page}, limit ${limit})`);

      const cacheKey = this.getCacheKey('category', { 
        category, 
        page, 
        limit, 
        sort_by, 
        order,
        ...(ratio ? { ratio } : {}),
        ...(religion || main_category ? { religion: religion || main_category } : {})
      });

      // Check cache first (only for first page)
      if (useCache && page === 1) {
        const cachedData = await this.getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      // Test API connectivity and select best URL  
      const apiWorking = await this.testAndSelectBestApiUrl();
      if (!apiWorking) {
        console.warn('Backend API health check failed; proceeding with existing baseURL:', this.baseURL);
      }

      // Build URL. If a single main category is provided (and not 'all'), use path route:
      //   /api/templates/category/:main or /api/templates/category/:main/:subcategory
      // Otherwise fall back to query params.
      const mains = (religion || main_category)
        ? (Array.isArray(religion || main_category) ? (religion || main_category) : [religion || main_category])
        : [];
      const normalizedMains = mains.map(r => String(r).toLowerCase().trim()).filter(Boolean);

      let url;
      if (normalizedMains.length === 1 && normalizedMains[0] !== 'all') {
        const main = normalizedMains[0];
        const path = category ? `/category/${encodeURIComponent(main)}/${encodeURIComponent(category)}`
                              : `/category/${encodeURIComponent(main)}`;
        const qp = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sort_by,
          order,
        });
        if (ratio) qp.set('ratio', typeof ratio === 'string' ? ratio.replace(':', '_') : String(ratio));
        if (next_cursor) qp.set('next_cursor', next_cursor);
        url = `${this.baseURL}${path}?${qp.toString()}`;
      } else {
        // Fallback to query filtering (explicitly send subcategory and legacy category)
        const qp = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sort_by,
          order
        });
        if (category) {
          qp.set('subcategory', String(category).toLowerCase().trim());
          qp.set('category', String(category).toLowerCase().trim()); // legacy fallback
        }
        if (normalizedMains.length > 0 && !normalizedMains.includes('all')) {
          qp.set('religion', normalizedMains.join(','));
        }
        if (ratio) qp.set('ratio', typeof ratio === 'string' ? ratio.replace(':', '_') : String(ratio));
        if (next_cursor) qp.set('next_cursor', next_cursor);
        url = `${this.baseURL}?${qp.toString()}`;
      }

      console.log('[CloudinaryTemplateService] GET:', url);
      // Fetch using composed URL (path or query)
      const result = await this.makeRequest(url);

      // Normalize Mongo template docs so UI does not rely on Cloudinary fields
      const rawTemplates = result.data?.templates || [];
      console.log(`📦 RAW TEMPLATES from API: ${rawTemplates.length} items`);
      
      const normalizedTemplates = rawTemplates.map((t) => {
        const id = String(t.id || t._id || t.serial_no || `${t.subcategory || t.category || 'template'}-${t.serial_no || Date.now()}`);
        const isVideo = t.resource_type === 'video';
        const mediaUrl = isVideo ? (t.video_url || t.image_url) : (t.image_url || t.secure_url || t.url);
        
        // LOG VIDEO TEMPLATES
        if (t.serial_no === 15 || t.serial_no === 16 || isVideo) {
          console.log(`🎥 NORMALIZING TEMPLATE ${t.serial_no}:`, {
            raw_resource_type: t.resource_type,
            raw_video_url: t.video_url?.substring(0, 60),
            raw_image_url: t.image_url?.substring(0, 60),
            isVideo: isVideo,
            will_set_video_url: isVideo ? (t.video_url || t.image_url)?.substring(0, 60) : 'null',
            will_set_image_url: !isVideo ? (t.image_url || t.secure_url || t.url)?.substring(0, 60) : 'null'
          });
        }
        
        const normalized = {
          ...t,
          id,
          // For videos, preserve video_url; for images, use image_url
          video_url: isVideo ? (t.video_url || t.image_url) : null,
          image_url: !isVideo ? (t.image_url || t.secure_url || t.url) : null,
          // Provide Cloudinary-like fields as fallbacks for existing UI
          secure_url: mediaUrl || t.secure_url || t.url || null,
          url: mediaUrl || t.url || null,
          category: t.category || t.subcategory || null,
        };
        
        // LOG NORMALIZED RESULT FOR VIDEOS
        if (t.serial_no === 15 || t.serial_no === 16 || isVideo) {
          console.log(`✅ NORMALIZED TEMPLATE ${t.serial_no}:`, {
            resource_type: normalized.resource_type,
            video_url: normalized.video_url?.substring(0, 60),
            image_url: normalized.image_url?.substring(0, 60),
            url: normalized.url?.substring(0, 60)
          });
        }
        
        return normalized;
      });

      const responseData = {
        templates: normalizedTemplates,
        pagination: result.data?.pagination || {},
        category: result.data?.category || category
      };

      // Cache only the first page
      if (useCache && page === 1) {
        await this.setCachedData(cacheKey, responseData);
      }

      console.log(`✅ Fetched ${responseData.templates.length} templates for category: ${category}`);
      return responseData;

    } catch (error) {
      console.error(`Error fetching templates for category ${category}:`, error);
      
      // Try to return cached data for first page
      if (page === 1) {
        const cacheKey = this.getCacheKey('category', { 
          category, 
          page, 
          limit, 
          sort_by, 
          order,
          ...(ratio ? { ratio } : {})
        });
        const expiredCache = await AsyncStorage.getItem(cacheKey);
        if (expiredCache) {
          console.log('🕐 Using expired cache due to error');
          const { data } = JSON.parse(expiredCache);
          return data || { templates: [], pagination: {}, category };
        }
      }
      
      throw error;
    }
  }

  /**
   * Upload a template to a specific category
   */
  async uploadTemplate(imageUri, category, templateData = {}) {
    try {
      const ratio = templateData?.ratio || null;
      console.log(`📤 Uploading template to category: ${category}${ratio ? ` with ratio ${ratio}` : ''}`);

      // Check network connectivity
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection available');
      }

      const { name = 'Custom Template', description = '' } = templateData;

      // Create form data
      const formData = new FormData();
      formData.append('category', category);
      formData.append('name', name);
      formData.append('description', description);
      if (ratio) {
        // Provide ratio so backend can create folder like category/ratio
        const normalizedRatio = typeof ratio === 'string' ? ratio.replace(':', '_') : ratio;
        formData.append('ratio', normalizedRatio);
      }
      
      // Add the image file (field name must match server's multer: 'image')
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `template_${Date.now()}.jpg`
      });

      // Optional axes from templateData
      try {
        if (templateData?.photo_container_axis && typeof templateData.photo_container_axis === 'object') {
          const a = templateData.photo_container_axis;
          const ax = { x: Number(a.x), y: Number(a.y) };
          if (Number.isFinite(ax.x) && Number.isFinite(ax.y)) {
            formData.append('photo_container_axis', JSON.stringify(ax));
            formData.append('photo_x', String(ax.x));
            formData.append('photo_y', String(ax.y));
          }
        }
        if (templateData?.text_container_axis && typeof templateData.text_container_axis === 'object') {
          const t = templateData.text_container_axis;
          const tx = { x: Number(t.x), y: Number(t.y) };
          if (Number.isFinite(tx.x) && Number.isFinite(tx.y)) {
            formData.append('text_container_axis', JSON.stringify(tx));
            formData.append('text_x', String(tx.x));
            formData.append('text_y', String(tx.y));
          }
        }
      } catch (e) {
        console.warn('Axis append failed:', e?.message || e);
      }

      // Upload to server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for uploads
      
      const response = await fetch(`${this.baseURL}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Don't set Content-Type for FormData - let the browser set it with boundary
        // headers: {
        //   'Content-Type': 'multipart/form-data',
        // }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upload failed: HTTP ${response.status}`);
      }

const result = await response.json();
      
      // Accept multiple response shapes
      const template = result?.template || result?.data?.template || result?.data;
      if (!template) {
        throw new Error((result && (result.error || result.message)) || 'Upload response missing template data');
      }

      // Invalidate relevant caches - fix pattern to match actual cache keys
      await this.invalidateCache([
        'categories',
        `category_category=${category}`,
        `category_category=${category}_page=1`,
        `category_category=${category}_page=1_limit=10`,
        `category_category=${category}_page=1_limit=20`,
        `@cloudinary_templates_categories`,
        `@cloudinary_templates_category_category=${category}`,
        category  // Also try just the category name
      ]);

      // Force refresh categories and templates for this category
      try {
        console.log('🔄 Force refreshing categories after upload...');
        await this.getTemplateCategories(); // This will bypass cache
        console.log('🔄 Force refreshing templates for category after upload...');
        await this.getTemplatesByCategory(category, { useCache: false }); // Force fresh fetch
      } catch (refreshError) {
        console.warn('⚠️ Error refreshing data after upload:', refreshError);
      }

console.log('✅ Template uploaded successfully');
      return template;

    } catch (error) {
      console.error('Error uploading template:', error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(category, templateId) {
    try {
      console.log(`🗑️ Deleting template: ${templateId} from category: ${category}`);

      // Check network connectivity
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection available');
      }

      const result = await this.makeRequest(
        `${this.baseURL}/${category}/${templateId}`,
        { method: 'DELETE' }
      );

      // Invalidate relevant caches - fix pattern to match actual cache keys
      await this.invalidateCache([
        'categories',
        `category_category=${category}`,
        `category_category=${category}_page=1`,
        `category_category=${category}_page=1_limit=10`,
        `category_category=${category}_page=1_limit=20`,
        `@cloudinary_templates_categories`,
        `@cloudinary_templates_category_category=${category}`,
        category  // Also try just the category name
      ]);

      console.log('✅ Template deleted successfully');
      return result.data;

    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Search templates across categories
   */
  async searchTemplates(query, options = {}) {
    try {
      const {
        categories = null,
        page = 1,
        limit = 20,
        next_cursor = null
      } = options;

      console.log(`🔍 Searching templates with query: "${query}"`);

      // Check network connectivity
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection available');
      }

      // Build query parameters
      const params = new URLSearchParams({
        query,
        page: page.toString(),
        limit: limit.toString()
      });

      if (categories && categories.length > 0) {
        params.append('categories', categories.join(','));
      }

      if (next_cursor) {
        params.append('next_cursor', next_cursor);
      }

      const result = await this.makeRequest(
        `${this.baseURL}/search?${params.toString()}`
      );

      console.log(`✅ Found ${result.data.templates.length} templates matching: "${query}"`);
      return result.data;

    } catch (error) {
      console.error('Error searching templates:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific keys
   */
  async invalidateCache(patterns) {
    try {
      console.log('🔍 Cache invalidation patterns:', patterns);
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.cachePrefix));
      console.log('📋 All cache keys:', cacheKeys);
      
      const keysToRemove = cacheKeys.filter(key => {
        return patterns.some(pattern => {
          if (typeof pattern === 'string') {
            const matches = key.includes(pattern);
            if (matches) {
              console.log(`✅ Pattern '${pattern}' matches key: ${key}`);
            }
            return matches;
          }
          return pattern.test(key);
        });
      });

      console.log('🗑️ Keys to remove:', keysToRemove);
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`🗑️ Successfully invalidated ${keysToRemove.length} cache entries`);
      } else {
        console.log('⚠️ No cache entries matched the invalidation patterns');
      }
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all template cache
   */
  async clearCache() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.cachePrefix));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ Cleared ${cacheKeys.length} template cache entries`);
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.cachePrefix));
      
      let totalSize = 0;
      let validEntries = 0;
      let expiredEntries = 0;

      for (const key of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
            const { timestamp } = JSON.parse(cached);
            const isExpired = Date.now() - timestamp > this.cacheTTL;
            
            if (isExpired) {
              expiredEntries++;
            } else {
              validEntries++;
            }
          }
        } catch (error) {
          console.warn(`Error reading cache entry: ${key}`, error);
        }
      }

      return {
        totalEntries: cacheKeys.length,
        validEntries,
        expiredEntries,
        totalSize,
        cacheTTL: this.cacheTTL
      };
    } catch (error) {
      console.warn('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Handle API errors with user-friendly messages
   */
  handleApiError(error) {
    let message = 'An unexpected error occurred';
    
    if (error.message.includes('network') || error.message.includes('connection')) {
      message = 'Network connection error. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      message = 'Request timed out. Please try again.';
    } else if (error.message.includes('HTTP 404')) {
      message = 'Requested resource not found.';
    } else if (error.message.includes('HTTP 500')) {
      message = 'Server error. Please try again later.';
    } else if (error.message.includes('HTTP 400')) {
      message = 'Invalid request. Please check your input.';
    }
    
    return message;
  }

  /**
   * Show error alert to user
   */
  showErrorAlert(error, title = 'Error') {
    const message = this.handleApiError(error);
    Alert.alert(title, message, [{ text: 'OK' }]);
  }

  /**
   * Force refresh all cached data
   */
  async forceRefreshAll() {
    try {
      console.log('🔄 Force refreshing all template data...');
      
      // Clear all cache first
      await this.clearCache();
      
      // Fetch fresh categories
      const categories = await this.getTemplateCategories();
      
      // Fetch fresh templates for each category
      for (const category of categories) {
        try {
          await this.getTemplatesByCategory(category.name, { useCache: false, page: 1, limit: 20 });
        } catch (error) {
          console.warn(`⚠️ Error refreshing category ${category.name}:`, error);
        }
      }
      
      console.log('✅ Force refresh completed');
      return true;
    } catch (error) {
      console.error('❌ Error in force refresh:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const cloudinaryTemplateService = new CloudinaryTemplateService();
export default cloudinaryTemplateService;