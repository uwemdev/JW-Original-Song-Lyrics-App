import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
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

  // In preview cards, show the wallpaper vividly.
  // In chat messages, keep opacity balanced so speech bubbles & text stay perfectly crisp and readable.
  const imageOpacity = preview ? 0.95 : isDark ? 0.48 : 0.38;

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* 1. Underlying rich gradient renders instantly while image loads or if offline */}
      <LinearGradient
        colors={safeColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Photographic lovely wallpaper */}
      {wallpaper.imageUrl ? (
        <Image
          source={{ uri: wallpaper.imageUrl }}
          resizeMode="cover"
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: imageOpacity },
          ]}
        />
      ) : null}

      {/* 3. Soft contrast scrim for message legibility (active chat only) */}
      {!preview && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: isDark
                ? 'rgba(15, 10, 26, 0.35)'
                : 'rgba(255, 255, 255, 0.40)',
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
