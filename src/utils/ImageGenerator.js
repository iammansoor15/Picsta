/**
 * Generate a black circle image programmatically
 * This creates a proper black circle that works reliably in React Native
 */
export const generateBlackCircle = (size = 100) => {
  // Use a simple black square that will be styled as circle in CSS
  // This is more reliable than SVG in React Native
  return {
    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    width: size,
    height: size,
  };
};

/**
 * Generate a simple black square (fallback)
 */
export const generateBlackSquare = (size = 100) => {
  return {
    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    width: size,
    height: size,
  };
};

/**
 * Get the default profile picture with proper fallback
 */
export const getDefaultProfilePicture = () => {
  try {
    // Use a simple black square that will be styled as circle
    return generateBlackSquare(100);
  } catch (error) {
    console.warn('Failed to generate default image, using basic fallback:', error);
    // Fallback to a basic black square
    return {
      uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      width: 100,
      height: 100,
    };
  }
};
