import RNFS from 'react-native-fs';
import AppConfig from '../config/AppConfig';

/**
 * Video Composite Service
 * Processes video with overlays using backend FFmpeg service.
 */
class VideoCompositeService {
  /**
   * Record video with overlays by capturing frames
   * @param {Object} options - Recording options
   * @param {Function} options.captureCallback - ViewShot capture function
   * @param {Function} options.getVideoRef - Function to get video player ref
   * @param {number} options.videoDuration - Video duration in seconds
   * @param {number} options.fps - Frames per second to capture (default: 10)
   * @returns {Promise<Array>} Array of captured frame paths
   */
  async recordVideoFrames(options) {
    const { 
      captureCallback, 
      getVideoRef, 
      videoDuration = 5,
      fps = 10 
    } = options;

    console.log('🎬 Recording video with overlays...', { duration: videoDuration, fps });

    try {
      if (!captureCallback) {
        throw new Error('Capture callback not provided');
      }

      if (!getVideoRef || !getVideoRef()) {
        throw new Error('Video ref not available');
      }

      const videoRef = getVideoRef();
      const framePaths = [];
      const frameInterval = 1000 / fps; // milliseconds between frames
      const totalFrames = Math.ceil(videoDuration * fps);

      console.log(`🎬 Will capture ${totalFrames} frames at ${fps} fps`);

      // Seek to start and play
      videoRef.seek(0);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture frames while video plays
      for (let i = 0; i < totalFrames; i++) {
        const currentTime = i / fps;
        
        // Seek to exact frame
        videoRef.seek(currentTime);
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for seek

        // Capture this frame
        const framePath = await captureCallback();
        framePaths.push(framePath);
        
        console.log(`📸 Captured frame ${i + 1}/${totalFrames} at ${currentTime.toFixed(2)}s`);
      }

      console.log(`✅ Recorded ${framePaths.length} frames`);
      return framePaths;

    } catch (error) {
      console.error('❌ Video recording error:', error);
      throw error;
    }
  }

  /**
   * Stitch captured frames into a video
   * NOTE: This requires FFmpeg or a video encoding library.
   * For now, this returns the frame paths and shows instructions.
   */
  async stitchFramesToVideo(framePaths, outputPath, fps = 10) {
    console.warn('⚠️ Video stitching requires FFmpeg or similar tool.');
    console.log('Frame paths saved for manual stitching:', framePaths);
    
    // Save frame paths to a file for reference
    const frameListPath = `${RNFS.DocumentDirectoryPath}/frames_${Date.now()}.json`;
    await RNFS.writeFile(frameListPath, JSON.stringify(framePaths, null, 2));
    
    throw new Error(
      'Video stitching not yet implemented. ' +
      `${framePaths.length} frames captured and saved. ` +
      'Frame list saved at: ' + frameListPath
    );
  }

  /**
   * Upload a local photo to backend and get URL
   */
  async uploadPhotoToBackend(photoUri, requestId) {
    try {
      const backendUrl = this.getBackendUrl();
      const uploadEndpoint = `${backendUrl}/api/videos/upload-photo`;
      
      // Clean file:// prefix
      const filePath = photoUri.replace(/^file:\/\//, '');
      
      console.log(`   📷 Uploading photo: ${filePath.substring(0, 50)}...`);
      
      // Read file as base64
      const base64Data = await RNFS.readFile(filePath, 'base64');
      
      // Determine file extension
      const ext = filePath.split('.').pop().toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      
      // Upload to backend
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo: base64Data,
          mimeType,
          requestId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`   ✅ Photo uploaded: ${result.url?.substring(0, 50)}...`);
      return result.url;
    } catch (error) {
      console.error(`   ❌ Photo upload failed:`, error.message);
      throw error;
    }
  }

