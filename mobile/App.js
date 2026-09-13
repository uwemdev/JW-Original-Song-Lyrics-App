import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Music, Settings, Info } from 'lucide-react-native';

import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import SongScreen from './src/screens/SongScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#030712',
    card: '#030712', // Pure dark bottom tab
    text: '#FFFFFF',
    border: 'transparent',
    primary: '#8B5CF6',
  },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ 
      headerStyle: { backgroundColor: 'rgba(3, 7, 18, 0.85)' },
      headerTransparent: true,
      headerBlurEffect: 'dark',
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '800', fontSize: 22 },
      headerShadowVisible: false,
    }}>
      <Stack.Screen name="Categories" component={HomeScreen} options={{ title: 'Explore' }} />
      <Stack.Screen name="Category" component={CategoryScreen} options={({ route }) => ({ title: route.params.categoryName, headerTitleStyle: { fontWeight: '700', fontSize: 18 } })} />
      <Stack.Screen name="Song" component={SongScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function SettingsScreen() {
  return null; // Placeholder
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: 'rgba(17, 24, 39, 0.95)', 
          borderTopWidth: 0,
          elevation: 0,
          position: 'absolute',
          height: 80,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#C4B5FD',
        tabBarInactiveTintColor: '#4B5563',
        tabBarIcon: ({ color, size }) => {
          let IconComponent;
          if (route.name === 'Home') IconComponent = Home;
          else if (route.name === 'Library') IconComponent = Music;
          else if (route.name === 'Settings') IconComponent = Settings;
          return <IconComponent color={color} size={24} strokeWidth={2.5} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Library" component={HomeStack} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={MyDarkTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="MainApp" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
