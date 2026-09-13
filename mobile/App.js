import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Search, LayoutGrid, Home, Heart, Settings } from 'lucide-react-native';

import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import SongScreen from './src/screens/SongScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SearchScreen from './src/screens/SearchScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ThemeScreen from './src/screens/settings/ThemeScreen';
import FontSizeScreen from './src/screens/settings/FontSizeScreen';
import StorageScreen from './src/screens/settings/StorageScreen';
import AboutScreen from './src/screens/settings/AboutScreen';
import FeedbackScreen from './src/screens/settings/FeedbackScreen';
import PrivacyScreen from './src/screens/settings/PrivacyScreen';
import { SettingsProvider } from './src/context/SettingsContext';

const Tab = createBottomTabNavigator();
const HomeStackNav = createNativeStackNavigator();
const CategoriesStackNav = createNativeStackNavigator();
const FavoritesStackNav = createNativeStackNavigator();
const SearchStackNav = createNativeStackNavigator();
const SettingsStackNav = createNativeStackNavigator();
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
    <HomeStackNav.Navigator screenOptions={stackScreenOptions}>
      <HomeStackNav.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen
        name="Category"
        component={CategoryScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen
        name="Song"
        component={SongScreen}
        options={{ headerShown: false }}
      />
    </HomeStackNav.Navigator>
  );
}

function CategoriesStackScreen() {
  return (
    <CategoriesStackNav.Navigator screenOptions={stackScreenOptions}>
      <CategoriesStackNav.Screen
        name="CategoriesMain"
        component={CategoriesScreen}
        options={{ headerShown: false }}
      />
      <CategoriesStackNav.Screen
        name="Category"
        component={CategoryScreen}
        options={{ headerShown: false }}
      />
      <CategoriesStackNav.Screen
        name="Song"
        component={SongScreen}
        options={{ headerShown: false }}
      />
    </CategoriesStackNav.Navigator>
  );
}

function FavoritesStackScreen() {
  return (
    <FavoritesStackNav.Navigator screenOptions={stackScreenOptions}>
      <FavoritesStackNav.Screen
        name="FavoritesMain"
        component={FavoritesScreen}
        options={{ headerShown: false }}
      />
      <FavoritesStackNav.Screen
        name="Category"
        component={CategoryScreen}
        options={{ headerShown: false }}
      />
      <FavoritesStackNav.Screen
        name="Song"
        component={SongScreen}
        options={{ headerShown: false }}
      />
    </FavoritesStackNav.Navigator>
  );
}

function SearchStackScreen() {
  return (
    <SearchStackNav.Navigator screenOptions={stackScreenOptions}>
      <SearchStackNav.Screen
        name="SearchMain"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
      <SearchStackNav.Screen
        name="Category"
        component={CategoryScreen}
        options={{ headerShown: false }}
      />
      <SearchStackNav.Screen
        name="Song"
        component={SongScreen}
        options={{ headerShown: false }}
      />
    </SearchStackNav.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStackNav.Navigator screenOptions={stackScreenOptions}>
      <SettingsStackNav.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStackNav.Screen
        name="ThemeSettings"
        component={ThemeScreen}
        options={{ headerShown: false }}
      />
      <SettingsStackNav.Screen
        name="FontSizeSettings"
        component={FontSizeScreen}
        options={{ headerShown: false }}
      />
      <SettingsStackNav.Screen
        name="StorageSettings"
        component={StorageScreen}
        options={{ headerShown: false }}
      />
      <SettingsStackNav.Screen
        name="AboutApp"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
      <SettingsStackNav.Screen
        name="FeedbackScreen"
        component={FeedbackScreen}
        options={{ headerShown: false }}
      />
      <SettingsStackNav.Screen
        name="PrivacyScreen"
        component={PrivacyScreen}
        options={{ headerShown: false }}
      />
    </SettingsStackNav.Navigator>
  );
}

// ─── Tab colours ─────────────────────────────────────────────────
const ACTIVE_COLOR = '#8B5CF6';
const INACTIVE_COLOR = '#4B5563';

// ─── Main Tabs ───────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
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
      <Tab.Screen name="Search" component={SearchStackScreen} />
      <Tab.Screen name="Categories" component={CategoriesStackScreen} />
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Favorites" component={FavoritesStackScreen} />
      <Tab.Screen name="Settings" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

// ─── Root ────────────────────────────────────────────────────────
export default function App() {
  return (
    <SettingsProvider>
      <NavigationContainer theme={MyDarkTheme}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
          <RootStack.Screen name="MainApp" component={MainTabs} />
        </RootStack.Navigator>
      </NavigationContainer>
    </SettingsProvider>
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
