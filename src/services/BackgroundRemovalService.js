import { Alert, Platform } from 'react-native';
import AppConfig from '../config/AppConfig';
import ImageResizer from '@bam.tech/react-native-image-resizer';

const CONFIG = {
  PRODUCTION_SERVER_URL: AppConfig.PRODUCTION_SERVER_URL,
  
  DEFAULT_URLS: Platform.select({
    android: [
      'http://10.0.2.2:10000',       // Android emulator loopback
      'http://localhost:10000',      // USB debugging with adb reverse
      'http://127.0.0.1:10000',      // Localhost IP
    ],
    ios: [
      'http://localhost:10000',      // Localhost for development
      'http://127.0.0.1:10000'       // Localhost IP
    ]
  }),
  
  // Current server URL (will be set dynamically or from config)
  SERVER_URL: null,
  
  ENDPOINTS: {
    BATCH_PROCESS: '/process-batch',
    HEALTH: '/health'
  },
  TIMEOUT: 300000, // 5 minutes timeout for background removal
  CONNECTION_TIMEOUT: 15000, // 15 seconds for connection testing
  MAX_RETRIES: 3,
  
  // Get current server URLs (prefer dev candidates, optionally production)
  getServerUrls() {
    const candidates = [];
    // Explicitly configured server (e.g., after successful connectivity test)
    if (this.SERVER_URL) {
      candidates.push(this.SERVER_URL);
    }
    // Optional explicit dev URL from AppConfig if provided
    if (AppConfig?.DEVELOPMENT?.DEV_SERVER_URL) {
      const cleaned = AppConfig.DEVELOPMENT.DEV_SERVER_URL.replace(/\/$/, '');
      candidates.push(cleaned);
    }
    // Platform defaults (development candidates)
    const platformUrls = (this.DEFAULT_URLS && this.DEFAULT_URLS[Platform.OS]) ? this.DEFAULT_URLS[Platform.OS] : [];
    candidates.push(...platformUrls);
    // Production (fallback) — only if explicitly allowed for development
    const allowProd = AppConfig?.DEVELOPMENT?.USE_PRODUCTION_FALLBACK === true;
    if (allowProd && this.PRODUCTION_SERVER_URL) {
      candidates.push(this.PRODUCTION_SERVER_URL.replace(/\/$/, ''));
    }
    // Deduplicate while preserving order
    return candidates.filter((u, i) => u && candidates.indexOf(u) === i);
  },
  
  // Get current base URL (prefer explicit dev server; avoid production unless allowed)
  getBaseUrl() {
    if (this.SERVER_URL) {
      return this.SERVER_URL;
    }
    if (AppConfig?.DEVELOPMENT?.DEV_SERVER_URL) {
      return AppConfig.DEVELOPMENT.DEV_SERVER_URL.replace(/\/$/, '');
    }
    const platformUrls = (this.DEFAULT_URLS && this.DEFAULT_URLS[Platform.OS]) ? this.DEFAULT_URLS[Platform.OS] : [];
    if (platformUrls.length > 0) {
      return platformUrls[0];
    }
    const allowProd = AppConfig?.DEVELOPMENT?.USE_PRODUCTION_FALLBACK === true;
    if (allowProd && this.PRODUCTION_SERVER_URL) {
      return this.PRODUCTION_SERVER_URL;
    }
    // As a last resort, return whatever production URL is set (for release builds)
    return this.PRODUCTION_SERVER_URL;
  }
};

/**
 * Background Removal Service
 * Handles batch processing of images for background removal
 */
class BackgroundRemovalService {
  
  constructor() {
    this.currentJobId = null;
    this.cancelRequested = false;
    this._lastProgressLog = 0; // throttle progress logs
  }

  // Simple structured logger for BG removal
  _log(level, message, meta) {
    const prefix = '[BG]';
    const payload = meta ? ` ${JSON.stringify(meta)}` : '';
    const line = `${prefix} ${message}${payload}`;
    try {
      switch (level) {
        case 'warn': console.warn(line); break;
        case 'error': console.error(line); break;
        default: console.log(line);
      }
    } catch {}
  }
  
