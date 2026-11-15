import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getWallpaperById } from '../lib/wallpapers';

export default function ChatWallpaperBackground({ wallpaperId, isDark, colors, preview = false }) {
  const wallpaper = useMemo(() => getWallpaperById(wallpaperId), [wallpaperId]);
  const defaultBg = colors?.bg || (isDark ? '#0F0A1A' : '#FFFFFF');

  if (!wallpaper || wallpaper.id === 'pitch_black') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.container,
          { backgroundColor: isDark ? '#000000' : '#F8FAFC' },
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
      {/* 1. Primary atmospheric gradient */}
      <LinearGradient
        colors={safeColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Top-right ambient lighting orb */}
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrbTop,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.09)'
              : 'rgba(255, 255, 255, 0.25)',
          },
        ]}
      />

      {/* 3. Bottom-left ambient illumination orb */}
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrbBottom,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(255, 255, 255, 0.18)',
          },
        ]}
      />

      {/* 4. Subtle diagonal light sweep */}
      <View
        pointerEvents="none"
        style={[
          styles.lightSweep,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.04)'
              : 'rgba(255, 255, 255, 0.14)',
          },
        ]}
      />

      {/* 5. Delicate decorative stardust specks */}
      <View pointerEvents="none" style={styles.dustContainer}>
        <View style={[styles.dustDot, { top: '15%', left: '20%', opacity: isDark ? 0.45 : 0.25 }]} />
        <View style={[styles.dustDot, { top: '25%', right: '18%', width: 4, height: 4, borderRadius: 2, opacity: isDark ? 0.5 : 0.3 }]} />
        <View style={[styles.dustDot, { top: '48%', left: '12%', width: 3, height: 3, borderRadius: 1.5, opacity: isDark ? 0.4 : 0.2 }]} />
        <View style={[styles.dustDot, { top: '62%', right: '24%', width: 5, height: 5, borderRadius: 2.5, opacity: isDark ? 0.55 : 0.3 }]} />
        <View style={[styles.dustDot, { top: '78%', left: '30%', opacity: isDark ? 0.45 : 0.25 }]} />
        <View style={[styles.dustDot, { top: '88%', right: '15%', width: 3.5, height: 3.5, borderRadius: 1.75, opacity: isDark ? 0.4 : 0.2 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  ambientOrbTop: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  ambientOrbBottom: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  lightSweep: {
    position: 'absolute',
    top: '38%',
    left: -80,
    right: -80,
    height: 120,
    borderRadius: 60,
    transform: [{ rotate: '-18deg' }],
  },
  dustContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dustDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
});
