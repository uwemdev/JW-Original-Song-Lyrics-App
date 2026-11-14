import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useAudio } from '../context/AudioContext';
import * as Network from 'expo-network';
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
  Flag,
  X,
  ChevronRight as ChevronRightSm,
  CheckCircle,
  Mic,
  Info,
  ListPlus,
  Download,
  Wifi,
  WifiOff,
  Radio,
  Moon,
} from 'lucide-react-native';
import { Replay10Icon, Forward10Icon } from '../components/SeekIcons';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { isSongDownloaded, downloadSong, deleteDownloadedSong } from '../lib/offlineManager';
import { logSongEvent } from '../lib/analytics';
import RenderHTML from 'react-native-render-html';
import { parseSyncedLyrics } from '../lib/lyricsParser';
import { useSettings } from '../context/SettingsContext';
import AdBanner from '../components/AdBanner';
import NativeAdCard from '../components/NativeAdCard';
import WhatsAppStatusCardModal from '../components/WhatsAppStatusCardModal';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { MessageCircle } from 'lucide-react-native';

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
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Global Audio Context
  const {
    player,
    status,
    currentSong,
    isAudioOffline,
    playSong,
    togglePlayPause,
    seekBy: audioSeekBy,
    setCurrentScreen,
    sleepTimerOption,
    sleepTimerRemainingSec,
    setSleepTimer,
    clearSleepTimer,
  } = useAudio();

  const [isConnected, setIsConnected] = useState(true);

  // Monitor network status
  useEffect(() => {
    let mounted = true;
    const checkNet = async () => {
      try {
        const netState = await Network.getNetworkStateAsync();
        if (mounted) {
          setIsConnected(!!(netState.isConnected && netState.isInternetReachable !== false));
        }
      } catch (_) {}
    };
    checkNet();
    const interval = setInterval(checkNet, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  
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

    if (song?.id) {
      logSongEvent(song.id, 'view', settings?.deviceId);
    }
    loadFavoriteStatus();
    fetchMoreSongs();
    saveLastPlayed();
  }, [song?.id]);

  // Check offline download status
  useEffect(() => {
    let mounted = true;
    if (song?.id) {
      isSongDownloaded(song.id).then((saved) => {
        if (mounted) setIsDownloaded(saved);
      });
    }
    return () => { mounted = false; };
  }, [song?.id]);

  // Synchronize with global audio context & track active screen
  useEffect(() => {
    setCurrentScreen('Song');
    if (song && currentSong?.id !== song.id) {
      playSong(song, route.params?.queue);
    }
    return () => {
      setCurrentScreen('');
    };
  }, [song?.id]);

  async function handlePlayPause() {
    if (!song.mp3_url) {
      setToastMsg('No audio available for this song');
      setShowToast(true);
      return;
    }
    togglePlayPause();
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


  const handleToggleDownload = async () => {
    if (!song.mp3_url) {
      setToastMsg('No audio available to download');
      setShowToast(true);
      return;
    }

    if (isDownloaded) {
      Alert.alert(
        'Remove Offline Song',
        'Remove this song from your offline storage?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await deleteDownloadedSong(song.id);
              setIsDownloaded(false);
              setToastMsg('Removed from offline storage');
              setShowToast(true);
            },
          },
        ]
      );
      return;
    }

    setIsDownloading(true);
    setToastMsg('Downloading for offline listening...');
    setShowToast(true);

    const res = await downloadSong(song);
    setIsDownloading(false);

    if (res.success) {
      setIsDownloaded(true);
      if (song?.id) {
        logSongEvent(song.id, 'download', settings?.deviceId);
      }
      setToastMsg('Saved offline • Hidden from device media');
      setShowToast(true);
    } else {
      setToastMsg('Download failed • Check your internet connection');
      setShowToast(true);
    }
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

    if (newVal && song?.id) {
      logSongEvent(song.id, 'favorite', settings?.deviceId);
    }

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
    const plain = song.lyrics.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/[\u00A0\u202F\uFEFF]/g, ' ').replace(/<wbr\s*\/?>/gi, '').replace(/&shy;/gi, '').replace(/[\u00AD\u200B]/g, '').trim();
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
        device_id: settings?.deviceId || null,
        message: msg,
        is_admin_reply: false,
        device_meta: { os: Platform.OS, version: Platform.Version, song_id: song.id, song_title: song.title, issue: reportIssue },
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

  // ── Clean & split lyrics for mid-lyrics native ad insertion ──
  const cleanLyrics = useMemo(() => {
    if (!song.lyrics) return '';
    return song.lyrics
      // Replace HTML non-breaking spaces with standard space
      .replace(/&nbsp;/gi, ' ')
      // Replace Unicode non-breaking spaces & zero-width no-break spaces
      .replace(/[\u00A0\u202F\uFEFF]/g, ' ')
      // Strip word-break opportunities & soft hyphens that trigger mid-word splitting
      .replace(/<wbr\s*\/?>/gi, '')
      .replace(/&shy;/gi, '')
      .replace(/[\u00AD\u200B]/g, '');
  }, [song.lyrics]);

  const splitLyrics = useMemo(() => {
    if (!cleanLyrics) return { part1: '', part2: '' };

    // Check if lyrics contain multiple <p> tags
    const pMatches = cleanLyrics.match(/<p[\s\S]*?<\/p>/gi);
    if (pMatches && pMatches.length >= 3) {
      const mid = Math.ceil(pMatches.length / 2);
      return {
        part1: pMatches.slice(0, mid).join(''),
        part2: pMatches.slice(mid).join(''),
      };
    }

    // Fallback: check for <br><br> or double breaks
    const brSplits = cleanLyrics.split(/(?:<br\s*\/?>\s*){2,}/i);
    if (brSplits && brSplits.length >= 2) {
      const mid = Math.ceil(brSplits.length / 2);
      return {
        part1: brSplits.slice(0, mid).join('<br/><br/>'),
        part2: brSplits.slice(mid).join('<br/><br/>'),
      };
    }

    return { part1: cleanLyrics, part2: '' };
  }, [cleanLyrics]);

  // ── Sing-Along / Synced Lyrics Mode (OFF by default) ──
  const [isKaraoke, setIsKaraoke] = useState(false);
  const lineOffsets = useRef({});
  const scrollRef = useRef(null);
  const isUserInteracting = useRef(false);
  const interactionTimeout = useRef(null);

  const syncedLines = useMemo(() => {
    return parseSyncedLyrics(song.lyrics, status.duration);
  }, [song.lyrics, status.duration]);

  const activeIndex = useMemo(() => {
    if (!isKaraoke || syncedLines.length === 0) return -1;
    const currentTime = status.currentTime || 0;
    let idx = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (currentTime >= syncedLines[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [isKaraoke, syncedLines, status.currentTime]);

  // Auto-scroll to active line in Sing-Along mode
  useEffect(() => {
    if (!isKaraoke || activeIndex < 0 || isUserInteracting.current) return;
    const lineY = lineOffsets.current[activeIndex];
    if (typeof lineY === 'number' && scrollRef.current) {
      const targetY = Math.max(0, lineY + (IMAGE_H - 60) + 160 - 150);
      scrollRef.current.scrollTo({ y: targetY, animated: true });
    }
  }, [isKaraoke, activeIndex]);

  const toggleKaraoke = () => {
    const next = !isKaraoke;
    setIsKaraoke(next);
    setToastMsg(next ? 'Sing-Along ON (Preview) • Tap lines to seek' : 'Sing-Along OFF');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handleLineSeek = (lineTime) => {
    if (!song.mp3_url) return;
    player.seekTo(lineTime);
    if (!player.playing) {
      player.play();
    }
  };

  const renderAudioStatusCard = () => {
    // 1. No audio provided
    if (!song.mp3_url) {
      return (
        <View style={[styles.audioStatusCard, styles.audioStatusCardNone]}>
          <View style={[styles.audioStatusIconCircle, styles.audioStatusIconCircleNone]}>
            <Info size={17} color={colors.textMuted} />
          </View>
          <View style={styles.audioStatusContent}>
            <Text style={[styles.audioStatusTitle, { color: colors.textMuted }]}>Lyrics Only</Text>
            <Text style={[styles.audioStatusDesc, { color: colors.textMuted }]}>No audio track is available for this song yet.</Text>
          </View>
        </View>
      );
    }

    // 2. Offline audio: song is downloaded or player loaded from offline storage
    if (isDownloaded || isAudioOffline) {
      return (
        <View style={[styles.audioStatusCard, styles.audioStatusCardOffline]}>
          <View style={[styles.audioStatusIconCircle, styles.audioStatusIconCircleOffline]}>
            <CheckCircle size={18} color={isDark ? '#86EFAC' : '#059669'} />
          </View>
          <View style={styles.audioStatusContent}>
            <View style={styles.audioStatusHeader}>
              <Text style={[styles.audioStatusTitle, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                {status.playing ? 'Playing Offline' : 'Saved Offline'}
              </Text>
              <View style={[styles.audioStatusBadge, styles.audioStatusBadgeOffline]}>
                <Text style={[styles.audioStatusBadgeText, { color: isDark ? '#86EFAC' : '#059669' }]}>OFFLINE</Text>
              </View>
            </View>
            <Text style={[styles.audioStatusDesc, { color: isDark ? '#94A3B8' : '#475569' }]}>
              Playing from device storage • Zero mobile data used
            </Text>
          </View>
        </View>
      );
    }

    // 3. No internet connection and song is not downloaded
    if (!isConnected) {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={async () => {
            try {
              const netState = await Network.getNetworkStateAsync();
              const connected = !!(netState.isConnected && netState.isInternetReachable !== false);
              setIsConnected(connected);
              setToastMsg(connected ? 'Connected to internet' : 'Still offline • Check your Wi-Fi or data');
              setShowToast(true);
            } catch (_) {}
          }}
          style={[styles.audioStatusCard, styles.audioStatusCardError]}
        >
          <View style={[styles.audioStatusIconCircle, styles.audioStatusIconCircleError]}>
            <WifiOff size={18} color={isDark ? '#FCA5A5' : '#DC2626'} />
          </View>
          <View style={styles.audioStatusContent}>
            <View style={styles.audioStatusHeader}>
              <Text style={[styles.audioStatusTitle, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                No Internet Connection
              </Text>
              <View style={[styles.audioStatusBadge, styles.audioStatusBadgeError]}>
                <Text style={[styles.audioStatusBadgeText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>OFFLINE</Text>
              </View>
            </View>
            <Text style={[styles.audioStatusDesc, { color: isDark ? '#CBD5E1' : '#64748B' }]}>
              Cannot stream audio • Connect to Wi-Fi/data or download songs when online
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    // 4. Online streaming over network
    return (
      <View style={[styles.audioStatusCard, styles.audioStatusCardOnline]}>
        <View style={[styles.audioStatusIconCircle, styles.audioStatusIconCircleOnline]}>
          <Wifi size={18} color={isDark ? '#C4B5FD' : '#6D28D9'} />
        </View>
        <View style={styles.audioStatusContent}>
          <View style={styles.audioStatusHeader}>
            <Text style={[styles.audioStatusTitle, { color: isDark ? '#DDD6FE' : '#4C1D95' }]}>
              {status.isBuffering ? 'Buffering Stream...' : status.playing ? 'Streaming Online' : 'Streaming Online'}
            </Text>
            <View style={[styles.audioStatusBadge, styles.audioStatusBadgeOnline]}>
              <Text style={[styles.audioStatusBadgeText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                {status.isBuffering ? 'BUFFERING' : 'ONLINE'}
              </Text>
            </View>
          </View>
          <Text style={[styles.audioStatusDesc, { color: isDark ? '#94A3B8' : '#475569' }]}>
            Streaming audio live over your active internet connection
          </Text>
        </View>
      </View>
    );
  };

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

        <View style={styles.floatingRightRow}>
          <TouchableOpacity
            style={[
              styles.floatingBtn,
              Boolean(sleepTimerOption) && styles.floatingBtnTimerActive,
            ]}
            onPress={() => setShowSleepTimerModal(true)}
            accessibilityRole="button"
            accessibilityLabel={
              sleepTimerOption
                ? `Sleep timer active: ${
                    sleepTimerOption === 'end_of_song'
                      ? 'End of song'
                      : sleepTimerRemainingSec
                      ? Math.ceil(sleepTimerRemainingSec / 60) + ' min left'
                      : sleepTimerOption + ' min'
                  }`
                : 'Set sleep timer'
            }
            activeOpacity={0.75}
          >
            <Moon
              color={sleepTimerOption ? '#A78BFA' : '#FFF'}
              size={19}
              fill={sleepTimerOption ? '#A78BFA' : 'transparent'}
            />
            {Boolean(sleepTimerOption && sleepTimerRemainingSec) && (
              <View style={styles.floatingTimerBadge}>
                <Text style={styles.floatingTimerBadgeText}>
                  {sleepTimerRemainingSec >= 60
                    ? `${Math.ceil(sleepTimerRemainingSec / 60)}m`
                    : `${sleepTimerRemainingSec}s`}
                </Text>
              </View>
            )}
            {Boolean(sleepTimerOption === 'end_of_song') && (
              <View style={styles.floatingTimerBadge}>
                <Text style={styles.floatingTimerBadgeText}>End</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.floatingBtn,
              isDownloaded && styles.floatingBtnDownloaded,
            ]}
            onPress={handleToggleDownload}
            accessibilityRole="button"
            accessibilityLabel={isDownloaded ? "Saved offline. Tap to remove" : "Download for offline listening"}
            activeOpacity={0.75}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : isDownloaded ? (
              <CheckCircle color="#86EFAC" size={20} />
            ) : (
              <Download color="#FFF" size={20} />
            )}
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
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        ref={scrollRef}
        style={{ zIndex: 2 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isUserInteracting.current = true;
          if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
        }}
        onScrollEndDrag={() => {
          if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
          interactionTimeout.current = setTimeout(() => {
            isUserInteracting.current = false;
          }, 3500);
        }}
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
                accessibilityLabel="Rewind 10 seconds"
                activeOpacity={0.7}
              >
                <Replay10Icon color={colors.textMuted} size={28} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playBtn}
                accessibilityRole="button"
                accessibilityLabel="Play or pause audio"
                onPress={handlePlayPause}
                activeOpacity={0.8}
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
                accessibilityLabel="Forward 10 seconds"
                activeOpacity={0.7}
              >
                <Forward10Icon color={colors.textMuted} size={28} />
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
          {/* Font Size Segmented Control */}
          <View style={styles.fontSegmentWrap}>
            <TouchableOpacity
              onPress={() => changeFontSize(-1)}
              style={styles.fontSegmentBtn}
              disabled={settings.fontSizeIdx === 0}
              accessibilityRole="button"
              accessibilityLabel="Decrease lyrics font size"
              activeOpacity={0.7}
            >
              <Minus color={settings.fontSizeIdx === 0 ? (isDark ? '#475569' : '#CBD5E1') : colors.textMuted} size={14} />
              <Text style={[styles.fontSegmentLabel, settings.fontSizeIdx === 0 && { color: isDark ? '#475569' : '#CBD5E1' }]}>A</Text>
            </TouchableOpacity>

            <View style={styles.fontSegmentDivider} />

            <TouchableOpacity
              onPress={() => changeFontSize(1)}
              style={styles.fontSegmentBtn}
              disabled={settings.fontSizeIdx === 2}
              accessibilityRole="button"
              accessibilityLabel="Increase lyrics font size"
              activeOpacity={0.7}
            >
              <Plus color={settings.fontSizeIdx === 2 ? (isDark ? '#475569' : '#CBD5E1') : colors.textMuted} size={14} />
              <Text style={[styles.fontSegmentLabel, { fontSize: 15 }, settings.fontSizeIdx === 2 && { color: isDark ? '#475569' : '#CBD5E1' }]}>A</Text>
            </TouchableOpacity>
          </View>

          {/* Sing-Along Mode Toggle */}
          <TouchableOpacity
            onPress={toggleKaraoke}
            style={[
              styles.singAlongBtn,
              isKaraoke && styles.singAlongBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle Sing-Along mode"
            activeOpacity={0.8}
          >
            <Mic
              color={isKaraoke ? '#FFFFFF' : colors.textMuted}
              size={15}
            />
            <Text
              style={[
                styles.singAlongBtnText,
                isKaraoke ? styles.singAlongBtnTextActive : { color: colors.textMuted },
              ]}
            >
              {isKaraoke ? 'Sing-Along ON' : 'Sing-Along'}
            </Text>
          </TouchableOpacity>

          {/* Action Buttons: Playlist, WhatsApp Status & Report Issue */}
          <View style={styles.toolbarActions}>
            <TouchableOpacity
              onPress={() => setShowPlaylistModal(true)}
              style={styles.playlistIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Add to playlist"
              activeOpacity={0.75}
            >
              <ListPlus color={colors.purpleAccent} size={19} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowStatusModal(true)}
              style={styles.whatsappIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Share quote to WhatsApp Status"
              activeOpacity={0.75}
            >
              <WhatsAppIcon color="#25D366" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowReport(true); setReportIssue(null); setReportNote(''); setReportDone(false); }}
              style={styles.reportIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Report an issue with this song"
              activeOpacity={0.75}
            >
              <Flag color="#F87171" size={17} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Audio Source & Connection Indicator Card ── */}
        <View style={styles.audioStatusCardWrap}>
          {renderAudioStatusCard()}
        </View>

        {/* ── Lyrics Body ── */}
        <View style={styles.lyricsBody}>
          {song.lyrics ? (
            isKaraoke ? (
                            <View style={styles.karaokeContainer}>
                {/* ── Sing-Along Preview Notice ── */}
                <View style={styles.karaokeBetaBanner}>
                  <View style={styles.karaokeBetaHeader}>
                    <View style={styles.karaokeBetaTag}>
                      <Info size={14} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                      <Text style={styles.karaokeBetaTagText}>Sing-Along Preview</Text>
                    </View>
                    <Text style={styles.karaokeBetaTip}>Tap lines to jump audio</Text>
                  </View>
                  <Text style={styles.karaokeBetaDesc}>
                    Line syncing is currently in development and may not be 100% accurate for every song yet. We’re actively refining it!
                  </Text>
                </View>

                {syncedLines.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const isPast = idx < activeIndex;
                  if (item.isHeader) {
                    return (
                      <View
                        key={idx}
                        onLayout={(e) => {
                          lineOffsets.current[idx] = e.nativeEvent.layout.y;
                        }}
                        style={styles.karaokeHeaderWrap}
                      >
                        <Text style={styles.karaokeHeaderText}>{item.text}</Text>
                      </View>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={idx}
                      onLayout={(e) => {
                        lineOffsets.current[idx] = e.nativeEvent.layout.y;
                      }}
                      onPress={() => handleLineSeek(item.time)}
                      activeOpacity={0.7}
                      style={[
                        styles.karaokeLine,
                        isActive && styles.karaokeLineActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.karaokeLineText,
                          { fontSize: FONT_SIZES[settings.fontSizeIdx] + (isActive ? 2 : 0), lineHeight: LINE_HEIGHTS[settings.fontSizeIdx] },
                          isActive
                            ? styles.karaokeTextActive
                            : isPast
                              ? styles.karaokeTextPast
                              : styles.karaokeTextUpcoming,
                        ]}
                        textBreakStrategy="simple"
                        android_hyphenationFrequency="none"
                      >
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
            <>
              <RenderHTML
                contentWidth={width - 48}
                source={{ html: splitLyrics.part1 }}
                baseStyle={{
                  color: colors.textWhite,
                  fontSize: FONT_SIZES[settings.fontSizeIdx],
                  lineHeight: 28,
                }}
                tagsStyles={{
                  p: { marginBottom: 18 },
                  br: { height: 8 },
                }}
                renderersProps={{
                  p: { 
                    allowFontScaling: false,
                    textBreakStrategy: 'simple',
                    android_hyphenationFrequency: 'none',
                  },
                }}
                defaultTextProps={{ 
                  allowFontScaling: false,
                  textBreakStrategy: 'simple',
                  android_hyphenationFrequency: 'none',
                }}
              />

              {/* Mid-Lyrics Native Ad between verses */}
              {splitLyrics.part2 ? (
                <>
                  <NativeAdCard style={{ marginHorizontal: -12, marginVertical: 14 }} />
                  <RenderHTML
                    contentWidth={width - 48}
                    source={{ html: splitLyrics.part2 }}
                    baseStyle={{
                      color: colors.textWhite,
                      fontSize: FONT_SIZES[settings.fontSizeIdx],
                      lineHeight: LINE_HEIGHTS[settings.fontSizeIdx],
                    }}
                    tagsStyles={{
                      p: { marginBottom: 18 },
                      br: { height: 8 },
                    }}
                    renderersProps={{
                  p: { 
                    allowFontScaling: false,
                    textBreakStrategy: 'simple',
                    android_hyphenationFrequency: 'none',
                  },
                }}
                defaultTextProps={{ 
                  allowFontScaling: false,
                  textBreakStrategy: 'simple',
                  android_hyphenationFrequency: 'none',
                }}
                  />
                </>
              ) : null}
            </>
            )
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

        {/* ── Share to WhatsApp Status CTA Banner ── */}
        <TouchableOpacity
          style={styles.statusCtaBanner}
          onPress={() => setShowStatusModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.statusCtaIconWrap}>
            <WhatsAppIcon size={20} color="#25D366" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.statusCtaTitle}>Share to WhatsApp Status</Text>
            <Text style={styles.statusCtaSub}>Share an encouraging lyric quote card</Text>
          </View>
          <ChevronRightSm size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* ── Native Ad Card (shown at bottom if lyrics were short/unsplit) ── */}
        {!splitLyrics.part2 && (
          <NativeAdCard style={{ marginTop: 8, marginBottom: 8 }} />
        )}

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

      {/* ── Ad Banner ── */}
      <AdBanner />

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

      {/* ── Sleep Timer Modal ── */}
      <Modal
        visible={showSleepTimerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSleepTimerModal(false)}
      >
        <TouchableOpacity
          style={styles.sleepModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSleepTimerModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.sleepModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sleepModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Moon size={20} color="#A78BFA" fill="#A78BFA" />
                <Text style={styles.sleepModalTitle}>Sleep Timer</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSleepTimerModal(false)}
                style={styles.sleepModalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close sleep timer modal"
              >
                <X size={18} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sleepModalSubtitle}>
              Audio playback will gently pause once the timer completes.
            </Text>

            {Boolean(sleepTimerOption && sleepTimerRemainingSec) && (
              <View style={styles.sleepModalCountdownRow}>
                <Text style={styles.sleepModalCountdownText}>
                  Time remaining: {Math.floor(sleepTimerRemainingSec / 60)}:
                  {String(sleepTimerRemainingSec % 60).padStart(2, '0')}
                </Text>
              </View>
            )}

            <View style={styles.sleepModalOptionsList}>
              {[
                { key: '15', label: '15 minutes' },
                { key: '30', label: '30 minutes' },
                { key: '45', label: '45 minutes' },
                { key: '60', label: '60 minutes' },
                { key: 'end_of_song', label: 'End of current song' },
              ].map((opt) => {
                const isSelected = sleepTimerOption === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.sleepOptionBtn,
                      isSelected && styles.sleepOptionBtnSelected,
                    ]}
                    onPress={() => {
                      setSleepTimer(opt.key);
                      setShowSleepTimerModal(false);
                      setToastMsg(
                        opt.key === 'end_of_song'
                          ? 'Sleep timer set for end of song'
                          : `Sleep timer set for ${opt.label}`
                      );
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 2200);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sleepOptionText,
                        isSelected && styles.sleepOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <CheckCircle size={18} color="#A78BFA" />}
                  </TouchableOpacity>
                );
              })}

              {Boolean(sleepTimerOption) && (
                <TouchableOpacity
                  style={styles.sleepTurnOffBtn}
                  onPress={() => {
                    clearSleepTimer();
                    setShowSleepTimerModal(false);
                    setToastMsg('Sleep timer turned off');
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2200);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sleepTurnOffText}>Turn Off Timer</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Add to Playlist Modal ── */}
      <AddToPlaylistModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        song={song}
        onToast={(msg) => {
          setToastMsg(msg);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2200);
        }}
      />

      {/* ── Toast notification ── */}
      <Toast visible={showToast} message={toastMsg} />

      {/* ── WhatsApp Status Card Modal ── */}
      <WhatsAppStatusCardModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        song={song}
      />
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
  floatingRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingBtnDownloaded: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(134, 239, 172, 0.45)' : 'rgba(16, 185, 129, 0.35)',
  },
  floatingBtnTimerActive: {
    backgroundColor: isDark ? 'rgba(167, 139, 250, 0.28)' : 'rgba(167, 139, 250, 0.20)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(167, 139, 250, 0.60)' : 'rgba(167, 139, 250, 0.45)',
  },
  floatingTimerBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTimerBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
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
  singAlongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    gap: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  singAlongBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#A78BFA',
  },
  singAlongBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  singAlongBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  karaokeContainer: {
    paddingVertical: 6,
  },
  karaokeBetaBanner: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(167, 139, 250, 0.25)' : 'rgba(139, 92, 246, 0.20)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  karaokeBetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  karaokeBetaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  karaokeBetaTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? '#C4B5FD' : '#7C3AED',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  karaokeBetaTip: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  karaokeBetaDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    fontWeight: '400',
  },
  karaokeHeaderWrap: {
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  karaokeHeaderText: {
    color: isDark ? '#C4B5FD' : '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  karaokeLine: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 3,
  },
  karaokeLineActive: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.20)' : 'rgba(139, 92, 246, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#A78BFA',
  },
  karaokeLineText: {
    lineHeight: 28,
  },
  karaokeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  karaokeTextPast: {
    color: isDark ? '#E2E8F0' : '#334155',
    opacity: 0.85,
    fontWeight: '500',
  },
  karaokeTextUpcoming: {
    color: isDark ? '#94A3B8' : '#64748B',
    opacity: 0.40,
    fontWeight: '400',
  },
  fontSegmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    height: 36,
  },
  fontSegmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    height: '100%',
    gap: 3,
  },
  fontSegmentDivider: {
    width: 1,
    height: 16,
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
  },
  fontSegmentLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadIconBtn: {
    width: 38,
    height: 36,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadIconBtnActive: {
    backgroundColor: isDark ? 'rgba(37, 211, 102, 0.15)' : 'rgba(37, 211, 102, 0.10)',
    borderColor: isDark ? 'rgba(37, 211, 102, 0.3)' : 'rgba(37, 211, 102, 0.25)',
  },
  playlistIconBtn: {
    width: 38,
    height: 36,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.10)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappIconBtn: {
    width: 38,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportIconBtn: {
    width: 38,
    height: 36,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(248, 113, 113, 0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(248, 113, 113, 0.2)' : 'rgba(248, 113, 113, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Audio Source & Connection Status Card ──
  audioStatusCardWrap: {
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  audioStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    gap: 12,
  },
  audioStatusCardOffline: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.08)',
    borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.20)',
  },
  audioStatusCardOnline: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.10)' : 'rgba(139, 92, 246, 0.07)',
    borderColor: isDark ? 'rgba(167, 139, 250, 0.22)' : 'rgba(139, 92, 246, 0.20)',
  },
  audioStatusCardError: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
    borderColor: isDark ? 'rgba(248, 113, 113, 0.30)' : 'rgba(239, 68, 68, 0.22)',
  },
  audioStatusCardNone: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
  },
  audioStatusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioStatusIconCircleOffline: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.15)',
  },
  audioStatusIconCircleOnline: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.15)',
  },
  audioStatusIconCircleError: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.15)',
  },
  audioStatusIconCircleNone: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
  },
  audioStatusContent: {
    flex: 1,
  },
  audioStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  audioStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  audioStatusDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  audioStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  audioStatusBadgeOffline: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.15)',
  },
  audioStatusBadgeOnline: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.20)' : 'rgba(139, 92, 246, 0.14)',
  },
  audioStatusBadgeError: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.15)',
  },
  audioStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
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

  // ── Status CTA Banner ──
  statusCtaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(37, 211, 102, 0.1)' : 'rgba(37, 211, 102, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.25)',
  },
  statusCtaIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 211, 102, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCtaTitle: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusCtaSub: {
    color: colors.textMuted,
    fontSize: 12,
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

  // ── Sleep Timer Modal ──
  sleepModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sleepModalCard: {
    backgroundColor: isDark ? '#18181B' : '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderWidth: 1,
    borderColor: isDark ? '#27272A' : '#E4E4E7',
  },
  sleepModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sleepModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textWhite,
  },
  sleepModalCloseBtn: {
    padding: 6,
  },
  sleepModalSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  sleepModalCountdownRow: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.10)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
  },
  sleepModalCountdownText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '600',
  },
  sleepModalOptionsList: {
    gap: 8,
  },
  sleepOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: isDark ? '#27272A' : '#F4F4F5',
  },
  sleepOptionBtnSelected: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.22)' : 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  sleepOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textWhite,
  },
  sleepOptionTextSelected: {
    color: '#A78BFA',
    fontWeight: '700',
  },
  sleepTurnOffBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  sleepTurnOffText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
  },
});