  /**
   * Composite video with overlays using backend processing
   */
  async compositeVideo(options) {
    const startTime = Date.now();
    const requestId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const {
      videoUrl,
      photos = [],
      texts = [],
      bannerUri = null,
      bannerX = 0,
      bannerY = 0,
      bannerWidth = null,
      bannerHeight = null,
      containerWidth,
      containerHeight
    } = options;

    console.log('\n' + '='.repeat(60));
    console.log(`🎬 [${requestId}] VIDEO COMPOSITE REQUEST`);
    console.log('='.repeat(60));
    console.log(`📋 Request details:`);
    console.log(`   Video: ${videoUrl?.substring(0, 60)}...`);
    console.log(`   Photos: ${photos.length}`);
    console.log(`   Texts: ${texts.length}`);
    console.log(`   Banner: ${bannerUri ? 'Yes' : 'No'}`);
    console.log(`   Dimensions: ${containerWidth}x${containerHeight}`);

    try {
      // Upload local photos to backend first
      const processedPhotos = [];
      if (photos.length > 0) {
        console.log(`\n📷 [${requestId}] Uploading ${photos.length} photo(s) to backend...`);
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          let photoUrl = photo.uri;
          
          // If it's a local file://, upload it first
          if (photoUrl && photoUrl.startsWith('file://')) {
            photoUrl = await this.uploadPhotoToBackend(photoUrl, requestId);
          }
          
          processedPhotos.push({
            ...photo,
            uri: photoUrl
          });
        }
      }
      
      // Upload banner if it's local
      let processedBannerUri = bannerUri;
      if (bannerUri && bannerUri.startsWith('file://')) {
        console.log(`\n🏳️ [${requestId}] Uploading banner to backend...`);
        processedBannerUri = await this.uploadPhotoToBackend(bannerUri, requestId);
      }
      
      // Send request to backend for video processing
      const backendUrl = this.getBackendUrl();
      const endpoint = `${backendUrl}/api/videos/composite`;

      console.log(`\n📤 [${requestId}] Sending request to backend...`);
      console.log(`   Endpoint: ${endpoint}`);

      const fetchStart = Date.now();
      
      const payload = {
        videoUrl,
        overlays: {
          photos: processedPhotos.map(p => ({
            uri: p.uri,
            x: Math.round(p.x || 0),
            y: Math.round(p.y || 0),
            width: Math.round(p.width || 0),
            height: Math.round(p.height || 0)
          })),
          texts: texts.map(t => ({
            text: t.text,
            x: Math.round(t.x || 0),
            y: Math.round(t.y || 0),
            fontSize: t.fontSize || 24,
            color: t.color || '#FFFFFF'
          })),
          banner: processedBannerUri ? {
            uri: processedBannerUri,
            x: Math.round(bannerX),
            y: Math.round(bannerY),
            width: Math.round(bannerWidth || containerWidth),
            height: Math.round(bannerHeight || containerWidth / 5)
          } : null
        },
        dimensions: {
          width: Math.round(containerWidth),
          height: Math.round(containerHeight)
        }
      };
      
      console.log(`   Payload size: ${JSON.stringify(payload).length} bytes`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const fetchTime = Date.now() - fetchStart;
      console.log(`✅ [${requestId}] Backend responded in ${fetchTime}ms with status ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${requestId}] Backend error:`, errorText);
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      const processedVideoUrl = result.videoUrl || result.url;
      const backendProcessingTime = result.processingTime;

      if (!processedVideoUrl) {
        throw new Error('Backend did not return processed video URL');
      }

      console.log(`\n📥 [${requestId}] Downloading processed video...`);
      console.log(`   Backend processing: ${backendProcessingTime}ms`);
      console.log(`   URL: ${processedVideoUrl.substring(0, 60)}...`);

      // Download the processed video
      const timestamp = Date.now();
      const outputPath = `${RNFS.DocumentDirectoryPath}/composite_${timestamp}.mp4`;

      const downloadStart = Date.now();
      console.log(`   Downloading to: ${outputPath}`);

      const downloadResult = await RNFS.downloadFile({
        fromUrl: processedVideoUrl,
        toFile: outputPath,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        console.error(`❌ [${requestId}] Download failed with status ${downloadResult.statusCode}`);
        throw new Error(`Download failed: ${downloadResult.statusCode}`);
      }

      const downloadTime = Date.now() - downloadStart;
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ [${requestId}] Video downloaded in ${downloadTime}ms`);
      console.log(`\n🎉 [${requestId}] VIDEO COMPOSITE SUCCESS`);
      console.log(`   Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`   Output: ${outputPath}`);
      console.log('='.repeat(60) + '\n');
      
      return outputPath;

    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`\n❌ [${requestId}] VIDEO COMPOSITE FAILED after ${errorTime}ms`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack:`, error.stack);
      console.log('='.repeat(60) + '\n');
      
      // If backend fails, show helpful error
      if (error.message.includes('Backend') || error.message.includes('fetch')) {
        throw new Error(
          'Video processing backend is not available. ' +
          'Please contact support or try again later.'
        );
      }
      
      throw error;
    }
  }

  /**
   * Get backend URL for video processing
   */
  getBackendUrl() {
    const devUrl = AppConfig?.DEVELOPMENT?.DEV_SERVER_URL;
    const prodUrl = AppConfig?.PRODUCTION_SERVER_URL;
    
    // Try dev first, then prod
    if (devUrl && devUrl.trim()) {
      return devUrl.replace(/\/$/, '');
    }
    
    if (prodUrl && prodUrl.trim()) {
      return prodUrl.replace(/\/$/, '');
    }
    
    // Fallback
    return 'http://10.0.2.2:10000'; // Android emulator
  }

  /**
   * Get video information using FFprobe
   * STUB: Returns placeholder info since FFmpeg is not available
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Video information
   */
  async getVideoInfo(videoPath) {
    console.warn('⚠️ getVideoInfo is a stub (FFmpeg not available)');
    return {
      duration: 'unknown',
      width: null,
      height: null,
      output: 'FFmpeg not available'
    };
  }
}

export default new VideoCompositeService();
