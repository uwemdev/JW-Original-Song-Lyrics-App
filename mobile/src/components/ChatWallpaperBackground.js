import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getWallpaperById } from '../lib/wallpapers';

export default function ChatWallpaperBackground({ wallpaperId, isDark, colors, preview = false }) {
  const wallpaper = useMemo(() => getWallpaperById(wallpaperId), [wallpaperId]);
  const defaultBg = colors?.bg || (isDark ? '#0F0A1A' : '#FFFFFF');

  if (!wallpaper || wallpaper.id === 'default') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.container,
          { backgroundColor: preview ? (isDark ? '#161324' : '#F8FAFC') : defaultBg },
        ]}
      />
    );
  }

  const gradientColors = isDark ? wallpaper.darkGradient : wallpaper.lightGradient;
  const safeColors =
    Array.isArray(gradientColors) && gradientColors.length >= 2
      ? gradientColors
      : [defaultBg, defaultBg];

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={safeColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
