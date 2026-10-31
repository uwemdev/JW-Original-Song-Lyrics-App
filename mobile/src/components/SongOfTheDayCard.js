import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sun, Play, Music, ChevronRight, Heart, MessageCircle } from 'lucide-react-native';
import { isSundayEvening, getSundayGreeting } from '../lib/sundayGreetings';
import { useSettings } from '../context/SettingsContext';
import { getFormattedTodayDate, extractLyricQuote } from '../lib/dailySong';

export default function SongOfTheDayCard({ song, categoryName, onPress, onShareStatus }) {
  const { isDark, colors } = useSettings();
  const scale = useRef(new Animated.Value(1)).current;

  if (!song) return null;

  const quote = extractLyricQuote(song.lyrics);
  const todayDate = getFormattedTodayDate();

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress && onPress(song)}
      >
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          {/* Background Gradient */}
          <LinearGradient
            colors={
              isDark
                ? ['#6D28D9', '#3B0764', '#1E1B4B']
                : ['#8B5CF6', '#6D28D9', '#4C1D95']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Background Image / Album Art Watermark */}
            {song.feature_image_url ? (
              <Image
                source={{ uri: song.feature_image_url }}
                style={styles.bgImage}
                resizeMode="cover"
              />
            ) : null}

            {/* Dark gradient veil over background image for crystal readability */}
            <LinearGradient
              colors={['rgba(15,10,26,0.3)', 'rgba(15,10,26,0.85)']}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Header Badge */}
            <View style={styles.topRow}>
              <View style={styles.sunBadge}>
                <Sun color="#F59E0B" size={13} />
                <Text style={styles.sunBadgeText}>SONG OF THE DAY</Text>
              </View>
              <Text style={styles.dateText}>{todayDate}</Text>
            </View>

            {/* Main Content */}
            <View style={styles.contentWrap}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {song.title}
              </Text>

              {quote ? (
                <View style={styles.quoteWrap}>
                  <Text style={styles.quoteText} numberOfLines={2}>
                    “{quote}”
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Bottom Row: Category & Play Action */}
            <View style={styles.bottomRow}>
              <View style={styles.catPill}>
                <Music color="#DDD6FE" size={12} />
                <Text style={styles.catPillText} numberOfLines={1}>
                  {categoryName || 'Original Song'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {onShareStatus && (
                  <TouchableOpacity
                    style={styles.statusShareBtn}
                    onPress={() => onShareStatus(song)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MessageCircle color="#25D366" size={13} />
                    <Text style={styles.statusShareBtnText}>Status</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.playBtn}>
                  <Play color="#6D28D9" fill="#6D28D9" size={13} />
                  <Text style={styles.playBtnText}>Listen</Text>
                  <ChevronRight color="#6D28D9" size={14} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  gradient: {
    padding: 16,
    minHeight: 160,
    justifyContent: 'space-between',
    position: 'relative',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    zIndex: 2,
  },
  sunBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    gap: 5,
  },
  sunBadgeText: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dateText: {
    color: '#DDD6FE',
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.9,
  },
  contentWrap: {
    zIndex: 2,
    marginVertical: 4,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quoteWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 2,
  },
  quoteText: {
    color: '#F5F3FF',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    zIndex: 2,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  catPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.4)',
    gap: 4,
  },
  statusShareBtnText: {
    color: '#25D366',
    fontSize: 12,
    fontWeight: '700',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  playBtnText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '700',
  },
});