  /**
   * Set the server URL for production deployment
   * @param {string} serverUrl - The production server URL (e.g., 'https://your-app.onrender.com')
   */
  setServerUrl(serverUrl) {
    if (serverUrl && typeof serverUrl === 'string') {
      // Clean up URL (remove trailing slash)
      CONFIG.SERVER_URL = serverUrl.replace(/\/$/, '');
      console.log('🌐 Server URL configured:', CONFIG.SERVER_URL);
    } else {
      console.warn('⚠️ Invalid server URL provided');
    }
  }
  
  /**
   * Get current server configuration
   * @returns {Object} Current server configuration
   */
  getServerConfig() {
    return {
      serverUrl: CONFIG.SERVER_URL,
      baseUrl: CONFIG.getBaseUrl(),
      isDevelopment: !CONFIG.SERVER_URL,
      availableUrls: CONFIG.getServerUrls()
    };
  }
  
  /**
   * Saves processed images to local phone storage from base64 data
   * @param {Array} processedImageData - Array of processed image data from server (with base64 images)
   * @returns {Promise<Array>} Array of local file paths
   */
  async saveProcessedImages(processedImageData) {
    const RNFS = require('react-native-fs');
    const localImagePaths = [];

    try {
      this._log('info', 'Saving processed images to device');

      if (!Array.isArray(processedImageData)) {
        processedImageData = [processedImageData];
      }

      // Create simple folder for background removed images
      const bgRemovedFolder = `${RNFS.DocumentDirectoryPath}/bg_removed_images`;
      
      // Create folder
      await RNFS.mkdir(bgRemovedFolder, { NSURLIsExcludedFromBackupKey: true });
      this._log('info', 'Ensured output folder', { folder: bgRemovedFolder });

      // Process each image
      for (let i = 0; i < processedImageData.length; i++) {
        const imageData = processedImageData[i];
        // Minimal per-item diagnostics
        this._log('info', 'Processed image record', { index: i + 1, success: !!(imageData && imageData.success), hasProcessed: !!imageData?.processedImage });
        
        // Handle failed images
        if (!imageData.success || !imageData.processedImage) {
          console.log(`⚠️ Failed image ${i + 1}:`, imageData.error || 'No processed image');
          localImagePaths.push({
            uri: null,
            processedUri: null,
            photoNumber: imageData.index + 1 || i + 1,
            success: false,
            error: imageData.error || imageData.warning || 'No processed image',
            originalUri: null
          });
          continue;
        }
        
        // Simple filename with timestamp
        const timestamp = Date.now();
        const fileName = `bg_removed_${i + 1}_${timestamp}.png`;
        const originalFileName = `original_${i + 1}_${timestamp}.png`;
        const processedPath = `${bgRemovedFolder}/${fileName}`;
        const originalPath = `${bgRemovedFolder}/${originalFileName}`;

        try {
          // Save processed image from base64 data
          if (imageData.processedImage.startsWith('data:image')) {
            // Extract base64 data (remove data:image/png;base64, prefix)
            const base64Data = imageData.processedImage.split(',')[1];
            await RNFS.writeFile(processedPath, base64Data, 'base64');
            this._log('info', 'Saved processed image', { path: processedPath });
          } else {
            throw new Error('Invalid base64 image data');
          }

          // Save original image if available
          let originalUri = null;
          if (imageData.originalImage && imageData.originalImage.startsWith('data:image')) {
            const originalBase64Data = imageData.originalImage.split(',')[1];
            await RNFS.writeFile(originalPath, originalBase64Data, 'base64');
            originalUri = `file://${originalPath}`;
            this._log('info', 'Saved original image', { path: originalPath });
          }

          localImagePaths.push({
            uri: `file://${processedPath}`,
            processedUri: `file://${processedPath}`,
            photoNumber: imageData.index + 1 || i + 1,
            success: true,
            originalUri: originalUri,
            metadata: imageData.metadata,
            warning: imageData.warning
          });
          
        } catch (saveError) {
          this._log('error', 'Failed to save image', { index: i + 1, error: saveError?.message });
          localImagePaths.push({
            uri: null,
            processedUri: null,
            photoNumber: imageData.index + 1 || i + 1,
            success: false,
            error: `Failed to save image: ${saveError.message}`,
            originalUri: null
          });
        }
      }

      this._log('info', 'All images saved', { folder: bgRemovedFolder, count: localImagePaths.length });
      return localImagePaths;

    } catch (error) {
      this._log('error', 'Error saving processed images', { error: error?.message });
      throw error;
    }
  }

