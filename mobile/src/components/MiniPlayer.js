import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Play, Pause, Music } from 'lucide-react-native';

const PURPLE = '#6D28D9';
const CARD_BG = '#1A1425';

/**
 * Sticky mini-player that sits above the bottom tab bar.
 *
 * Props:
 *  - song        : { id, title, feature_image_url, category_name }
 *  - isPlaying    : boolean
 *  - progress     : 0–1 fraction
 *  - onPlayPause  : () => void
 *  - onPress      : () => void   (open full song screen)
 */
export default function MiniPlayer({
  song,
  isPlaying = false,
  progress = 0,
  onPlayPause,
  onPress,
}) {
  if (!song) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Now playing: ${song.title}`}
    >
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.inner}>
        {/* Thumbnail */}
        {song.feature_image_url ? (
          <Image
            source={{ uri: song.feature_image_url }}
            style={styles.thumb}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Music color="rgba(255,255,255,0.4)" size={18} />
          </View>
        )}

        {/* Title + Category */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {song.categories?.name || song.category_name || 'Original Song'}
          </Text>
        </View>

        {/* Play / Pause */}
        <TouchableOpacity
          style={styles.playBtn}
          onPress={onPlayPause}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause color="#FFF" size={20} fill="#FFF" />
          ) : (
            <Play color="#FFF" size={20} fill="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 88 : 72,
    left: 8,
    right: 8,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'hidden',
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 12 },
    }),
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PURPLE,
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
    borderRadius: 8,
  },
  thumbFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9B8FC4',
    fontSize: 12,
    marginTop: 1,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
