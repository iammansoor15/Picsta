import React from 'react';
import { StatusBar, BackHandler, LogBox } from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';

// Ignore specific warnings that are handled by our architecture
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'A non-serializable value was detected in an action',
]);


import SplashScreen from './src/screens/SplashScreen';
import HeroScreen from './src/screens/HeroScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import Crop from './src/Components/Crop';
import BannerCrop from './src/Components/BannerCrop';
import BannerCreate from './src/Components/BannerCreate';
import ProfileEntry from './src/Components/ProfileEntry';
import CustomHeader from './src/Components/CustomHeader';
import NavigationService from './src/services/NavigationService';
import ReduxInitializer from './src/Components/ReduxInitializer';
import { store } from './src/store';
import { COLORS } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = React.useRef();
  
  // Set up navigation service
  React.useEffect(() => {
    NavigationService.setTopLevelNavigator(navigationRef.current);
  }, []);
  
  // Handle navigation state changes for better UX
  const onStateChange = (state) => {
    // Update navigation service reference
    NavigationService.setTopLevelNavigator(navigationRef.current);
    // You can add analytics or other state management here
    // console.log('Navigation state changed:', state?.routeNames);
  };
  
  // Handle deep linking or navigation actions
  const linking = {
    prefixes: ['narayana://'],
    config: {
        screens: {
          SplashScreen: 'splash',
          HeroScreen: 'edit',
          Crop: 'crop',
          BannerCrop: 'banner-crop',
        },
    },
  };
  
  return (
    <Provider store={store}>
      <ReduxInitializer>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar 
            barStyle="light-content" 
            backgroundColor={COLORS.primary} 
            translucent={false}
          />
          <NavigationContainer
            ref={navigationRef}
            onStateChange={onStateChange}
            linking={linking}
            fallback={null}
          >
          <Stack.Navigator 
            initialRouteName="SplashScreen"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animationDuration: 250,
              contentStyle: { backgroundColor: COLORS.backgroundDark },
            }}
          >
            {/* Splash Screen - No header */}
            <Stack.Screen 
              name="SplashScreen" 
              component={SplashScreen}
              options={{
                headerShown: false,
                gestureEnabled: false, // Prevent swipe back on splash
              }}
            />
            
            
            {/* Hero/Editor Screen - Custom header with back button */}
            <Stack.Screen 
              name="HeroScreen" 
              component={HeroScreen}
              options={({ route }) => ({
                headerShown: true,
                header: ({ navigation }) => (
                  <CustomHeader 
                    title=""
                    backgroundColor={COLORS.primary}
                    titleColor={COLORS.white}
                    showBackButton={true}
                    onBackPress={() => {
                      // Leave editor and return to landing screen
                      NavigationService.backFromEditor();
                    }}
                    rightComponent={null}
                    showProfilePhoto={true}
                  />
                ),
              })}
            />

            {/* Sign In / Register */}
            <Stack.Screen 
              name="ProfileEntry" 
              component={ProfileEntry}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            
            {/* Profile Screen - Custom header with back button */}
            <Stack.Screen 
              name="ProfileScreen" 
              component={ProfileScreen}
              options={{
                headerShown: true,
                header: ({ navigation }) => (
                  <CustomHeader 
                    title=""
                    backgroundColor={COLORS.primary}
                    titleColor={COLORS.white}
                    showBackButton={true}
                    onBackPress={() => navigation.goBack()}
                    rightComponent={null}
                  />
                ),
                animation: 'slide_from_right',
              }}
            />
            {/* Crop Screen */}
            <Stack.Screen 
              name="Crop" 
              component={Crop}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />

            {/* Banner Crop Screen */}
            <Stack.Screen 
              name="BannerCrop" 
              component={BannerCrop}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />

            {/* Banner Create Screen */}
            <Stack.Screen 
              name="BannerCreate" 
              component={BannerCreate}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            
          </Stack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </ReduxInitializer>
    </Provider>
  );
}
