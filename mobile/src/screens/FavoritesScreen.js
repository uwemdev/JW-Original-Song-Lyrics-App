import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Heart,
  Search,
  X,
  Music,
  ChevronRight,
  Undo2,
  ListMusic,
  Plus,
} from 'lucide-react-native';
import { usePlaylists } from '../context/PlaylistContext';
import { useAudio } from '../context/AudioContext';
import { getDownloadedSongsMap, formatBytes } from '../lib/offlineManager';
import { CloudDownload, HardDrive } from 'lucide-react-native';
import { Modal, KeyboardAvoidingView } from 'react-native';
import { useSettings } from '../context/SettingsContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const STATUS_BAR_H = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 32;

// ─── Palette (removed) ───
// ─── Sort options ────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'recent', label: 'Recently added' },
  { key: 'az', label: 'A – Z' },
  { key: 'category', label: 'By category' },
];

// ─── Shimmer placeholder ────────────────────────────────────────
function Shimmer({ w, h, radius = 8, style }) {
  const { isDark } = useSettings();
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: radius, backgroundColor: isDark ? '#1F2937' : '#E2E8F0', opacity: anim }, style]}
    />
  );
}

// ─── Image with fallback ─────────────────────────────────────────
function SongImage({ uri, style, iconSize = 20 }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, styles.imgFallback]}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: iconSize, height: iconSize, opacity: 0.35 }}
          resizeMode="contain"
        />
      </View>
    );
  }
  return (
    <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)} />
  );
}

