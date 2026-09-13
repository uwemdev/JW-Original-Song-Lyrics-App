import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Share,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Heart,
  Play,
  Pause,
  Music,
  Minus,
  Plus,
  Copy,
  Share2,
  ChevronRight,
} from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';
import { useSettings } from '../context/SettingsContext';

const { width, height: SCREEN_H } = Dimensions.get('window');

// ─── Palette ─────────────────────────────────────────────────────
const BG = '#0F0A1A';
const CARD_BG = '#1A1425';
const PURPLE = '#6D28D9';
const PURPLE_ACCENT = '#A78BFA';
const TEXT_MUTED = '#B8AFC9';
const TEXT_WHITE = '#FFFFFF';

// ─── Layout ──────────────────────────────────────────────────────
const IMAGE_H = SCREEN_H * 0.45;
const HEADER_COLLAPSED_H = Platform.OS === 'ios' ? 96 : 80;

// ─── Font sizes (3 steps) ────────────────────────────────────────
const FONT_SIZES = [16, 19, 23];
const LINE_HEIGHTS = [30, 36, 44];

// ─── Image with fallback ─────────────────────────────────────────
function FallbackImage({ uri, style, iconSize = 28 }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, styles.imgFallback]}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: iconSize, height: iconSize, opacity: 0.3 }}
          resizeMode="contain"
        />
      </View>
    );
  }
  return (
    <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)} />
  );
}

