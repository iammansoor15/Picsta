import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import AppConfig from '../config/AppConfig';
import { computeContainTransform, mapOverlaysToVideo, mapOverlayToVideo } from '../utils/overlayGeometry';

/**
 * Video Composite Service
 *
 * Composites a template video with the user's photo/text/banner overlays for save/share.
 *
 * Two implementations, selected by AppConfig.VIDEO_RENDERING.USE_CLIENT_SIDE:
 *  - compositeVideoOnServer: uploads overlays + delegates the whole render to the backend
 *    (FFmpeg). This is the original, proven implementation - untouched.
 *  - compositeVideoOnDevice: renders entirely on-device via a native module
 *    (NativeModules.VideoComposer - Media3 Transformer on Android, AVFoundation on iOS).
 *    No upload/download round-trip, preserves audio, avoids server load.
 *
 * compositeVideo() is the single public entry point HeroScreen calls; it picks the
 * implementation and (optionally) falls back to the server path if the on-device path
 * throws, so flipping the flag on can never turn into a hard failure for users.
 */
class VideoCompositeService {
  /**
   * Composite video with overlays. Picks client-side or server-side rendering based on
   * AppConfig.VIDEO_RENDERING, with an automatic fallback to the server path if the
   * on-device render fails and FALLBACK_TO_SERVER is enabled.
   */
  async compositeVideo(options) {
    const useClientSide = AppConfig?.VIDEO_RENDERING?.USE_CLIENT_SIDE === true;
    const fallbackToServer = AppConfig?.VIDEO_RENDERING?.FALLBACK_TO_SERVER !== false;

    if (!useClientSide) {
      return this.compositeVideoOnServer(options);
    }

    try {
      return await this.compositeVideoOnDevice(options);
    } catch (error) {
      console.error('❌ On-device video composite failed:', error.message);
      if (!fallbackToServer) {
        throw error;
      }
      console.warn('⚠️ Falling back to server-side video composite...');
      return this.compositeVideoOnServer(options);
    }
  }

  // ==========================================================================
  // On-device rendering (native module: Media3 Transformer / AVFoundation)
  // ==========================================================================

