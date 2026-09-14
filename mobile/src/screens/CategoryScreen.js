import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  TextInput,
  Animated,
  Platform,
  StatusBar,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Search,
  Heart,
  Music,
  Grid,
  List,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

// ─── Palette (removed) ───
// ─── Layout ──────────────────────────────────────────────────────
const SIDE_PAD = 16;
const GRID_GAP = 12;
const GRID_CARD_W = (width - SIDE_PAD * 2 - GRID_GAP) / 2;
const PAGE_SIZE = 15;
const BANNER_H = 260;
const STATUS_BAR_H = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 32;

// ─── Sort options ────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'az', label: 'A – Z' },
  { key: 'most_played', label: 'Most played' },
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
  const { colors } = useSettings();
  const styles = makeStyles(colors);
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

// ─── PressCard (scale animation) ─────────────────────────────────
function PressCard({ onPress, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  return (
    <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
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
          color={isFav ? '#F472B6' : colors.textMuted}
          fill={isFav ? '#F472B6' : 'transparent'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function CategoryScreen({ route, navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors);
  const { categoryId, categoryName, categoryImage } = route.params;

  // ── State ──
  const [songs, setSongs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [categoryInfo, setCategoryInfo] = useState(null);

  const [sortKey, setSortKey] = useState('newest');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [showSortPicker, setShowSortPicker] = useState(false);

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [favorites, setFavorites] = useState({});

  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);

  // ── Load favourites from AsyncStorage ──
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@favorites');
        if (raw) {
          const parsed = JSON.parse(raw);
          // Handle both array [id1, id2] and object {id: true} formats
          if (Array.isArray(parsed)) {
            const map = {};
            parsed.forEach((id) => { map[id] = true; });
            setFavorites(map);
          } else {
            setFavorites(parsed);
          }
        }
      } catch (_) {}
    })();
  }, []);

  const toggleFavorite = async (songId) => {
    const next = { ...favorites };
    if (next[songId]) {
      delete next[songId];
    } else {
      next[songId] = true;
    }
    setFavorites(next);
    // Always persist as array for consistency with SongScreen
    const ids = Object.keys(next).filter((k) => next[k]);
    await AsyncStorage.setItem('@favorites', JSON.stringify(ids));
  };

  // ── Fetch category info ──
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single();
        if (data) setCategoryInfo(data);
      } catch (_) {}
    })();
  }, [categoryId]);

  // ── Fetch songs ──
  const fetchSongs = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      try {
        // Build query
        let query = supabase
          .from('songs')
          .select('*', { count: 'exact' })
          .eq('category_id', categoryId)
          .eq('is_published', true);

        // Sort
        if (sortKey === 'az') {
          query = query.order('title', { ascending: true });
        } else {
          // newest or most_played (fallback to newest since no play_count yet)
          query = query.order('created_at', { ascending: false });
        }

        // Pagination
        const from = reset ? 0 : songs.length;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        const newSongs = data || [];
        if (reset) {
          setSongs(newSongs);
        } else {
          setSongs((prev) => [...prev, ...newSongs]);
        }
        if (count !== null && count !== undefined) setTotalCount(count);
        setHasMore(newSongs.length === PAGE_SIZE);
      } catch (err) {
        console.error('CategoryScreen fetch error:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [categoryId, sortKey, songs.length],
  );

  // Initial fetch + refetch on sort change
  useEffect(() => {
    fetchSongs(true);
  }, [categoryId, sortKey]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSongs(true);
    setRefreshing(false);
  }, [fetchSongs]);

  // Infinite scroll
  const onEndReached = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchSongs(false);
    }
  };

  // ── Filtered songs (scoped search) ──
  const displayedSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = searchQuery.toLowerCase().trim();
    return songs.filter(
      (s) =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.writeup || '').toLowerCase().includes(q),
    );
  }, [songs, searchQuery]);

  // ── Sort label ──
  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label || 'Sort';

  // ── View toggle ──
  const toggleView = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode((v) => (v === 'list' ? 'grid' : 'list'));
  };

  // ── Navigate ──
  const goToSong = (song) => navigation.navigate('Song', { song });

  // ═══════════════════════════════════════════════════════════════
  // RENDER ITEMS
  // ═══════════════════════════════════════════════════════════════

  // ── List row ──
  const renderListItem = ({ item }) => (
    <PressCard onPress={() => goToSong(item)} style={styles.listRow}>
      <SongImage uri={item.feature_image_url} style={styles.listThumb} iconSize={22} />
      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.listWriteup} numberOfLines={2}>
          {item.writeup
            ? item.writeup.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
            : 'Original Song'}
        </Text>
      </View>
      <HeartButton isFav={!!favorites[item.id]} onToggle={() => toggleFavorite(item.id)} />
    </PressCard>
  );

  // ── Grid card ──
  const renderGridItem = ({ item }) => (
    <PressCard onPress={() => goToSong(item)} style={styles.gridCard}>
      <SongImage uri={item.feature_image_url} style={styles.gridImg} iconSize={28} />
      <Text style={styles.gridTitle} numberOfLines={1}>
        {item.title}
      </Text>
    </PressCard>
  );

  // ── Skeleton rows ──
  const ListSkeleton = () => (
    <View style={{ paddingHorizontal: SIDE_PAD }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.listRow, { paddingVertical: 14 }]}>
          <Shimmer w={64} h={64} radius={12} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Shimmer w={160} h={16} radius={4} style={{ marginBottom: 8 }} />
            <Shimmer w={220} h={12} radius={4} style={{ marginBottom: 4 }} />
            <Shimmer w={180} h={12} radius={4} />
          </View>
        </View>
      ))}
    </View>
  );

  const GridSkeleton = () => (
    <View style={styles.gridContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.gridCard}>
          <Shimmer w={GRID_CARD_W} h={GRID_CARD_W} radius={14} />
          <Shimmer w={100} h={14} radius={4} style={{ marginTop: 10 }} />
        </View>
      ))}
    </View>
  );

  // ── Footer loading ──
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 16 }}>
          {viewMode === 'list' ? <ListSkeleton /> : <GridSkeleton />}
        </View>
      );
    }
    if (!hasMore || searchActive || songs.length === 0) {
      return <View style={{ height: 120 }} />;
    }
    
    return (
      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
        <TouchableOpacity 
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: 'rgba(109,40,217,0.2)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(109,40,217,0.5)',
            marginBottom: 40,
          }}
          onPress={() => fetchSongs(false)}
        >
          <Text style={{ color: '#A78BFA', fontWeight: '600', fontSize: 14 }}>
            Load More Songs
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Empty states ──
  const renderEmpty = () => {
    if (loading) return null;
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyWrap}>
          <Search color={colors.textMuted} size={36} />
          <Text style={styles.emptyTitle}>No songs found</Text>
          <Text style={styles.emptySubtitle}>
            No songs found for "{searchQuery}" in {categoryName}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 56, height: 56, opacity: 0.25, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>No songs here yet</Text>
        <Text style={styles.emptySubtitle}>Check back soon — new songs are on the way!</Text>
      </View>
    );
  };

  // ── Banner image source ──
  const bannerUri = categoryImage || categoryInfo?.image_url || null;

  // ═══════════════════════════════════════════════════════════════
  // HEADER COMPONENT (rendered inside FlatList as ListHeaderComponent)
  // ═══════════════════════════════════════════════════════════════
  const ListHeader = () => (
    <View>
      {/* ── Banner ── */}
      <View style={styles.banner}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={styles.bannerImg} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[colors.purple, '#3B0764']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerImg}
          >
            <Music color="rgba(255,255,255,0.2)" size={80} />
          </LinearGradient>
        )}
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', '#000000']}
          locations={[0.3, 0.7, 1]}
          style={styles.bannerOverlay}
        />

        {/* Floating nav buttons */}
        <View style={styles.floatingNav}>
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft color={'#FFFFFF'} size={22} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => navigation.navigate('Search', { categoryId, categoryName })}
            accessibilityRole="button"
            accessibilityLabel="Search in this category"
          >
            <Search color={'#FFFFFF'} size={20} />
          </TouchableOpacity>
        </View>

        {/* ── Category info (Moved inside banner) ── */}
        <View style={styles.catInfo}>
          <Text style={styles.catName}>{categoryName}</Text>
          <Text style={styles.catCount}>
            {totalCount} {totalCount === 1 ? 'song' : 'songs'}
          </Text>
          {categoryInfo?.description ? (
            <Text style={styles.catDesc}>{categoryInfo.description}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Search bar (conditional) ── */}


      {/* ── Sort / View toggle bar ── */}
      <View style={styles.sortBar}>
        {/* Sort picker */}
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowSortPicker(!showSortPicker)}
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${currentSortLabel}`}
        >
          <Text style={styles.sortBtnText}>{currentSortLabel}</Text>
          <ChevronDown color={colors.purpleAccent} size={16} />
        </TouchableOpacity>

        {/* View toggle */}
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={toggleView}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
        >
          {viewMode === 'list' ? (
            <Grid color={colors.purpleAccent} size={20} />
          ) : (
            <List color={colors.purpleAccent} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Sort picker dropdown ── */}
      {showSortPicker && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortOption, sortKey === opt.key && styles.sortOptionActive]}
              onPress={() => {
                setSortKey(opt.key);
                setShowSortPicker(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortKey === opt.key && styles.sortOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        {/* Banner skeleton */}
        <Shimmer w={width} h={BANNER_H} radius={0} />
        <View style={{ padding: SIDE_PAD, paddingTop: 20 }}>
          <Shimmer w={200} h={28} radius={6} style={{ marginBottom: 10 }} />
          <Shimmer w={80} h={16} radius={4} style={{ marginBottom: 24 }} />
        </View>
        <ListSkeleton />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {viewMode === 'list' ? (
        <FlatList
          data={displayedSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderListItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.purpleAccent}
              colors={[colors.purpleAccent]}
            />
          }
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
        />
      ) : (
        <FlatList
          data={displayedSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderGridItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.purpleAccent}
              colors={[colors.purpleAccent]}
            />
          }
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Banner ──
  banner: {
    height: BANNER_H,
    width: width,
    marginLeft: -SIDE_PAD,
    marginRight: -SIDE_PAD,
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingNav: {
    position: 'absolute',
    top: STATUS_BAR_H + 8,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Category info ──
  catInfo: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  catName: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  catCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  catDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // ── Search bar ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    color: colors.textWhite,
    fontSize: 15,
  },

  // ── Sort / View bar ──
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  sortBtnText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortDropdown: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)',
    overflow: 'hidden',
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(109,40,217,0.15)',
  },
  sortOptionText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: colors.purpleAccent,
    fontWeight: '700',
  },

  // ── List view ──
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  listThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  imgFallback: {
    backgroundColor: '#1F1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  listTitle: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  listWriteup: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Grid view ──
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  gridCard: {
    width: GRID_CARD_W,
  },
  gridImg: {
    width: GRID_CARD_W,
    height: GRID_CARD_W,
    borderRadius: 14,
  },
  gridTitle: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    paddingHorizontal: 2,
  },

  // ── Empty states ──
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
