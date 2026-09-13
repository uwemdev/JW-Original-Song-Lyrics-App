import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsContext = createContext(null);

// Storage keys
const KEYS = {
  theme: '@settings_theme',
  fontSizeIdx: '@lyrics_font_size', // matches SongScreen's existing key
  autoPlay: '@settings_auto_play',
  dataSaver: '@settings_data_saver',
  autoCacheFavorites: '@settings_auto_cache_favorites',
  newSongAlerts: '@settings_new_song_alerts',
};

// Defaults
const DEFAULTS = {
  theme: 'dark', // 'dark' | 'light' | 'system'
  fontSizeIdx: 1, // 0=small, 1=medium, 2=large
  autoPlay: false,
  dataSaver: false,
  autoCacheFavorites: false,
  newSongAlerts: true,
};

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULTS.theme);
  const [fontSizeIdx, setFontSizeIdxState] = useState(DEFAULTS.fontSizeIdx);
  const [autoPlay, setAutoPlayState] = useState(DEFAULTS.autoPlay);
  const [dataSaver, setDataSaverState] = useState(DEFAULTS.dataSaver);
  const [autoCacheFavorites, setAutoCacheFavoritesState] = useState(DEFAULTS.autoCacheFavorites);
  const [newSongAlerts, setNewSongAlertsState] = useState(DEFAULTS.newSongAlerts);
  const [loaded, setLoaded] = useState(false);

  // Load all settings from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const results = await AsyncStorage.multiGet(Object.values(KEYS));
        const map = {};
        results.forEach(([key, value]) => {
          if (value !== null) map[key] = value;
        });

        if (map[KEYS.theme]) setThemeState(map[KEYS.theme]);
        if (map[KEYS.fontSizeIdx]) setFontSizeIdxState(parseInt(map[KEYS.fontSizeIdx], 10));
        if (map[KEYS.autoPlay]) setAutoPlayState(map[KEYS.autoPlay] === 'true');
        if (map[KEYS.dataSaver]) setDataSaverState(map[KEYS.dataSaver] === 'true');
        if (map[KEYS.autoCacheFavorites]) setAutoCacheFavoritesState(map[KEYS.autoCacheFavorites] === 'true');
        if (map[KEYS.newSongAlerts] !== undefined) setNewSongAlertsState(map[KEYS.newSongAlerts] !== 'false');
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  // Setter helpers — update state immediately + persist
  const setTheme = useCallback(async (val) => {
    setThemeState(val);
    await AsyncStorage.setItem(KEYS.theme, val);
  }, []);

  const setFontSizeIdx = useCallback(async (val) => {
    setFontSizeIdxState(val);
    await AsyncStorage.setItem(KEYS.fontSizeIdx, String(val));
  }, []);

  const setAutoPlay = useCallback(async (val) => {
    setAutoPlayState(val);
    await AsyncStorage.setItem(KEYS.autoPlay, String(val));
  }, []);

  const setDataSaver = useCallback(async (val) => {
    setDataSaverState(val);
    await AsyncStorage.setItem(KEYS.dataSaver, String(val));
  }, []);

  const setAutoCacheFavorites = useCallback(async (val) => {
    setAutoCacheFavoritesState(val);
    await AsyncStorage.setItem(KEYS.autoCacheFavorites, String(val));
  }, []);

  const setNewSongAlerts = useCallback(async (val) => {
    setNewSongAlertsState(val);
    await AsyncStorage.setItem(KEYS.newSongAlerts, String(val));
  }, []);

  // Reset all settings + app data
  const resetAllData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        ...Object.values(KEYS),
        '@favorites',
        '@offline_lyrics_cache',
        '@last_played_song',
        '@recent_searches',
        '@last_read_notif',
        '@onboarding_complete',
      ]);
      // Reset state to defaults
      setThemeState(DEFAULTS.theme);
      setFontSizeIdxState(DEFAULTS.fontSizeIdx);
      setAutoPlayState(DEFAULTS.autoPlay);
      setDataSaverState(DEFAULTS.dataSaver);
      setAutoCacheFavoritesState(DEFAULTS.autoCacheFavorites);
      setNewSongAlertsState(DEFAULTS.newSongAlerts);
    } catch (_) {}
  }, []);

  const value = {
    loaded,
    theme, setTheme,
    fontSizeIdx, setFontSizeIdx,
    autoPlay, setAutoPlay,
    dataSaver, setDataSaver,
    autoCacheFavorites, setAutoCacheFavorites,
    newSongAlerts, setNewSongAlerts,
    resetAllData,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