// ─── Heart button with bounce ────────────────────────────────────
function HeartButton({ isFav, onToggle }) {
  const { colors } = useSettings();
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
        <Heart
          size={20}
          color={isFav ? '#EC4899' : colors.textMuted}
          fill={isFav ? '#EC4899' : 'transparent'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Undo toast ──────────────────────────────────────────────────
function UndoToast({ visible, onUndo }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 30, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.undoToast, { opacity, transform: [{ translateY: slideY }] }]}>
      <Text style={styles.undoToastText}>Removed from favorites</Text>
      <TouchableOpacity onPress={onUndo} style={styles.undoBtn}>
        <Undo2 size={14} color={colors.purpleAccent} />
        <Text style={styles.undoBtnText}>Undo</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FAVORITES SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function FavoritesScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'playlists'
  const { playlists, createPlaylist } = usePlaylists();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [favSongs, setFavSongs] = useState([]);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const { playSong } = useAudio();

  const loadOfflineSongs = useCallback(async () => {
    try {
      const map = await getDownloadedSongsMap();
      const list = Object.values(map).sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
      setDownloadedSongs(list);
    } catch (_) {
      setDownloadedSongs([]);
    }
  }, []);
  const [favIds, setFavIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState('recent');
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoSong, setUndoSong] = useState(null);

  const searchInputRef = useRef(null);
  const undoTimer = useRef(null);

  // ── Load favorites & fetch songs ──
  const loadFavorites = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@favorites');
      let ids = raw ? JSON.parse(raw) : [];

      // Handle both array format [id1, id2] and object format {id1: true}
      if (!Array.isArray(ids)) {
        ids = Object.keys(ids).filter((k) => ids[k]);
      }

      if (ids.length === 0) {
        setFavIds([]);
        setFavSongs([]);
        setLoading(false);
        return;
      }

      setFavIds(ids);

      // Fetch fresh song data from Supabase
      const { data, error } = await supabase
        .from('songs')
        .select('*, categories(name)')
        .in('id', ids)
        .eq('is_published', true);

      if (error) throw error;

      const songs = data || [];

      // Remove any deleted/unpublished songs from local storage
      const validIds = songs.map((s) => s.id);
      const cleanedIds = ids.filter((id) => validIds.includes(id));
      if (cleanedIds.length !== ids.length) {
        await AsyncStorage.setItem('@favorites', JSON.stringify(cleanedIds));
        setFavIds(cleanedIds);
      }

      // Maintain the order from favIds (most recently added last)
      const songMap = {};
      songs.forEach((s) => { songMap[s.id] = s; });
      const orderedSongs = cleanedIds
        .map((id) => songMap[id])
        .filter(Boolean)
        .reverse(); // newest additions first

      setFavSongs(orderedSongs);
    } catch (err) {
      console.error('Favorites load error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFavorites();
    loadOfflineSongs();
  }, []);

  // Re-load on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
      loadOfflineSongs();
    });
    return unsubscribe;
  }, [navigation, loadFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, [loadFavorites]);

  // ── Remove favorite ──
  const removeFavorite = async (songId) => {
    const removed = favSongs.find((s) => s.id === songId);
    setUndoSong(removed);

    // Optimistic UI update
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFavSongs((prev) => prev.filter((s) => s.id !== songId));
    setFavIds((prev) => prev.filter((id) => id !== songId));

    // Update storage
    try {
      const raw = await AsyncStorage.getItem('@favorites');
      let ids = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ids)) {
        ids = Object.keys(ids).filter((k) => ids[k]);
      }
      ids = ids.filter((id) => id !== songId);
      await AsyncStorage.setItem('@favorites', JSON.stringify(ids));
    } catch (_) {}

    // Show undo toast
    setUndoVisible(true);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      setUndoVisible(false);
      setUndoSong(null);
    }, 4000);
  };

  // ── Undo removal ──
  const handleUndo = async () => {
    if (!undoSong) return;
    clearTimeout(undoTimer.current);
    setUndoVisible(false);

    // Re-add to state
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFavSongs((prev) => [undoSong, ...prev]);
    setFavIds((prev) => [...prev, undoSong.id]);

    // Re-add to storage
    try {
      const raw = await AsyncStorage.getItem('@favorites');
      let ids = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ids)) {
        ids = Object.keys(ids).filter((k) => ids[k]);
      }
      if (!ids.includes(undoSong.id)) ids.push(undoSong.id);
      await AsyncStorage.setItem('@favorites', JSON.stringify(ids));
    } catch (_) {}

    setUndoSong(null);
  };

  // ── Sorted & filtered songs ──
  const displaySongs = useMemo(() => {
    let list = [...favSongs];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.categories?.name?.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sortKey) {
      case 'az':
        list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'category':
        list.sort((a, b) =>
          (a.categories?.name || '').localeCompare(b.categories?.name || ''),
        );
        break;
      default: // 'recent' — already reverse-chronological
        break;
    }

    return list;
  }, [favSongs, searchQuery, sortKey]);

  const navigateToSong = (song) => navigation.navigate('Song', { song, queue: favSongs });
  const navigateToCategory = (song) =>
    navigation.navigate('Category', {
      categoryId: song.category_id,
      categoryName: song.categories?.name || 'Category',
    });

  // ── Empty state ──
  function renderEmptyState() {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconCircle}>
          <Heart size={48} color={colors.purpleAccent} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No favorites yet</Text>
        <Text style={styles.emptySubtext}>
          Tap the heart on any song to save it here
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('Categories')}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyBtnText}>Browse Categories</Text>
          <ChevronRight color="#FFF" size={18} />
        </TouchableOpacity>
      </View>
    );
  }

  // ── Song row ──
  function renderSongRow({ item: song }) {
    const catName = song.categories?.name || 'Song';

    return (
      <TouchableOpacity
        style={styles.songRow}
        activeOpacity={0.7}
        onPress={() => navigateToSong(song)}
      >
        <SongImage uri={song.feature_image_url} style={styles.songRowImg} iconSize={18} />
        <View style={styles.songRowInfo}>
          <Text style={styles.songRowTitle} numberOfLines={1}>
            {song.title}
          </Text>
          <TouchableOpacity onPress={() => navigateToCategory(song)} activeOpacity={0.6}>
            <Text style={styles.songRowCat} numberOfLines={1}>
              {catName}
            </Text>
          </TouchableOpacity>
        </View>
        <HeartButton isFav={true} onToggle={() => removeFavorite(song.id)} />
      </TouchableOpacity>
    );
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        <View style={styles.headerWrap}>
          <View>
            <Shimmer w={140} h={28} style={{ marginBottom: 8 }} />
            <Shimmer w={100} h={16} />
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Shimmer w={56} h={56} radius={12} />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Shimmer w={160} h={16} style={{ marginBottom: 6 }} />
                <Shimmer w={80} h={12} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Main render ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.headerWrap}>
        <View>
          <Text style={styles.headerTitle}>
            {activeTab === 'favorites' ? 'Favorites' : activeTab === 'playlists' ? 'Playlists' : 'Offline Music'}
          </Text>
          <Text style={styles.headerSubtext}>
            {activeTab === 'favorites'
              ? `${favSongs.length} saved song${favSongs.length !== 1 ? 's' : ''}`
              : activeTab === 'playlists'
                ? `${playlists.length} custom collection${playlists.length !== 1 ? 's' : ''}`
                : `${downloadedSongs.length} song${downloadedSongs.length !== 1 ? 's' : ''} saved on device`}
          </Text>
        </View>

        {activeTab === 'favorites' ? (
          <TouchableOpacity
            style={styles.searchIcon}
            onPress={() => {
              setSearchActive(!searchActive);
              if (!searchActive) {
                setTimeout(() => searchInputRef.current?.focus(), 150);
              } else {
                setSearchQuery('');
              }
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {searchActive ? (
              <X size={22} color={colors.textWhite} />
            ) : (
              <Search size={22} color={colors.textWhite} />
            )}
          </TouchableOpacity>
        ) : activeTab === 'playlists' ? (
          <TouchableOpacity
            style={[styles.newPlaylistTopBtn, { backgroundColor: colors.purple }]}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFF" strokeWidth={2.5} />
            <Text style={styles.newPlaylistTopBtnText}>New</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.manageStorageBtn, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.10)', borderColor: colors.purpleAccent }]}
            onPress={() => navigation.navigate('StorageSettings')}
            activeOpacity={0.8}
          >
            <HardDrive size={15} color={colors.purpleAccent} />
            <Text style={[styles.manageStorageBtnText, { color: colors.purpleAccent }]}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Segmented Control: Liked Songs vs Playlists vs Offline ── */}
      <View style={[styles.segmentWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'favorites' && { backgroundColor: colors.purple }]}
          onPress={() => setActiveTab('favorites')}
          activeOpacity={0.8}
        >
          <Heart size={13} color={activeTab === 'favorites' ? '#FFF' : colors.textMuted} fill={activeTab === 'favorites' ? '#FFF' : 'transparent'} />
          <Text style={[styles.segmentBtnText, activeTab === 'favorites' && styles.segmentBtnTextActive]}>
            Liked ({favSongs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'playlists' && { backgroundColor: colors.purple }]}
          onPress={() => setActiveTab('playlists')}
          activeOpacity={0.8}
        >
          <ListMusic size={14} color={activeTab === 'playlists' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.segmentBtnText, activeTab === 'playlists' && styles.segmentBtnTextActive]}>
            Playlists ({playlists.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'offline' && { backgroundColor: colors.purple }]}
          onPress={() => { setActiveTab('offline'); loadOfflineSongs(); }}
          activeOpacity={0.8}
        >
          <CloudDownload size={14} color={activeTab === 'offline' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.segmentBtnText, activeTab === 'offline' && styles.segmentBtnTextActive]}>
            Offline ({downloadedSongs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Main Content Area ── */}
      {activeTab === 'playlists' ? (
        <FlatList
          data={playlists}
          keyExtractor={(pl) => pl.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130, paddingTop: 4 }}
          ListHeaderComponent={
            <TouchableOpacity
              style={[styles.createPlaylistCard, { borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)' }]}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.createPlaylistCardIcon, { backgroundColor: 'rgba(109, 40, 217, 0.15)' }]}>
                <Plus size={22} color={colors.purpleAccent} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.createPlaylistCardTitle, { color: colors.purpleAccent }]}>
                  Create New Playlist
                </Text>
                <Text style={[styles.createPlaylistCardSub, { color: colors.textMuted }]}>
                  Group songs for family worship, singing practice, or commutes
                </Text>
              </View>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.playlistCard, { backgroundColor: colors.cardBg, borderColor: colors.divider }]}
              onPress={() => navigation.navigate('Playlist', { playlistId: item.id })}
              activeOpacity={0.7}
            >
              <View style={[styles.playlistCardIcon, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]}>
                <ListMusic size={24} color={colors.purpleAccent} />
              </View>
              <View style={styles.playlistCardInfo}>
                <Text style={[styles.playlistCardTitle, { color: colors.textWhite }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.playlistCardMeta, { color: colors.textMuted }]}>
                  {item.songIds?.length || 0} {(item.songIds?.length || 0) === 1 ? 'song' : 'songs'}
                  {item.description ? ` • ${item.description}` : ''}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      ) : activeTab === 'offline' ? (
        <FlatList
          data={downloadedSongs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)' }]}>
                <CloudDownload size={42} color={colors.purpleAccent} />
              </View>
              <Text style={styles.emptyTitle}>No offline songs yet</Text>
              <Text style={styles.emptySubtext}>
                Download songs to listen with 0% data usage anywhere. Files stay private inside the app.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setActiveTab('favorites')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>View Liked Songs</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.offlineSongRow, { backgroundColor: colors.cardBg, borderColor: colors.divider }]}
              onPress={() => {
                playSong(item, downloadedSongs);
                navigation.navigate('Song', { song: item, queue: downloadedSongs });
              }}
              activeOpacity={0.7}
            >
              {item.feature_image_url ? (
                <Image source={{ uri: item.feature_image_url }} style={styles.songRowImg} resizeMode="cover" />
              ) : (
                <View style={[styles.songRowImg, styles.songRowFallback, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                  <Music size={18} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.songRowInfo}>
                <Text style={styles.songRowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Text style={styles.songRowCategory} numberOfLines={1}>
                    {item.category_name || 'Original Song'}
                  </Text>
                  <Text style={[styles.songRowCategory, { marginHorizontal: 4 }]}>•</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.purpleAccent }}>
                    {formatBytes(item.sizeBytes)}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <>
          {/* Search bar */}
          {searchActive && (
            <View style={styles.searchBar}>
              <Search size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search favorites..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
                accessibilityLabel="Search within favorites"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Sort pills */}
          {favSongs.length > 0 && (
            <View style={styles.sortRow}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortPill, sortKey === opt.key && styles.sortPillActive]}
                  onPress={() => setSortKey(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.sortPillText, sortKey === opt.key && styles.sortPillTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Liked songs list */}
          {favSongs.length === 0 ? (
            renderEmptyState()
          ) : displaySongs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptySubtext}>
                No favorites match "{searchQuery}"
              </Text>
            </View>
          ) : (
            <FlatList
              data={displaySongs}
              keyExtractor={(s) => s.id}
              renderItem={renderSongRow}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 }}
              showsVerticalScrollIndicator={false}
              onRefresh={onRefresh}
              refreshing={refreshing}
            />
          )}
        </>
      )}

      {/* ── Create Playlist Modal ── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.createModalBox, { backgroundColor: colors.cardBg, borderColor: colors.divider }]}>
            <View style={styles.createModalHeader}>
              <Text style={[styles.createModalTitle, { color: colors.textWhite }]}>New Playlist</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { color: colors.textWhite, borderColor: colors.divider }]}
              placeholder="Playlist name (e.g. Convention 2026)"
              placeholderTextColor={colors.textMuted}
              value={createName}
              onChangeText={setCreateName}
              autoFocus
              maxLength={40}
            />

            <TextInput
              style={[styles.modalInput, { color: colors.textWhite, borderColor: colors.divider, height: 64 }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={createDesc}
              onChangeText={setCreateDesc}
              multiline
              maxLength={120}
            />

            <View style={styles.createModalActions}>
              <TouchableOpacity
                onPress={() => { setShowCreateModal(false); setCreateName(''); setCreateDesc(''); }}
                style={styles.modalCancelBtn}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  const trimmed = createName.trim();
                  if (!trimmed) return;
                  const pl = await createPlaylist(trimmed, createDesc);
                  setShowCreateModal(false);
                  setCreateName('');
                  setCreateDesc('');
                  if (pl) {
                    navigation.navigate('Playlist', { playlistId: pl.id });
                  }
                }}
                disabled={!createName.trim()}
                style={[styles.modalSubmitBtn, { backgroundColor: colors.purple, opacity: createName.trim() ? 1 : 0.5 }]}
              >
                <Text style={styles.modalSubmitBtnText}>Create Playlist</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Undo toast ── */}
      <UndoToast visible={undoVisible} onUndo={handleUndo} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const makeStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },


  // ── Playlists & Segments ──
  newPlaylistTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  newPlaylistTopBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  createPlaylistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
    gap: 12,
  },
  createPlaylistCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPlaylistCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  createPlaylistCardSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  playlistCardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  playlistCardInfo: {
    flex: 1,
  },
  playlistCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  playlistCardMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  createModalBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  createModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalSubmitBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalSubmitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },


  manageStorageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  manageStorageBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  offlineSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },

  // ── Header ──
  headerWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: STATUS_BAR_H + 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textWhite,
    letterSpacing: -0.3,
  },
  headerSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(109, 40, 217, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  // ── Search bar ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderWidth: 1,
    borderColor: 'rgba(109, 40, 217, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textWhite,
    fontWeight: '500',
  },

  // ── Sort ──
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
  },
  sortPillActive: {
    backgroundColor: 'rgba(109, 40, 217, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(109, 40, 217, 0.5)',
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  sortPillTextActive: {
    color: colors.purpleAccent,
  },

  // ── Song row ──
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  songRowImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
  },
  imgFallback: {
    backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songRowInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  songRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 3,
  },
  songRowCat: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.purpleAccent,
  },

  // ── Empty state ──
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(109, 40, 217, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(109, 40, 217, 0.2)',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textWhite,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: colors.purple,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginRight: 6,
  },

  // ── Undo toast ──
  undoToast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90,
    left: 20,
    right: 20,
    backgroundColor: '#1E1B2E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(109, 40, 217, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  undoToastText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(109, 40, 217, 0.2)',
    borderRadius: 20,
  },
  undoBtnText: {
    color: colors.purpleAccent,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
  },
});
