import AppConfig from '../config/AppConfig';
import { Platform } from 'react-native';

class TemplateService {
  constructor() {
    // Prefer dev server for development
    const isDevelopment = typeof __DEV__ === 'boolean' ? __DEV__ : true;
    const initial = isDevelopment ? AppConfig?.DEVELOPMENT?.DEV_SERVER_URL : AppConfig?.PRODUCTION_SERVER_URL;
    // Normalize and strip trailing slash
    this.baseURL = (initial || '').replace(/\/$/, '');
    console.log('📡 TemplateService initialized with baseURL:', this.baseURL);
  }

  // Probe and select a working base URL (localhost/emulator/prod fallback)
  async _selectWorkingBase() {
    const allowProd = (AppConfig?.DEVELOPMENT?.USE_PRODUCTION_FALLBACK === true) || (typeof __DEV__ !== 'boolean' || __DEV__ === false);
    const candidates = [
      AppConfig?.DEVELOPMENT?.DEV_SERVER_URL,
      'http://192.168.1.64:10000',
      'http://127.0.0.1:10000',
      'http://localhost:10000',
      'http://10.0.2.2:10000',
      allowProd ? AppConfig?.PRODUCTION_SERVER_URL : null,
    ].filter(Boolean).map(u => u.replace(/\/$/, ''));

    const test = async (url) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      try {
        const probes = [`${url}/api/templates`, `${url}/api/templates/health`];
        for (const p of probes) {
          try {
            const resp = await fetch(p, { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-store' } });
            if (resp.ok) { clearTimeout(timeoutId); return true; }
          } catch (_) {}
        }
        clearTimeout(timeoutId);
        return false;
      } catch (_) {
        clearTimeout(timeoutId);
        return false;
      }
    };

    // If current works, keep it
    if (this.baseURL) {
      try { if (await test(this.baseURL)) return this.baseURL; } catch {}
    }

    for (const c of candidates) {
      try {
        const ok = await test(c);
        if (ok) {
          this.baseURL = c;
          return this.baseURL;
        }
      } catch {}
    }
    // Fallback: keep existing or first candidate
    this.baseURL = this.baseURL || candidates[0] || 'http://127.0.0.1:10000';
    return this.baseURL;
  }

  /**
   * Upload image to Cloudinary and save template metadata
   * @param {string} imageUri - Local image URI from image picker
   * @param {string} category - Template category
   * @param {Object} [extra] - Optional extras like { photo_container_axis: {x,y} }
   * @returns {Promise<Object>} - Template data with image_url, serial_no, category
   */
  async uploadTemplate(imageUri, category, extra = {}) {
    try {
      console.log('📤 TemplateService: Uploading template...', { category });

      // Probe candidates to select a working base URL (helps on device vs emulator)
      const candidates = [
        AppConfig?.PRODUCTION_SERVER_URL,
        AppConfig?.DEVELOPMENT?.DEV_SERVER_URL,
        'http://192.168.1.64:10000',
        'http://127.0.0.1:10000',
        'http://localhost:10000',
        'http://10.0.2.2:10000',
      ].filter(Boolean).map(u => u.replace(/\/$/, ''));

      const test = async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          // Try fast endpoint first; fall back to health
          const probes = [`${url}/api/templates`, `${url}/api/templates/health`];
          for (const p of probes) {
            try {
              const resp = await fetch(p, { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-store' } });
              if (resp.ok) { clearTimeout(timeoutId); return url; }
            } catch (_) {}
          }
          clearTimeout(timeoutId);
          return null;
        } catch (_) {
          clearTimeout(timeoutId);
          return null;
        }
      };

      // Only reselect when current doesn't work
      let useURL = this.baseURL;
      let ok = await test(useURL);
      if (!ok) {
        for (const c of candidates) {
          const good = await test(c);
          if (good) { useURL = good; break; }
        }
      }
      this.baseURL = useURL;

      // Normalize URI for Android file paths
      const ensureFileUri = (uri) => {
        if (!uri) return uri;
        if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
        if (uri.startsWith('/')) return `file://${uri}`;
        return uri;
      };

      const normalizedUri = ensureFileUri(imageUri);

      // Create form data
      const formData = new FormData();
      
      // Add image/video file
      const filename = (normalizedUri || '').split('/').pop() || `template_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      
      // Determine if it's a video or image based on extension
      const videoExtensions = ['mp4', 'mov', 'm4v', 'avi', 'webm', 'mpeg', 'mpg'];
      const isVideo = videoExtensions.includes(ext);
      const type = isVideo ? `video/${ext}` : `image/${ext}`;
      
      console.log('📁 File type detected:', { filename, ext, isVideo, type });

      formData.append('image', {
        uri: normalizedUri,
        name: filename,
        type: type,
      });

      // Determine subcategory from input
      const subcat = String((extra?.subcategory || category)).toLowerCase().trim();
      // Always send explicit subcategory and category (legacy) as the selected subcategory
      formData.append('category', subcat);
      formData.append('subcategory', subcat);

      // Main category (religion)
      if (extra?.religion) {
        formData.append('religion', String(extra.religion).toLowerCase().trim());
      }

      // Include optional axes (as JSON string to preserve structure via multipart)
      if (extra?.photo_container_axis && typeof extra.photo_container_axis === 'object') {
        try {
          const axis = {
            x: Number(extra.photo_container_axis.x),
            y: Number(extra.photo_container_axis.y),
          };
          if (Number.isFinite(axis.x) && Number.isFinite(axis.y)) {
            formData.append('photo_container_axis', JSON.stringify(axis));
            // Redundant fields for maximum compatibility with some multipart parsers
            formData.append('photo_x', String(axis.x));
            formData.append('photo_y', String(axis.y));
            console.log('📎 Appending photo_container_axis:', axis);
          }
        } catch (e) {
          console.warn('Failed to append photo_container_axis:', e?.message || e);
        }
      }

      if (extra?.text_container_axis && typeof extra.text_container_axis === 'object') {
        try {
          const tAxis = {
            x: Number(extra.text_container_axis.x),
            y: Number(extra.text_container_axis.y),
          };
          if (Number.isFinite(tAxis.x) && Number.isFinite(tAxis.y)) {
            formData.append('text_container_axis', JSON.stringify(tAxis));
            formData.append('text_x', String(tAxis.x));
            formData.append('text_y', String(tAxis.y));
            console.log('📎 Appending text_container_axis:', tAxis);
          }
        } catch (e) {
          console.warn('Failed to append text_container_axis:', e?.message || e);
        }
      }

      // Upload to server with extended timeout for videos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds for video processing
      
      console.log('⬆️ Uploading to:', `${this.baseURL}/api/templates/upload`);
      
      try {
        const response = await fetch(`${this.baseURL}/api/templates/upload`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload template');
        }

        console.log('✅ TemplateService: Template uploaded successfully', result.data);
        return result.data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timeout - video processing took too long');
        }
        throw fetchError;
      }

    } catch (error) {
      console.error('❌ TemplateService: Upload failed:', error);
      throw error;
    }
  }

  /**
   * Get all templates or filter by category
   * @param {Object} options - Query options {category, limit, page}
   * @returns {Promise<Object>} - Templates list with pagination
   */
  async listTemplates(options = {}) {
    try {
      const { category, limit = 20, page = 1 } = options;

      // Ensure we have a working base URL (localhost/dev/prod)
      await this._selectWorkingBase();
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      if (category) {
        params.append('category', category.toLowerCase().trim());
      }

      const response = await fetch(`${this.baseURL}/api/templates?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch templates');
      }

      return result.data;

    } catch (error) {
      console.error('❌ TemplateService: Failed to list templates:', error);
      throw error;
    }
  }

