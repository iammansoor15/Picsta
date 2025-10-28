import { transparentBackground } from 'transparent-background';
import RNFS from 'react-native-fs';

export class ImageProcessor {
  static async removeBackground(imageUri) {
    try {
      // Create directory if it doesn't exist
      const dirPath = `${RNFS.DocumentDirectoryPath}/extracted_images/background_removed_images`;
      await RNFS.mkdir(dirPath, { NSURLIsExcludedFromBackupKey: true });

      // Read the input image
      const inputBuffer = await RNFS.readFile(imageUri, 'base64');

      // Process the image
      const outputBuffer = await transparentBackground(
        Buffer.from(inputBuffer, 'base64'),
        'png',
        { fast: false }
      );

      // Generate unique filename
      const fileName = `bg_removed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
      const outputPath = `${dirPath}/${fileName}`;

      // Save the processed image
      await RNFS.writeFile(outputPath, outputBuffer.toString('base64'), 'base64');

      return {
        uri: `file://${outputPath}`,
        success: true
      };
    } catch (error) {
      console.error('❌ Error processing image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}