  async processBatch(images, onProgress = null, onStatusUpdate = null) {
    try {
      // reset cancel flag when starting a new job
      this.cancelRequested = false;
      this.currentJobId = null;
      const correlationId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
      const t0 = Date.now();
      this._lastProgressLog = 0;
      this._log('info', 'Batch start', { id: correlationId, images: images?.length || 0, baseUrl: CONFIG.getBaseUrl(), platform: Platform.OS });
      
      if (!images || images.length === 0) {
        throw new Error('No images provided for processing');
      }

      // Update status
      if (onStatusUpdate) {
        onStatusUpdate('Preparing images for background removal...');
      }

      // Client-side downscale/compress settings (analogous to PIL example)
      const CLIENT_MAX_DIM = 800; // px (longest side)
      const CLIENT_JPEG_QUALITY = 50; // 0-100

      // Create FormData for batch upload
      const formData = new FormData();
      
      // Capture client targets for result mapping (static/dynamic)
      const clientTargets = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const clientTarget = (typeof image === 'object' && image !== null) ? image.clientTarget || null : null;
        clientTargets.push(clientTarget);
        const rawUri = (typeof image === 'object' && image !== null) ? (image.uri || image.imageUri || image.path) : image;
        const imageUri = (rawUri || '').startsWith('file://') ? rawUri : (Platform.OS === 'android' && (rawUri || '').startsWith('/')) ? `file://${rawUri}` : rawUri;
        console.log(`📸 Adding image ${i + 1} to batch:`, imageUri ? imageUri.substring(0, 50) + '...' : 'No URI');

        let uploadUri = imageUri;
        let uploadName = `image_${(typeof image === 'object' && image?.photoNumber) || i}_${Date.now()}.jpg`;

        // Try to resize/compress on-device for faster upload
        try {
          const resized = await ImageResizer.createResizedImage(
            imageUri,
            CLIENT_MAX_DIM, // new width (max bound)
            CLIENT_MAX_DIM, // new height (max bound)
            'JPEG',         // output format
            CLIENT_JPEG_QUALITY, // quality 0-100
            0               // rotation
          );

          // createResizedImage returns { uri (iOS), path (Android), size, name }
          uploadUri = resized?.uri || (resized?.path ? (resized.path.startsWith('file://') ? resized.path : `file://${resized.path}`) : imageUri);
          if (resized?.name) uploadName = resized.name;
          console.log(`✅ Resized image ${i + 1}:`, {
            uri: uploadUri ? uploadUri.substring(0, 60) + '...' : 'No URI',
            quality: CLIENT_JPEG_QUALITY,
            maxDim: CLIENT_MAX_DIM
          });
        } catch (resizeErr) {
          console.warn(`⚠️ Resize failed for image ${i + 1}, using original`, resizeErr?.message || resizeErr);
        }
        
        // Create file object for upload
        const fileObject = {
          uri: uploadUri,
          type: 'image/jpeg',
          name: uploadName,
        };
        
        console.log(`📸 File object for image ${i + 1}:`, {
          uri: fileObject.uri ? fileObject.uri.substring(0, 50) + '...' : 'No URI',
          type: fileObject.type,
          name: fileObject.name
        });
        
        formData.append('images', fileObject);
        console.log(`📸 Added image ${i + 1} to FormData`);
      }
      
      console.log('📋 FormData created with', images.length, 'images');

      if (onStatusUpdate) {
        onStatusUpdate('Uploading images to server...');
      }
      
      if (onProgress) {
        onProgress(0.1); // 10% progress for upload preparation
      }

      // Configure fetch request for React Native
      const requestOptions = {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type manually for FormData in React Native
          // React Native will set it automatically with boundary
          'x-max-size': '800' // request lower-res processing on server (max dimension ~800px)
        },
        timeout: CONFIG.TIMEOUT,
      };

