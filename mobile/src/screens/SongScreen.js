import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
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
  SkipBack,
  SkipForward,
  Flag,
  X,
  ChevronRight as ChevronRightSm,
  CheckCircle,
} from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';
import { useSettings } from '../context/SettingsContext';

const { width, height: SCREEN_H } = Dimensions.get('window');

// ─── Palette (removed) ───
// ─── Layout ──────────────────────────────────────────────────────
const IMAGE_H = SCREEN_H * 0.45;
const HEADER_COLLAPSED_H = Platform.OS === 'ios' ? 96 : 80;

// ─── Font sizes (3 steps) ────────────────────────────────────────
const FONT_SIZES = [16, 19, 23];
const LINE_HEIGHTS = [30, 36, 44];

// ─── Image with fallback ─────────────────────────────────────────
function FallbackImage({ uri, style, iconSize = 28 }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
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
  const { isDark } = useSettings();
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
      style={[{ width: w, height: h, borderRadius: radius, backgroundColor: isDark ? '#251B3A' : '#E2E8F0', opacity: anim }, style]}
    />
  );
}

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ visible, message }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
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
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  const { song } = route.params;
  const scrollY = useRef(new Animated.Value(0)).current;
  const settings = useSettings();

  // ── State ──
  const [isFavorite, setIsFavorite] = useState(false);
  const [moreSongs, setMoreSongs] = useState([]);
  const [loadingMore, setLoadingMore] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // ── Report state ──
  const [showReport, setShowReport] = useState(false);
  const [reportIssue, setReportIssue] = useState(null);
  const [reportNote, setReportNote] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const REPORT_ISSUES = [
    { key: 'no_audio', label: 'No audio available' },
    { key: 'wrong_audio', label: 'Wrong audio' },
    { key: 'wrong_lyrics', label: 'Wrong lyrics' },
    { key: 'spelling_mistakes', label: 'Spelling mistakes' },
    { key: 'missing_lyrics', label: 'Missing lyrics' },
    { key: 'others', label: 'Other issue' },
  ];

  // Audio State using expo-audio
  const player = useAudioPlayer(song.mp3_url);
  const status = useAudioPlayerStatus(player);
  
  // Heart bounce
  const heartScale = useRef(new Animated.Value(1)).current;
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
  }, []);

  // Stop audio when navigating away to another song
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      try {
        player.pause();
      } catch (_) {}
    });
    return unsubscribe;
  }, [navigation, player]);

  useEffect(() => {
    if (song.mp3_url && settings.autoPlay) {
      player.play();
    }
  }, [song.mp3_url]);

  async function handlePlayPause() {
    if (!song.mp3_url) {
      setToastMsg('No audio available for this song');
      setShowToast(true);
      return;
    }

    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  const seekBy = (seconds) => {
    if (!song.mp3_url) return;
    const current = status.currentTime || 0;
    const duration = status.duration || 0;
    const newPos = Math.max(0, Math.min(duration, current + seconds));
    player.seekTo(newPos);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
        JSON.stringify(song),
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

  // ── Report ──
  const submitReport = async () => {
    if (!reportIssue || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      const issueLabel = REPORT_ISSUES.find((i) => i.key === reportIssue)?.label || reportIssue;
      const msg = `[SONG REPORT] "${song.title}" (ID: ${song.id})\nIssue: ${issueLabel}${reportNote.trim() ? `\nNote: ${reportNote.trim()}` : ''}`;
      await supabase.from('feedback').insert([{
        message: msg,
        is_admin_reply: false,
        device_meta: { os: Platform.OS, song_id: song.id, song_title: song.title, issue: reportIssue },
      }]);
      setReportDone(true);
      setTimeout(() => {
        setShowReport(false);
        setReportIssue(null);
        setReportNote('');
        setReportDone(false);
        setToastMsg('Report sent — thank you!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      }, 1800);
    } catch (_) {
      setToastMsg('Failed to send report. Try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } finally {
      setReportSubmitting(false);
    }
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
      <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Collapsing image ── */}
      <Animated.View style={[styles.imageWrap, { height: imageHeight }]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: imageOpacity }]}>
          <FallbackImage uri={song.feature_image_url} style={{ width: '100%', height: '100%' }} iconSize={48} />
        </Animated.View>
        <LinearGradient
          colors={isDark 
            ? ['rgba(15, 10, 26, 0)', 'rgba(15, 10, 26, 0.4)', 'rgba(15, 10, 26, 0.95)', colors.bg]
            : ['rgba(248, 250, 252, 0)', 'rgba(248, 250, 252, 0.4)', 'rgba(248, 250, 252, 0.95)', colors.bg]}
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
            {/* Seek bar */}
            <View style={styles.seekBarWrap}>
              <View style={styles.seekTrack}>
                <View style={[styles.seekFill, { width: `${status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0}%` }]} />
              </View>
              <View style={styles.seekTimes}>
                <Text style={styles.seekTime}>{formatTime(status.currentTime)}</Text>
                <Text style={styles.seekTime}>{formatTime(status.duration)}</Text>
              </View>
              {status.isBuffering && (
                <Text style={{color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 4}}>Buffering...</Text>
              )}
            </View>

            {/* Controls row */}
            <View style={styles.playerControls}>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => seekBy(-10)}
                accessibilityRole="button"
                accessibilityLabel="Skip back 10 seconds"
              >
                <SkipBack color={colors.textMuted} size={22} />
                <Text style={styles.skipLabel}>10</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playBtn}
                accessibilityRole="button"
                accessibilityLabel="Play or pause audio"
                onPress={handlePlayPause}
              >
                {player.playing ? (
                  <Pause color="#FFF" size={22} fill="#FFF" />
                ) : (
                  <Play color="#FFF" size={22} fill="#FFF" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => seekBy(10)}
                accessibilityRole="button"
                accessibilityLabel="Skip forward 10 seconds"
              >
                <SkipForward color={colors.textMuted} size={22} />
                <Text style={styles.skipLabel}>10</Text>
              </TouchableOpacity>
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
              <Minus color={settings.fontSizeIdx === 0 ? '#4B3D6B' : colors.textMuted} size={16} />
              <Text style={[styles.toolbarBtnLabel, settings.fontSizeIdx === 0 && { color: '#4B3D6B' }]}>A</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeFontSize(1)}
              style={styles.toolbarBtn}
              disabled={settings.fontSizeIdx === 2}
              accessibilityRole="button"
              accessibilityLabel="Increase lyrics font size"
            >
              <Plus color={settings.fontSizeIdx === 2 ? '#4B3D6B' : colors.textMuted} size={16} />
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
              <Copy color={colors.textMuted} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={shareSong}
              style={styles.toolbarIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Share song"
            >
              <Share2 color={colors.textMuted} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowReport(true); setReportIssue(null); setReportNote(''); setReportDone(false); }}
              style={styles.toolbarIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Report an issue with this song"
            >
              <Flag color="#F87171" size={18} />
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
                color: colors.textWhite,
                fontSize: FONT_SIZES[settings.fontSizeIdx],
                lineHeight: LINE_HEIGHTS[settings.fontSizeIdx],
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
              tagsStyles={{
                p: { marginBottom: 18 },
                br: { height: 8 },
              }}
              renderersProps={{
                p: { allowFontScaling: false },
              }}
              defaultTextProps={{ allowFontScaling: false }}
            />
          ) : (
            <View style={styles.lyricsComingSoon}>
              <Music color={colors.textMuted} size={32} />
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
                <ChevronRight color={colors.purpleAccent} size={16} />
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

      {/* ── Report Modal ── */}
      <Modal
        visible={showReport}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReport(false)}
      >
        <KeyboardAvoidingView
          style={styles.reportOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.reportBackdrop} activeOpacity={1} onPress={() => setShowReport(false)} />
          <View style={styles.reportSheet}>
            {/* Handle */}
            <View style={styles.reportHandle} />

            {/* Header */}
            <View style={styles.reportHeader}>
              <Flag color="#F87171" size={20} />
              <Text style={styles.reportTitle}>Report an Issue</Text>
              <TouchableOpacity onPress={() => setShowReport(false)} style={styles.reportCloseBtn}>
                <X color={colors.textMuted} size={20} />
              </TouchableOpacity>
            </View>
            <Text style={styles.reportSubtitle}>What's wrong with "{song.title}"?</Text>

            {reportDone ? (
              <View style={styles.reportSuccessWrap}>
                <CheckCircle color="#4ADE80" size={48} />
                <Text style={styles.reportSuccessText}>Report sent!</Text>
                <Text style={styles.reportSuccessSub}>Thank you for helping us improve.</Text>
              </View>
            ) : (
              <>
                {/* Issue options */}
                {REPORT_ISSUES.map((issue) => (
                  <TouchableOpacity
                    key={issue.key}
                    style={[styles.reportOption, reportIssue === issue.key && styles.reportOptionSelected]}
                    onPress={() => setReportIssue(issue.key)}
                  >
                    <Text style={[styles.reportOptionText, reportIssue === issue.key && styles.reportOptionTextSelected]}>
                      {issue.label}
                    </Text>
                    {reportIssue === issue.key && <CheckCircle color={colors.purpleAccent} size={18} />}
                  </TouchableOpacity>
                ))}

                {/* Optional note */}
                <TextInput
                  style={styles.reportNoteInput}
                  placeholder="Add a note (optional)..."
                  placeholderTextColor={colors.textMuted}
                  value={reportNote}
                  onChangeText={setReportNote}
                  multiline
                  maxLength={300}
                />

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.reportSubmitBtn, (!reportIssue || reportSubmitting) && styles.reportSubmitBtnDisabled]}
                  onPress={submitReport}
                  disabled={!reportIssue || reportSubmitting}
                >
                  {reportSubmitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.reportSubmitText}>Send Report</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Toast notification ── */}
      <Toast visible={showToast} message={toastMsg} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const makeStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
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
    backgroundColor: isDark ? 'rgba(15, 10, 26, 0.95)' : 'rgba(248, 250, 252, 0.95)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 60,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(109, 40, 217, 0.15)',
  },
  stickyTitle: {
    color: colors.textWhite,
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
    color: colors.textWhite,
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
    color: colors.purpleAccent,
    fontSize: 12,
    fontWeight: '600',
  },
  writeup: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // ── Player ──
  playerCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(109, 40, 217, 0.15)',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 24,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  skipLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.purple,
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
    backgroundColor: colors.purpleAccent,
    borderRadius: 2,
  },
  seekTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  seekTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  audioComingSoon: {
    color: colors.textMuted,
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
    backgroundColor: colors.cardBg,
    gap: 4,
  },
  toolbarBtnLabel: {
    color: colors.textMuted,
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
    backgroundColor: colors.cardBg,
  },

  // ── Lyrics Body ──
  lyricsBody: {
    paddingHorizontal: 22,
    minHeight: 200,
  },
  // ── Report modal ──
  reportOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  reportBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  reportSheet: {
    backgroundColor: isDark ? '#1A1030' : '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  reportHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  reportTitle: {
    flex: 1,
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '800',
  },
  reportCloseBtn: {
    padding: 4,
  },
  reportSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reportOptionSelected: {
    borderColor: colors.purpleAccent,
    backgroundColor: 'rgba(109,40,217,0.12)',
  },
  reportOptionText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  reportOptionTextSelected: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  reportNoteInput: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textWhite,
    fontSize: 14,
    minHeight: 72,
    marginTop: 4,
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  reportSubmitBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reportSubmitBtnDisabled: {
    opacity: 0.4,
  },
  reportSubmitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  reportSuccessWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  reportSuccessText: {
    color: colors.textWhite,
    fontSize: 20,
    fontWeight: '800',
  },
  reportSuccessSub: {
    color: colors.textMuted,
    fontSize: 14,
  },

  lyricsComingSoon: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  lyricsComingSoonText: {
    color: colors.textMuted,
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
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '800',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: colors.purpleAccent,
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
    color: colors.textWhite,
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
