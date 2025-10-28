import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileEntry from '../Components/ProfileEntry';
import ProfileHome from '../Components/ProfileHome';
import AppRoot from './root';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="root" component={AppRoot} />
        <Stack.Screen name="ProfileEntry" component={ProfileEntry} />
        <Stack.Screen name="ProfileHome" component={ProfileHome} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
