import { CommonActions } from '@react-navigation/native';

let navigator;

function setTopLevelNavigator(navigatorRef) {
  navigator = navigatorRef;
}

function navigate(routeName, params) {
  navigator?.navigate(routeName, params);
}

function goBack() {
  navigator?.goBack();
}

function reset(routeName) {
  navigator?.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName }],
    })
  );
}

function popToTop() {
  navigator?.dispatch(CommonActions.popToTop());
}

function replace(routeName, params) {
  navigator?.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    })
  );
}

// Navigation helper functions for specific flows
const NavigationService = {
  setTopLevelNavigator,
  navigate,
  goBack,
  reset,
  popToTop,
  replace,
  
  // App-specific navigation helpers
  navigateToHome: () => navigate('HeroScreen'),
  navigateToEditor: (templateData) => navigate('HeroScreen', templateData),
  // navigateToCrop: (cropData) => navigate('Crop', cropData), // Crop functionality removed
  
  // Reset flows
  resetToHome: () => reset('HeroScreen'),
  resetToSplash: () => reset('SplashScreen'),
  
  // Back navigation with specific logic
  backFromEditor: () => reset('HeroScreen'),
  // backFromCrop: () => goBack(), // Crop functionality removed
};

export default NavigationService;