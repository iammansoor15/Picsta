import { Dimensions } from 'react-native';

// Mirror key layout logic from HeroScreen to compute default axes
export function computeDefaultContainerDims() {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const MENU_BAR_HEIGHT = 60;
  const CONTAINER_PADDING = 35;
  const AVAILABLE_WIDTH = screenWidth - (CONTAINER_PADDING * 2);
  const AVAILABLE_HEIGHT = screenHeight - MENU_BAR_HEIGHT - (CONTAINER_PADDING * 2);
  const MIN_CONTAINER_WIDTH = 200;
  const MIN_CONTAINER_HEIGHT = 300;
  const MAX_CONTAINER_WIDTH = screenWidth * 0.9;
  const MAX_CONTAINER_HEIGHT = screenHeight * 0.8;
  const aspect = 9 / 16;
  let width, height;
  if (AVAILABLE_HEIGHT * aspect <= AVAILABLE_WIDTH) {
    height = AVAILABLE_HEIGHT;
    width = height * aspect;
  } else {
    width = AVAILABLE_WIDTH;
    height = width / aspect;
  }
  width = Math.max(MIN_CONTAINER_WIDTH, Math.min(MAX_CONTAINER_WIDTH, width));
  height = Math.max(MIN_CONTAINER_HEIGHT, Math.min(MAX_CONTAINER_HEIGHT, height));
  return { width, height };
}

export function computeDefaultPositions() {
  const { width, height } = computeDefaultContainerDims();
  // Default photo size same as HeroScreen initial state
  const photoSize = 100;
  const padding = 10;
  const photo_cont_pos = {
    x: Math.max(padding, width - photoSize - padding),
    y: Math.max(padding, height - photoSize - padding),
  };
  // Default text estimated size and bottom-left placement from HeroScreen
  const estimatedTextHeight = 40;
  const text_cont_pos = {
    x: padding,
    y: Math.max(padding, height - estimatedTextHeight - padding),
  };
  return { photo_cont_pos, text_cont_pos };
}