      this._log('info', 'POST /process-batch', { url: CONFIG.getBaseUrl() + CONFIG.ENDPOINTS.BATCH_PROCESS, parts: formData._parts ? formData._parts.length : undefined, timeout: requestOptions.timeout });
      
      if (onStatusUpdate) {
        onStatusUpdate('Processing images on server...');
      }

      // Make the API request
      const response = await this.fetchWithTimeout(
        CONFIG.getBaseUrl() + CONFIG.ENDPOINTS.BATCH_PROCESS,
        requestOptions
      );
      this._log('info', 'Batch enqueue response', { status: response.status, ok: response.ok });

      // The background removal server enqueues jobs and returns 202 with a jobId
      // Handle both asynchronous (202 + jobId) and synchronous (200 with data) servers
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        // If we can't parse JSON, log raw text for debugging
        const text = await response.text().catch(() => '');
        this._log('error', 'Invalid JSON from server', { text: (text || '').slice(0, 200) });
        throw new Error('Server returned invalid JSON response');
      }
      console.log('📋 Server response JSON:', responseData);

      // If async: expect 202 and a jobId
      if (response.status === 202 && responseData?.jobId) {
        const jobId = responseData.jobId;
        this.currentJobId = jobId;
        this._log('info', 'Job enqueued', { jobId });
        if (onStatusUpdate) onStatusUpdate('Images enqueued. Processing on server...');

        const jobResult = await this.pollJobUntilComplete(jobId, onProgress, onStatusUpdate);
        if (!jobResult?.success) {
          throw new Error(jobResult?.error || 'Background removal job failed');
        }
        const results = jobResult.results || jobResult.data?.results || [];
        this._log('info', 'Job results received', { count: results.length });

        // Save the processed images locally
        const savedImages = await this.saveProcessedImages(results);
        // Attach client target mapping by index
        const annotated = savedImages.map((s, idx) => ({ ...s, clientTarget: clientTargets[idx] }));
        if (onProgress) onProgress(1.0);
        if (onStatusUpdate) onStatusUpdate(`Processing complete! ${annotated.length} images processed successfully`);
        console.log('🎉 Batch processing complete:', annotated);
        return annotated;
      }

      // If sync: expect success + data with results
      if (!response.ok) {
        console.error('🔴 Server error response:', responseData);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!responseData || (!responseData.data && !responseData.success)) {
        console.error('🔴 Invalid response format:', responseData);
        throw new Error('Server returned unexpected response format');
      }

      const results = responseData.data?.results || responseData.results || [];
      this._log('info', 'Sync results received', { count: results.length });

      // Save the processed images locally
      const savedImages = await this.saveProcessedImages(results);
      // Attach client target mapping by original index order
      const annotated = savedImages.map((s, idx) => ({ ...s, clientTarget: clientTargets[idx] }));
      if (onProgress) onProgress(1.0);
      if (onStatusUpdate) {
        const successful = annotated.length;
        onStatusUpdate(`Processing complete! ${successful} images processed successfully`);
      }
      console.log('🎉 Batch processing complete:', annotated);
      return annotated;

    } catch (error) {
      this._log('error', 'Batch failed', { error: error?.message });
      if (onStatusUpdate) {
        onStatusUpdate(`Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Poll job status until completed or failed
   */
  async pollJobUntilComplete(jobId, onProgress, onStatusUpdate) {
    const base = CONFIG.getBaseUrl();
    const maxWaitMs = CONFIG.TIMEOUT; // reuse TIMEOUT as overall job timeout
    const intervalMs = 1500;
    const start = Date.now();

    let lastLoggedProgress = -10;
    let lastStatus = null;

    while (Date.now() - start < maxWaitMs) {
      if (this.cancelRequested) {
        if (onStatusUpdate) onStatusUpdate('Cancelling...');
        throw new Error('Cancelled by user');
      }
      try {
        const ts = Date.now();
        const statusRes = await this.fetchWithTimeout(`${base}/status/${jobId}?t=${ts}`, { method: 'GET', timeout: CONFIG.CONNECTION_TIMEOUT * 2, headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Accept': 'application/json', 'User-Agent': 'NarayanaApp/1.0' } });
        if (!statusRes.ok) {
          this._log('warn', 'Status poll non-200', { code: statusRes.status });
        } else {
          const statusJson = await statusRes.json();
          // statusJson: { success, id, status, progress, createdAt, updatedAt, result, error }
          if (typeof statusJson.progress === 'number' && onProgress) {
            // finer-grained progress from server value
            const frac = Math.max(0, Math.min(1, statusJson.progress / 100));
            onProgress(frac);
            // Log every 10% only
            if (statusJson.progress >= lastLoggedProgress + 10) {
              this._log('info', 'Progress', { jobId, progress: statusJson.progress });
              lastLoggedProgress = statusJson.progress;
            }
          }
          if (onStatusUpdate) {
            onStatusUpdate(`Server processing... ${statusJson.progress ?? 0}%`);
          }
          if (statusJson.status !== lastStatus) {
            this._log('info', 'Job status', { jobId, status: statusJson.status });
            lastStatus = statusJson.status;
          }
          if (statusJson.status === 'completed') {
            return statusJson.result || { success: true, results: [] };
          }
          if (statusJson.status === 'failed') {
            return { success: false, error: statusJson.error || 'Job failed' };
          }
        }
      } catch (e) {
        this._log('warn', 'Polling error', { error: e?.message });
      }
      // Wait before next poll
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error('Processing timed out while waiting for server');
  }

  /**
   * Request cancellation of the current job's polling
   */
  cancel() {
    if (this.currentJobId) {
      console.log('🛑 Cancellation requested for job:', this.currentJobId);
    } else {
      console.log('🛑 Cancellation requested (no active job id)');
    }
    this.cancelRequested = true;
  }

  /**
   * Fetch with timeout support
   * @private
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeout = options.timeout || CONFIG.TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Remove our custom timeout property before passing to fetch
      const { timeout: _, ...fetchOptions } = options;
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        this._log('error', 'Request timeout', { url });
        throw new Error('Request timeout - server took too long to respond');
      }
      this._log('error', 'Request failed', { url, error: error?.message });
      throw error;
    }
  }

  /**
   * Test multiple server URLs to find a working connection
   * @returns {Promise<string|null>} Working server URL or null
   */
  async findWorkingServer() {
    const serverUrls = CONFIG.getServerUrls();
    this._log('info', 'Testing server URLs', { count: serverUrls.length });
    
    for (const serverUrl of serverUrls) {
      try {
        const response = await this.fetchWithTimeout(serverUrl + '/health', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'NarayanaApp/1.0',
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.CONNECTION_TIMEOUT
        });
        
        if (response.ok) {
          if (!CONFIG.SERVER_URL) {
            CONFIG.SERVER_URL = serverUrl; // Update if not already configured
          }
          this._log('info', 'Server OK', { url: serverUrl });
          return serverUrl;
        }
        this._log('warn', 'Server health not OK', { url: serverUrl, status: response.status });
      } catch (error) {
        this._log('warn', 'Server test error', { url: serverUrl, error: error?.message });
      }
    }
    
    this._log('error', 'No working server found');
    return null;
  }

  /**
   * Test server connectivity
   * @returns {Promise<boolean>} True if server is reachable
   */
  async testConnection() {
    const workingServer = await this.findWorkingServer();
    this._log('info', 'Connectivity', { ok: workingServer !== null, url: workingServer });
    return workingServer !== null;
  }

  /**
   * Test basic HTTP connectivity (for debugging)
   * @returns {Promise<boolean>} True if basic HTTP works
   */
  async testBasicConnectivity() {
    try {
      const testUrl = 'https://httpbin.org/get';
      const response = await fetch(testUrl, {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get server configuration and status
   * @returns {Object} Configuration object
   */
  getConfig() {
    return {
      serverUrl: CONFIG.getBaseUrl(),
      configuredUrl: CONFIG.SERVER_URL,
      isDevelopment: !CONFIG.SERVER_URL,
      timeout: CONFIG.TIMEOUT,
      maxRetries: CONFIG.MAX_RETRIES,
      availableUrls: CONFIG.getServerUrls()
    };
  }
}

// Create and export singleton instance
const backgroundRemovalService = new BackgroundRemovalService();
export default backgroundRemovalService;

// Export class for testing purposes
export { BackgroundRemovalService };