  /**
   * Composite video with overlays entirely on-device, using the native VideoComposer
   * module. No photos/banner/video leave the device.
   */
  async compositeVideoOnDevice(options) {
    const startTime = Date.now();
    const requestId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const {
      videoUrl,
      localVideoUri = null, // optional: caller-provided local cache of videoUrl, skips the download
      photos = [],
      texts = [],
      bannerUri = null,
      bannerX = 0,
      bannerY = 0,
      bannerWidth = null,
      bannerHeight = null,
      containerWidth,
      containerHeight,
    } = options;

    console.log('\n' + '='.repeat(60));
    console.log(`🎬 [${requestId}] ON-DEVICE VIDEO COMPOSITE REQUEST`);
    console.log('='.repeat(60));

    const VideoComposer = this.getNativeVideoComposer();

    // 1. Resolve the source video to a local file.
    const localVideoPath = localVideoUri
      ? this.stripFileScheme(localVideoUri)
      : await this.downloadToLocalFile(videoUrl, `source_${requestId}.mp4`);

    // 2. Probe the video's real pixel dimensions - overlay math must target these, not
    //    the container's CSS/layout size (see overlayGeometry.js).
    const {
      width: videoWidth,
      height: videoHeight,
      rotation: videoRotation = 0,
    } = await VideoComposer.getVideoInfo(localVideoPath);
    console.log(
      `   Video: ${videoWidth}x${videoHeight}, rotation=${videoRotation}, ` +
      `Container: ${containerWidth}x${containerHeight}`
    );

    const transform = computeContainTransform(containerWidth, containerHeight, videoWidth, videoHeight);

    // 3. Map every overlay from container space into video-pixel space, and make sure
    //    every overlay image is a local file (download any remote ones - local photos
    //    picked from the device already are).
    const mappedPhotos = [];
    for (const photo of photos) {
      const localUri = await this.ensureLocalFile(photo.uri, `photo_${requestId}_${mappedPhotos.length}`);
      mappedPhotos.push(mapOverlayToVideo({ ...photo, uri: localUri }, transform));
    }

    const mappedTexts = mapOverlaysToVideo(texts, transform);

    let mappedBanner = null;
    if (bannerUri) {
      const localBannerUri = await this.ensureLocalFile(bannerUri, `banner_${requestId}`);
      mappedBanner = mapOverlayToVideo(
        {
          uri: localBannerUri,
          x: bannerX,
          y: bannerY,
          width: bannerWidth || containerWidth,
          height: bannerHeight || containerWidth / 5,
        },
        transform
      );
    }

    // 4. Render.
    const outputPath = `${RNFS.DocumentDirectoryPath}/composite_device_${Date.now()}.mp4`;

    console.log(`🎬 [${requestId}] Compositing on-device...`);
    console.log(`   Photos: ${mappedPhotos.length}, Texts: ${mappedTexts.length}, Banner: ${mappedBanner ? 'yes' : 'no'}`);
    console.log('   Photo overlays:', mappedPhotos.map(({ uri, x, y, width, height, shape, resizeMode }) => ({
      uri,
      x,
      y,
      width,
      height,
      shape,
      resizeMode,
    })));
    console.log('   Text overlays:', mappedTexts.map(({ text, x, y, width, height, fontSize, textAlign, backgroundColor }) => ({
      text,
      x,
      y,
      width,
      height,
      fontSize,
      textAlign,
      backgroundColor,
    })));

    const renderStart = Date.now();
    await VideoComposer.composite({
      inputPath: localVideoPath,
      outputPath,
      width: videoWidth,
      height: videoHeight,
      photos: mappedPhotos.map(p => ({
        path: p.uri,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        shape: p.shape || 'square',
        borderRadius: p.borderRadius || 0,
        resizeMode: p.resizeMode || 'cover',
        rotation: p.rotation || 0,
      })),
      texts: mappedTexts.map(t => ({
        text: t.text,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        fontSize: t.fontSize,
        color: t.color || '#000000',
        fontWeight: t.fontWeight || 'normal',
        fontFamily: t.fontFamily || null,
        backgroundColor: t.backgroundColor || 'transparent',
        textAlign: t.textAlign || 'center',
        rotation: t.rotation || 0,
      })),
      banner: mappedBanner
        ? {
            path: mappedBanner.uri,
            x: mappedBanner.x,
            y: mappedBanner.y,
            width: mappedBanner.width,
            height: mappedBanner.height,
            resizeMode: 'cover',
          }
        : null,
    });

    const renderTime = Date.now() - renderStart;
    const totalTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] On-device render complete in ${renderTime}ms (total ${totalTime}ms)`);
    console.log(`   Output: ${outputPath}`);
    console.log('='.repeat(60) + '\n');

    return outputPath;
  }

  /** Looks up the native module, with a clear error if it isn't linked yet. */
  getNativeVideoComposer() {
    const VideoComposer = NativeModules.VideoComposer;
    if (!VideoComposer) {
      throw new Error(
        'Native VideoComposer module not found. It must be added natively ' +
        '(Android: Media3 Transformer, iOS: AVFoundation) before USE_CLIENT_SIDE can be enabled.'
      );
    }
    return VideoComposer;
  }

  /** Strips a leading file:// scheme - native filesystem APIs expect a plain path. */
  stripFileScheme(uri) {
    return typeof uri === 'string' ? uri.replace(/^file:\/\//, '') : uri;
  }

  /** Downloads a remote URL to a local temp file and returns the plain filesystem path. */
  async downloadToLocalFile(url, filename) {
    const toFile = `${RNFS.CachesDirectoryPath}/${filename}`;
    const result = await RNFS.downloadFile({ fromUrl: url, toFile }).promise;
    if (result.statusCode !== 200) {
      throw new Error(`Failed to download ${url}: HTTP ${result.statusCode}`);
    }
    return toFile;
  }

  /**
   * Ensures a URI points to a local file, downloading it first if it's remote.
   * Local file:// URIs just get their scheme stripped.
   */
  async ensureLocalFile(uri, filenameIfRemote) {
    if (!uri) return uri;
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const ext = uri.split('.').pop().split('?')[0].toLowerCase();
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      return this.downloadToLocalFile(uri, `${filenameIfRemote}.${safeExt}`);
    }
    if (uri.startsWith('content://')) {
      return uri;
    }
    const localPath = this.stripFileScheme(uri);
    const exists = await RNFS.exists(localPath);
    if (!exists) {
      throw new Error(`Overlay image does not exist or is unreadable: ${uri}`);
    }
    return localPath;
  }

  // ==========================================================================
  // Server-side rendering (existing FFmpeg backend) - unchanged behavior
  // ==========================================================================

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
  async compositeVideoOnServer(options) {
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
            // Default to black text if no explicit color is provided
            color: t.color || '#000000'
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
}

export default new VideoCompositeService();
