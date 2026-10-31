import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, Music, X } from 'lucide-react-native';
import { useAudio } from '../context/AudioContext';
import { useSettings } from '../context/SettingsContext';

/**
 * Global floating mini-player docked right above the bottom tab bar.
 * Tapping expands into the full SongScreen.
 */
export default function MiniPlayer() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useSettings();
  const {
    currentSong,
    isPlaying,
    progress,
    togglePlayPause,
    dismissMiniPlayer,
    isMiniPlayerVisible,
  } = useAudio();

  if (!isMiniPlayerVisible || !currentSong) {
    return null;
  }

  const handleOpenSong = () => {
    navigation.navigate('Song', { song: currentSong });
  };

  const tabHeight = (Platform.OS === 'ios' ? 88 : 72) + insets.bottom;
  const bottomPosition = tabHeight + 8;

  const categoryName = currentSong.categories?.name || currentSong.category_name || 'Original Song';

  return (
    <View
      style={[
        styles.container,
        {
          bottom: bottomPosition,
          backgroundColor: isDark ? 'rgba(26, 20, 37, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)',
        },
      ]}
    >
      {/* Progress track on top edge */}
      <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.round((progress || 0) * 100)}%`,
              backgroundColor: colors.purpleAccent,
            },
          ]}
        />
      </View>

      <TouchableOpacity
        style={styles.inner}
        activeOpacity={0.9}
        onPress={handleOpenSong}
        accessibilityRole="button"
        accessibilityLabel={`Now playing: ${currentSong.title}`}
      >
        {/* Artwork Thumbnail */}
        {currentSong.feature_image_url ? (
          <Image
            source={{ uri: currentSong.feature_image_url }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Music color={colors.textMuted} size={18} />
          </View>
        )}

        {/* Title and Category */}
        <View style={styles.info}>
          <Text
            style={[styles.title, { color: colors.textWhite }]}
            numberOfLines={1}
          >
            {currentSong.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {categoryName}
          </Text>
        </View>

        {/* Player Actions */}
        <View style={styles.actions}>
          {/* Play / Pause Button */}
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: colors.purple }]}
            onPress={togglePlayPause}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            activeOpacity={0.8}
          >
            {isPlaying ? (
              <Pause color="#FFFFFF" size={18} fill="#FFFFFF" />
            ) : (
              <Play color="#FFFFFF" size={18} fill="#FFFFFF" style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>

          {/* Dismiss / Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={dismissMiniPlayer}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close mini player"
            activeOpacity={0.7}
          >
            <X color={colors.textMuted} size={16} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  thumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
