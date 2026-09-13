import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Music, Settings, Info } from 'lucide-react-native';

import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import SongScreen from './src/screens/SongScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ 
      headerStyle: { backgroundColor: '#0B0F19' },
      headerTintColor: '#fff',
    }}>
      <Stack.Screen name="Categories" component={HomeScreen} options={{ title: 'Original Songs' }} />
      <Stack.Screen name="Category" component={CategoryScreen} options={({ route }) => ({ title: route.params.categoryName })} />
      <Stack.Screen name="Song" component={SongScreen} options={{ title: 'Lyrics' }} />
    </Stack.Navigator>
  );
}

function SettingsScreen() {
  return null; // Placeholder
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: '#0B0F19', borderTopColor: '#1E293B' },
          tabBarActiveTintColor: '#8B5CF6',
          tabBarInactiveTintColor: '#64748B',
          tabBarIcon: ({ color, size }) => {
            let IconComponent;
            if (route.name === 'Home') IconComponent = Home;
            else if (route.name === 'Library') IconComponent = Music;
            else if (route.name === 'Settings') IconComponent = Settings;
            return <IconComponent color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Library" component={HomeStack} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