  /**
   * Get latest template for a category
   * @param {string} category - Template category
   * @returns {Promise<Object|null>} - Latest template or null
   */
  async getLatestTemplate(category) {
    try {
      // Ensure we have a working base URL
      await this._selectWorkingBase();

      const response = await fetch(
        `${this.baseURL}/api/templates/latest/${category.toLowerCase().trim()}`,
        { headers: { 'Cache-Control': 'no-store' } }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch latest template');
      }

      return result.data.template;

    } catch (error) {
      console.error('❌ TemplateService: Failed to get latest template:', error);
      throw error;
    }
  }

  async getLatestByMain(main) {
    try {
      await this._selectWorkingBase();
      const m = String(main || '').toLowerCase().trim();
      const response = await fetch(`${this.baseURL}/api/templates/latest/${encodeURIComponent(m)}`, { headers: { 'Cache-Control': 'no-store' } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch latest by main');
      return result.data.template;
    } catch (error) {
      console.error('❌ TemplateService: Failed to get latest by main:', error);
      throw error;
    }
  }

  async getLatestByMainAndSub(main, sub) {
    try {
      await this._selectWorkingBase();
      const m = String(main || '').toLowerCase().trim();
      const s = String(sub || '').toLowerCase().trim();
      const response = await fetch(`${this.baseURL}/api/templates/latest/${encodeURIComponent(m)}/${encodeURIComponent(s)}`, { headers: { 'Cache-Control': 'no-store' } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch latest by main and sub');
      return result.data.template;
    } catch (error) {
      console.error('❌ TemplateService: Failed to get latest by main and sub:', error);
      throw error;
    }
  }

  /**
   * Batch fetch templates by subcategory/main in ordered serial_no windows
   * @param {Object} options - { subcategory, main, start_serial=1, limit=5, order='asc' }
   * @returns {Promise<Array<{category:string|null, subcategory:string|null, image_url:string, serial_no:number}>>}
   */
  async fetchBatch(options = {}) {
    const { subcategory, main, start_serial = 1, limit = 5, order = 'asc' } = options;
    if (!subcategory) throw new Error('subcategory is required');
    try {
      await this._selectWorkingBase();
      const params = new URLSearchParams();
      params.set('subcategory', String(subcategory).toLowerCase().trim());
      if (main) params.set('religion', String(main).toLowerCase().trim());
      params.set('start_serial', String(Math.max(1, Number(start_serial) || 1)));
      params.set('limit', String(Math.max(1, Math.min(100, Number(limit) || 5))));
      params.set('order', order === 'desc' ? 'desc' : 'asc');
      const url = `${this.baseURL}/api/templates/batch?${params.toString()}`;
      const resp = await fetch(url, { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
      const json = await resp.json();
      if (!resp.ok || !json?.success) throw new Error(json?.error || 'Failed to fetch batch');
      return Array.isArray(json?.data?.templates) ? json.data.templates : [];
    } catch (e) {
      console.error('❌ TemplateService: Failed to fetch batch:', e?.message || e);
      throw e;
    }
  }
}

export default new TemplateService();
