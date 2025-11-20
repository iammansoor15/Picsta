import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

/**
 * VideoPrefetchManager - Singleton service to manage video prefetching
 * Handles downloading, caching, and tracking of video files for smooth playback
 */
class VideoPrefetchManager {
  constructor() {
    // Track download state for each video URL
    this.downloadQueue = new Map(); // url -> { promise, progress, status, localPath }
    this.cacheDir = RNFS.CachesDirectoryPath;

    // Status constants
    this.STATUS = {
      IDLE: 'idle',
      DOWNLOADING: 'downloading',
      COMPLETED: 'completed',
      FAILED: 'failed',
    };
  }

  /**
   * Generate consistent cache filename from video URL
   */
  _generateCacheFilename(videoUrl, serialNo, index) {
    const urlHash = videoUrl.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    return `video_cache_${serialNo || index}_${Math.abs(urlHash)}.mp4`;
  }

  /**
   * Get local file path for video
   */
  _getLocalPath(videoUrl, serialNo, index) {
    const filename = this._generateCacheFilename(videoUrl, serialNo, index);
    const path = `${this.cacheDir}/${filename}`;
    return Platform.OS === 'android' ? `file://${path}` : path;
  }

  /**
   * Get raw file path (without file:// protocol)
   */
  _getRawPath(videoUrl, serialNo, index) {
    const filename = this._generateCacheFilename(videoUrl, serialNo, index);
    return `${this.cacheDir}/${filename}`;
  }