// ─── Shimmer ─────────────────────────────────────────────────────
function Shimmer({ w, h, radius = 8, style }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: radius, backgroundColor: '#251B3A', opacity: anim }, style]}
    />
  );
}

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ visible, message }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SONG DETAIL SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function SongScreen({ route, navigation }) {
  const { song } = route.params;
  const scrollY = useRef(new Animated.Value(0)).current;
  const settings = useSettings();

  // ── State ──
  const [isFavorite, setIsFavorite] = useState(false);
  const [moreSongs, setMoreSongs] = useState([]);
  const [loadingMore, setLoadingMore] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Heart bounce

  // Fade-in
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;

  const categoryName = song.categories?.name || 'Song';

  // ── Init ──
  useEffect(() => {
    // Fade in content
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    loadFavoriteStatus();
    fetchMoreSongs();
    saveLastPlayed();
    
    // Auto-play logic
    if (settings.autoPlay) {
      setIsPlaying(true);
      setDuration(180000);
    }
  }, []);

  async function handlePlayPause() {
    if (!song.mp3_url) {
      setToastMsg('No audio available for this song');
      setShowToast(true);
      return;
    }
    
    // Fake audio playback for preview purposes since expo-av crashes Expo Go
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Optional: Fake progress
      setDuration(180000); // 3 minutes
    }
  }

  // Fake progress timer
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setPosition((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1000;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ── Favorites ──
  const loadFavoriteStatus = async () => {
    try {
      const raw = await AsyncStorage.getItem('@favorites');
      const favs = raw ? JSON.parse(raw) : [];
      setIsFavorite(favs.includes(song.id));
    } catch (_) {}
  };

  const toggleFavorite = async () => {
    const newVal = !isFavorite;
    setIsFavorite(newVal);

    // Bounce
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }),
    ]).start();

    try {
      const raw = await AsyncStorage.getItem('@favorites');
      let favs = raw ? JSON.parse(raw) : [];
      if (newVal) {
        if (!favs.includes(song.id)) favs.push(song.id);
      } else {
        favs = favs.filter((id) => id !== song.id);
      }
      await AsyncStorage.setItem('@favorites', JSON.stringify(favs));
    } catch (_) {}
  };

  // ── Font size handled by SettingsContext ──
  const changeFontSize = (delta) => {
    const next = Math.max(0, Math.min(2, settings.fontSizeIdx + delta));
    settings.setFontSizeIdx(next);
  };

  // ── Save last played ──
  const saveLastPlayed = async () => {
    try {
      await AsyncStorage.setItem(
        '@last_played_song',
        JSON.stringify({ id: song.id, title: song.title, feature_image_url: song.feature_image_url, category_id: song.category_id, categories: song.categories }),
      );
    } catch (_) {}
  };

  // ── More songs ──
  const fetchMoreSongs = async () => {
    try {
      const { data } = await supabase
        .from('songs')
        .select('*, categories(name)')
        .eq('category_id', song.category_id)
        .eq('is_published', true)
        .neq('id', song.id)
        .order('sort_order')
        .limit(15);
      setMoreSongs(data || []);
    } catch (_) {}
    setLoadingMore(false);
  };

  // ── Clipboard ──
  const copyLyrics = async () => {
    if (!song.lyrics) return;
    // Strip HTML tags for plain text
    const plain = song.lyrics.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    await Clipboard.setStringAsync(plain);
    setToastMsg('Lyrics copied');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  // ── Share ──
  const shareSong = async () => {
    try {
      await Share.share({
        message: `${song.title} — Original Song Lyrics\n\nCheck out this song!`,
        title: song.title,
      });
    } catch (_) {}
  };

  // ── Scroll interpolations ──
  const imageHeight = scrollY.interpolate({
    inputRange: [0, IMAGE_H - HEADER_COLLAPSED_H],
    outputRange: [IMAGE_H, HEADER_COLLAPSED_H],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, IMAGE_H * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [IMAGE_H * 0.4, IMAGE_H * 0.6],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Collapsing image ── */}
      <Animated.View style={[styles.imageWrap, { height: imageHeight }]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: imageOpacity }]}>
          <FallbackImage uri={song.feature_image_url} style={{ width: '100%', height: '100%' }} iconSize={48} />
        </Animated.View>
        <LinearGradient
          colors={['transparent', 'rgba(15, 10, 26, 0.4)', 'rgba(15, 10, 26, 0.95)', BG]}
          locations={[0.0, 0.5, 0.78, 1.0]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* ── Sticky collapsed header ── */}
      <Animated.View style={[styles.stickyHeader, { opacity: stickyHeaderOpacity }]}>
        <Text style={styles.stickyTitle} numberOfLines={1}>{song.title}</Text>
      </Animated.View>

      {/* ── Floating controls ── */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={styles.floatingBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft color="#FFF" size={24} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleFavorite}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Animated.View style={[styles.floatingBtn, { transform: [{ scale: heartScale }] }]}>
            <Heart
              color={isFavorite ? '#F472B6' : '#FFF'}
              size={22}
              fill={isFavorite ? '#F472B6' : 'transparent'}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        style={{ zIndex: 2 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Spacer for the hero image */}
        <View style={{ height: IMAGE_H - 60 }} />

        {/* ── Title & metadata ── */}
        <Animated.View
          style={[styles.contentBlock, { opacity: contentFade, transform: [{ translateY: contentSlide }] }]}
        >
          <Text style={styles.songTitle}>{song.title}</Text>

          {/* Category pill */}
          <TouchableOpacity
            style={styles.catPill}
            onPress={() => navigation.navigate('Category', { categoryId: song.category_id, categoryName })}
            activeOpacity={0.7}
          >
            <Text style={styles.catPillText}>{categoryName}</Text>
          </TouchableOpacity>

          {/* Write-up */}
          {song.writeup ? (
            <Text style={styles.writeup}>{song.writeup}</Text>
          ) : null}
        </Animated.View>

        {/* ── Audio Player ── */}
        {song.mp3_url ? (
          <View style={styles.playerCard}>
            <View style={styles.playerRow}>
              <TouchableOpacity
                style={styles.playBtn}
                accessibilityRole="button"
                accessibilityLabel="Play or pause audio"
                onPress={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause color="#FFF" size={20} fill="#FFF" style={{ marginLeft: 2 }} />
                ) : (
                  <Play color="#FFF" size={20} fill="#FFF" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>

              <View style={styles.seekBarWrap}>
                <View style={styles.seekTrack}>
                  <View style={[styles.seekFill, { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }]} />
                </View>
                <View style={styles.seekTimes}>
                  <Text style={styles.seekTime}>{formatTime(position)}</Text>
                  <Text style={styles.seekTime}>{formatTime(duration)}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.playerCard}>
            <Text style={styles.audioComingSoon}>Audio coming soon</Text>
          </View>
        )}

        {/* ── Lyrics Toolbar ── */}
        <View style={styles.lyricsToolbar}>
          <View style={styles.fontControls}>
            <TouchableOpacity
              onPress={() => changeFontSize(-1)}
              style={styles.toolbarBtn}
              disabled={settings.fontSizeIdx === 0}
              accessibilityRole="button"
              accessibilityLabel="Decrease lyrics font size"
            >
              <Minus color={settings.fontSizeIdx === 0 ? '#4B3D6B' : TEXT_MUTED} size={16} />
              <Text style={[styles.toolbarBtnLabel, settings.fontSizeIdx === 0 && { color: '#4B3D6B' }]}>A</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeFontSize(1)}
              style={styles.toolbarBtn}
              disabled={settings.fontSizeIdx === 2}
              accessibilityRole="button"
              accessibilityLabel="Increase lyrics font size"
            >
              <Plus color={settings.fontSizeIdx === 2 ? '#4B3D6B' : TEXT_MUTED} size={16} />
              <Text style={[styles.toolbarBtnLabel, settings.fontSizeIdx === 2 && { color: '#4B3D6B' }, { fontSize: 17 }]}>A</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toolbarActions}>
            <TouchableOpacity
              onPress={copyLyrics}
              style={styles.toolbarIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Copy lyrics to clipboard"
            >
              <Copy color={TEXT_MUTED} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={shareSong}
              style={styles.toolbarIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Share song"
            >
              <Share2 color={TEXT_MUTED} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Lyrics Body ── */}
        <View style={styles.lyricsBody}>
          {song.lyrics ? (
            <RenderHTML
              contentWidth={width - 48}
              source={{ html: song.lyrics }}
              baseStyle={{
                color: TEXT_WHITE,
                fontSize: FONT_SIZES[settings.fontSizeIdx],
                lineHeight: LINE_HEIGHTS[settings.fontSizeIdx],
              }}
              tagsStyles={{
                p: { marginBottom: 18 },
                br: { height: 8 },
              }}
            />
          ) : (
            <View style={styles.lyricsComingSoon}>
              <Music color={TEXT_MUTED} size={32} />
              <Text style={styles.lyricsComingSoonText}>Lyrics coming soon</Text>
              <Text style={styles.lyricsComingSoonSub}>
                This song has been published but the lyrics{'\n'}haven't been added yet.
              </Text>
            </View>
          )}
        </View>

        {/* ── More Like This ── */}
        {moreSongs.length > 0 && (
          <View style={styles.moreSection}>
            <View style={styles.moreSectionHeader}>
              <Text style={styles.moreSectionTitle}>More in {categoryName}</Text>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() =>
                  navigation.navigate('Category', { categoryId: song.category_id, categoryName })
                }
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight color={PURPLE_ACCENT} size={16} />
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              data={moreSongs}
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              renderItem={({ item: s }) => (
                <TouchableOpacity
                  style={styles.moreCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.push('Song', { song: s })}
                >
                  <FallbackImage uri={s.feature_image_url} style={styles.moreCardImg} iconSize={20} />
                  <Text style={styles.moreCardTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.moreCardSub} numberOfLines={1}>{s.categories?.name || categoryName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </Animated.ScrollView>

      {/* ── Toast notification ── */}
      <Toast visible={showToast} message={toastMsg} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Image ──
  imageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  imgFallback: {
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Sticky header ──
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_COLLAPSED_H,
    backgroundColor: 'rgba(15, 10, 26, 0.95)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 60,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(109, 40, 217, 0.15)',
  },
  stickyTitle: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Floating controls ──
  floatingControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Content ──
  contentBlock: {
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  songTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: TEXT_WHITE,
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  catPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(109, 40, 217, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 14,
  },
  catPillText: {
    color: PURPLE_ACCENT,
    fontSize: 12,
    fontWeight: '600',
  },
  writeup: {
    fontSize: 15,
    lineHeight: 24,
    color: TEXT_MUTED,
    fontStyle: 'italic',
  },

  // ── Player ──
  playerCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(109, 40, 217, 0.15)',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    ...Platform.select({
      ios: {
        shadowColor: PURPLE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  seekBarWrap: {
    flex: 1,
  },
  seekTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekFill: {
    height: '100%',
    backgroundColor: PURPLE_ACCENT,
    borderRadius: 2,
  },
  seekTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  seekTime: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  audioComingSoon: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 4,
  },

  // ── Lyrics Toolbar ──
  lyricsToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  fontControls: {
    flexDirection: 'row',
    gap: 4,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: CARD_BG,
    gap: 4,
  },
  toolbarBtnLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 4,
  },
  toolbarIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: CARD_BG,
  },

  // ── Lyrics Body ──
  lyricsBody: {
    paddingHorizontal: 22,
    minHeight: 200,
  },
  lyricsComingSoon: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  lyricsComingSoonText: {
    color: TEXT_MUTED,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  lyricsComingSoonSub: {
    color: '#6B618A',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  // ── More Like This ──
  moreSection: {
    marginTop: 32,
    marginBottom: 20,
  },
  moreSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  moreSectionTitle: {
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: '800',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: PURPLE_ACCENT,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 2,
  },
  moreCard: {
    width: 130,
    marginRight: 12,
  },
  moreCardImg: {
    width: 130,
    height: 130,
    borderRadius: 10,
    marginBottom: 8,
  },
  moreCardTitle: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  moreCardSub: {
    color: '#9B8FC4',
    fontSize: 11,
    marginTop: 2,
  },

  // ── Toast ──
  toast: {
    position: 'absolute',
    bottom: 120,
    left: 40,
    right: 40,
    backgroundColor: 'rgba(109, 40, 217, 0.9)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
