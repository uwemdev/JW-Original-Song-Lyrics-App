import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Search, LayoutGrid, Home, Heart, Settings } from 'lucide-react-native';

import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import SongScreen from './src/screens/SongScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const CategoriesStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// ─── Theme ───────────────────────────────────────────────────────
const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#030712',
    card: '#030712',
    text: '#FFFFFF',
    border: 'transparent',
    primary: '#8B5CF6',
  },
};

// ─── Stack configs ───────────────────────────────────────────────
const stackScreenOptions = {
  headerStyle: { backgroundColor: 'rgba(3, 7, 18, 0.85)' },
  headerTransparent: true,
  headerBlurEffect: 'dark',
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '800', fontSize: 22 },
  headerShadowVisible: false,
};

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Category"
        component={CategoryScreen}
        options={({ route }) => ({
          title: route.params.categoryName,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        })}
      />
      <HomeStack.Screen
        name="Song"
        component={SongScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function CategoriesStackScreen() {
  return (
    <CategoriesStack.Navigator screenOptions={stackScreenOptions}>
      <CategoriesStack.Screen
        name="CategoriesMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <CategoriesStack.Screen
        name="Category"
        component={CategoryScreen}
        options={({ route }) => ({
          title: route.params.categoryName,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        })}
      />
      <CategoriesStack.Screen
        name="Song"
        component={SongScreen}
        options={{ headerShown: false }}
      />
    </CategoriesStack.Navigator>
  );
}

// ─── Placeholder screens ─────────────────────────────────────────
function SearchScreen() {
  return <View style={{ flex: 1, backgroundColor: '#030712' }} />;
}
function FavoritesScreen() {
  return <View style={{ flex: 1, backgroundColor: '#030712' }} />;
}
function SettingsScreen() {
  return <View style={{ flex: 1, backgroundColor: '#030712' }} />;
}

// ─── Tab colours ─────────────────────────────────────────────────
const ACTIVE_COLOR = '#8B5CF6';
const INACTIVE_COLOR = '#4B5563';

// ─── Main Tabs ───────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(12, 10, 24, 0.97)',
          borderTopWidth: 0,
          elevation: 0,
          position: 'absolute',
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => {
          const size = route.name === 'Home' ? 24 : 22;

          let IconComponent;
          if (route.name === 'Search') IconComponent = Search;
          else if (route.name === 'Categories') IconComponent = LayoutGrid;
          else if (route.name === 'Home') IconComponent = Home;
          else if (route.name === 'Favorites') IconComponent = Heart;
          else if (route.name === 'Settings') IconComponent = Settings;

          // Elevated Home tab
          if (route.name === 'Home') {
            return (
              <View style={styles.homeTabWrap}>
                <View style={[styles.homeTabCircle, focused && styles.homeTabCircleActive]}>
                  <IconComponent color="#FFF" size={size} strokeWidth={2.5} />
                </View>
              </View>
            );
          }

          return <IconComponent color={color} size={size} strokeWidth={2} />;
        },
      })}
    >
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Categories" component={CategoriesStackScreen} />
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root ────────────────────────────────────────────────────────
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

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  homeTabWrap: {
    position: 'relative',
    top: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeTabCircleActive: {
    backgroundColor: '#6D28D9',
    ...Platform.select({
      ios: {
        shadowColor: '#6D28D9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
});