  /**
   * Check if video is already cached
   */
  async isCached(videoUrl, serialNo, index) {
    try {
      const rawPath = this._getRawPath(videoUrl, serialNo, index);
      const exists = await RNFS.exists(rawPath);

      if (exists) {
        // Verify file has content
        const stat = await RNFS.stat(rawPath);
        return stat.size > 0;
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking cache:', error);
      return false;
    }
  }

  /**
   * Get cached video URI if available
   */
  async getCachedUri(videoUrl, serialNo, index) {
    const isCached = await this.isCached(videoUrl, serialNo, index);
    if (isCached) {
      return this._getLocalPath(videoUrl, serialNo, index);
    }
    return null;
  }

  /**
   * Check if video is currently being downloaded
   */
  isDownloading(videoUrl) {
    const download = this.downloadQueue.get(videoUrl);
    return download && download.status === this.STATUS.DOWNLOADING;
  }

  /**
   * Get download progress for a video (0-1)
   */
  getProgress(videoUrl) {
    const download = this.downloadQueue.get(videoUrl);
    return download ? download.progress : 0;
  }

  /**
   * Prefetch a video for future playback
   */
  async prefetchVideo(videoUrl, serialNo, index, priority = 0) {
    if (!videoUrl) {
      console.warn('⚠️ No video URL provided for prefetch');
      return null;
    }

    // Check if already cached
    const cachedUri = await this.getCachedUri(videoUrl, serialNo, index);
    if (cachedUri) {
      console.log(`✅ Video already cached: index ${index}`);
      return cachedUri;
    }

    // Check if already downloading
    if (this.isDownloading(videoUrl)) {
      console.log(`🔄 Video already downloading: index ${index}`);
      const download = this.downloadQueue.get(videoUrl);
      return download.promise;
    }

    // Start new download
    console.log(`📥 Prefetching video: index ${index}, serial ${serialNo}`);

    const rawPath = this._getRawPath(videoUrl, serialNo, index);
    const localUri = this._getLocalPath(videoUrl, serialNo, index);

    const downloadInfo = {
      progress: 0,
      status: this.STATUS.DOWNLOADING,
      localPath: localUri,
      promise: null,
    };

    this.downloadQueue.set(videoUrl, downloadInfo);

    const downloadPromise = new Promise((resolve, reject) => {
      const download = RNFS.downloadFile({
        fromUrl: videoUrl,
        toFile: rawPath,
        progressDivider: 20,
        begin: (res) => {
          console.log(`🔄 Prefetch started: index ${index}, size ${(res.contentLength / 1024 / 1024).toFixed(2)}MB`);
        },
        progress: (res) => {
          const progress = res.bytesWritten / res.contentLength;
          downloadInfo.progress = progress;

          // Log every 25%
          if (progress % 0.25 < 0.05) {
            console.log(`📊 Prefetch progress: index ${index}, ${(progress * 100).toFixed(0)}%`);
          }
        },
      });

      download.promise
        .then((result) => {
          if (result.statusCode === 200) {
            console.log(`✅ Prefetch completed: index ${index}`);
            downloadInfo.status = this.STATUS.COMPLETED;
            resolve(localUri);
          } else {
            console.error(`❌ Prefetch failed: index ${index}, status ${result.statusCode}`);
            downloadInfo.status = this.STATUS.FAILED;
            this.downloadQueue.delete(videoUrl);
            reject(new Error(`Download failed with status ${result.statusCode}`));
          }
        })
        .catch((error) => {
          console.error(`❌ Prefetch error: index ${index}`, error);
          downloadInfo.status = this.STATUS.FAILED;
          this.downloadQueue.delete(videoUrl);
          reject(error);
        });
    });

    downloadInfo.promise = downloadPromise;
    return downloadPromise;
  }

  /**
   * Cancel a download in progress
   */
  async cancelPrefetch(videoUrl) {
    const download = this.downloadQueue.get(videoUrl);
    if (download && download.status === this.STATUS.DOWNLOADING) {
      console.log('🛑 Cancelling prefetch:', videoUrl.substring(0, 60));
      // Note: react-native-fs doesn't provide a way to cancel ongoing downloads
      // We just remove from queue and let it finish in background
      this.downloadQueue.delete(videoUrl);
    }
  }

  /**
   * Get all cached video URIs
   */
  async getAllCachedVideos() {
    try {
      const files = await RNFS.readDir(this.cacheDir);
      const videoFiles = files.filter(file =>
        file.name.startsWith('video_cache_') && file.name.endsWith('.mp4')
      );
      return videoFiles.map(file =>
        Platform.OS === 'android' ? `file://${file.path}` : file.path
      );
    } catch (error) {
      console.error('❌ Error reading cache directory:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const files = await RNFS.readDir(this.cacheDir);
      const videoFiles = files.filter(file =>
        file.name.startsWith('video_cache_') && file.name.endsWith('.mp4')
      );

      const totalSize = videoFiles.reduce((sum, file) => sum + parseInt(file.size || 0), 0);

      return {
        count: videoFiles.length,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        totalSizeBytes: totalSize,
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { count: 0, totalSizeMB: 0, totalSizeBytes: 0 };
    }
  }

  /**
   * Clear all cached videos
   */
  async clearCache() {
    try {
      console.log('🗑️ Clearing video cache...');
      const files = await RNFS.readDir(this.cacheDir);
      const videoFiles = files.filter(file =>
        file.name.startsWith('video_cache_') && file.name.endsWith('.mp4')
      );

      for (const file of videoFiles) {
        await RNFS.unlink(file.path);
      }

      this.downloadQueue.clear();
      console.log(`✅ Cleared ${videoFiles.length} cached videos`);
      return videoFiles.length;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Remove specific cached video
   */
  async removeCachedVideo(videoUrl, serialNo, index) {
    try {
      const rawPath = this._getRawPath(videoUrl, serialNo, index);
      const exists = await RNFS.exists(rawPath);

      if (exists) {
        await RNFS.unlink(rawPath);
        console.log(`🗑️ Removed cached video: index ${index}`);
        this.downloadQueue.delete(videoUrl);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error removing cached video:', error);
      return false;
    }
  }
}

// Export singleton instance
const videoPrefetchManager = new VideoPrefetchManager();
export default videoPrefetchManager;
