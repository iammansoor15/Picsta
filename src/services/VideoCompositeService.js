import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';

/**
 * Video Composite Service
 * Uses FFmpeg to overlay user photos and text onto video templates
 */
class VideoCompositeService {
  /**
   * Composite user photos and text onto a video template
   * @param {Object} options - Composite options
   * @param {string} options.videoUrl - URL of the video template
   * @param {Array} options.photos - Array of photo objects {uri, x, y, width, height}
   * @param {Array} options.texts - Array of text objects {text, x, y, fontSize, color}
   * @param {string} options.bannerUri - Optional banner image URI
   * @param {number} options.containerWidth - Template container width
   * @param {number} options.containerHeight - Template container height
   * @returns {Promise<string>} Path to the output video file
   */
  async compositeVideo(options) {
    const {
      videoUrl,
      photos = [],
      texts = [],
      bannerUri = null,
      containerWidth,
      containerHeight,
    } = options;

    try {
      console.log('🎬 Starting video composite:', {
        videoUrl: videoUrl?.substring(0, 60),
        photosCount: photos.length,
        textsCount: texts.length,
        hasBanner: !!bannerUri,
        dimensions: `${containerWidth}x${containerHeight}`
      });

      // Step 1: Download the video template to temp storage
      const timestamp = Date.now();
      const tempVideoPath = `${RNFS.CachesDirectoryPath}/template_${timestamp}.mp4`;
      
      console.log('📥 Downloading template video...');
      const downloadResult = await RNFS.downloadFile({
        fromUrl: videoUrl,
        toFile: tempVideoPath,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`Failed to download video: ${downloadResult.statusCode}`);
      }

      console.log('✅ Video downloaded:', tempVideoPath);

      // Step 2: Build FFmpeg filter complex command
      const outputPath = `${RNFS.DocumentDirectoryPath}/output_${timestamp}.mp4`;
      let filterComplex = [];
      let inputFiles = ['-i', tempVideoPath];
      let inputIndex = 1; // Start from 1 (0 is the video)

      // Add photo inputs
      const photoInputs = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (photo.uri) {
          const photoPath = photo.uri.replace('file://', '');
          inputFiles.push('-i', photoPath);
          photoInputs.push({ index: inputIndex++, ...photo });
        }
      }

      // Add banner input
      let bannerIndex = -1;
      if (bannerUri) {
        const bannerPath = bannerUri.replace('file://', '');
        inputFiles.push('-i', bannerPath);
        bannerIndex = inputIndex++;
      }

      // Build filter complex string
      let previousOutput = '[0:v]';

      // Overlay photos
      for (let i = 0; i < photoInputs.length; i++) {
        const photo = photoInputs[i];
        const inputIdx = photo.index;
        const outputName = i === photoInputs.length - 1 && !bannerUri ? 'out' : `tmp${i}`;
        
        // Scale and position the photo
        // FFmpeg overlay syntax: [background][overlay]overlay=x:y[output]
        const scaleFilter = `[${inputIdx}:v]scale=${photo.width}:${photo.height}[scaled${i}]`;
        const overlayFilter = `${previousOutput}[scaled${i}]overlay=${photo.x}:${photo.y}[${outputName}]`;
        
        filterComplex.push(scaleFilter);
        filterComplex.push(overlayFilter);
        previousOutput = `[${outputName}]`;
      }

      // Overlay banner
      if (bannerIndex >= 0) {
        const bannerWidth = containerWidth;
        const bannerHeight = Math.floor(containerWidth / 5); // 5:1 aspect ratio
        
        const scaleFilter = `[${bannerIndex}:v]scale=${bannerWidth}:${bannerHeight}[scaled_banner]`;
        const overlayFilter = `${previousOutput}[scaled_banner]overlay=0:0[out]`;
        
        filterComplex.push(scaleFilter);
        filterComplex.push(overlayFilter);
      }

      // Add text overlays using drawtext filter
      if (texts.length > 0) {
        const textFilters = texts.map((text, i) => {
          const escapedText = text.text.replace(/'/g, "\\\\'").replace(/:/g, '\\\\:');
          const color = text.color || '#FFFFFF';
          const fontSize = text.fontSize || 24;
          
          return `drawtext=text='${escapedText}':x=${text.x}:y=${text.y}:fontsize=${fontSize}:fontcolor=${color}:borderw=2:bordercolor=black`;
        }).join(',');

        if (filterComplex.length > 0) {
          filterComplex[filterComplex.length - 1] = filterComplex[filterComplex.length - 1].replace('[out]', '[tmp_text]');
          filterComplex.push(`[tmp_text]${textFilters}[out]`);
        } else {
          filterComplex.push(`${previousOutput}${textFilters}[out]`);
        }
      }

      // Ensure we have an output
      if (filterComplex.length === 0) {
        // No overlays, just copy the video
        filterComplex.push('[0:v]copy[out]');
      }

      // Build final FFmpeg command
      const filterComplexStr = filterComplex.join(';');
      const command = [
        ...inputFiles,
        '-filter_complex', filterComplexStr,
        '-map', '[out]',
        '-map', '0:a?', // Copy audio if present
        '-c:v', 'libx264', // Video codec
        '-preset', 'fast', // Encoding preset
        '-c:a', 'copy', // Copy audio without re-encoding
        '-y', // Overwrite output file
        outputPath
      ];

      console.log('🎬 FFmpeg command:', command.join(' '));

      // Execute FFmpeg command
      const session = await FFmpegKit.execute(command.join(' '));
      const returnCode = await session.getReturnCode();

      if (!ReturnCode.isSuccess(returnCode)) {
        const output = await session.getOutput();
        const failStackTrace = await session.getFailStackTrace();
        console.error('❌ FFmpeg failed:', { output, failStackTrace });
        throw new Error(`FFmpeg processing failed with code ${returnCode}`);
      }

      console.log('✅ Video composite complete:', outputPath);

      // Clean up temp video
      try {
        await RNFS.unlink(tempVideoPath);
      } catch (e) {
        console.warn('Failed to clean up temp video:', e);
      }

      return outputPath;

    } catch (error) {
      console.error('❌ Video composite error:', error);
      throw error;
    }
  }

  /**
   * Get video information using FFprobe
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Video information
   */
  async getVideoInfo(videoPath) {
    try {
      const session = await FFmpegKit.execute(`-i ${videoPath}`);
      const output = await session.getOutput();
      
      // Parse duration, resolution, etc. from FFmpeg output
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
      const resolutionMatch = output.match(/(\d{3,4})x(\d{3,4})/);
      
      return {
        duration: durationMatch ? `${durationMatch[1]}:${durationMatch[2]}:${durationMatch[3]}` : 'unknown',
        width: resolutionMatch ? parseInt(resolutionMatch[1]) : null,
        height: resolutionMatch ? parseInt(resolutionMatch[2]) : null,
        output
      };
    } catch (error) {
      console.error('Error getting video info:', error);
      return null;
    }
  }
}

export default new VideoCompositeService();
