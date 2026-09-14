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
  ScrollView,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search,
  ChevronRight,
  Heart,
  Play,
  Clock,
  Music,
  Disc3,
  Bell,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

// ─── Layout constants ────────────────────────────────────────────
const CARD_GAP = 8;
const GRID_PAD = 16;
const GRID_CARD_W = (width - GRID_PAD * 2 - CARD_GAP) / 2;
const SCROLL_CARD_W = 140;

// ─── Category gradient colours for fallback ──────────────────────
const CAT_GRADIENTS = [
  ['#8B5CF6', '#D946EF'],
  ['#3B82F6', '#06B6D4'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#3B82F6'],
  ['#6366F1', '#A855F7'],
  ['#F43F5E', '#F97316'],
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
      style={[
        { width: w, height: h, borderRadius: radius, backgroundColor: isDark ? '#1F2937' : '#E2E8F0', opacity: anim },
        style,
      ]}
    />
  );
}

// ─── Image with fallback ─────────────────────────────────────────
function SongImage({ uri, style, iconSize = 20 }) {
  const { colors } = useSettings();
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
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Pressable card wrapper (scale anim) ─────────────────────────
function PressCard({ onPress, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

// ─── Section header ──────────────────────────────────────────────
function SectionHeader({ title, onSeeAll }) {
  const { colors } = useSettings();
  const styles = makeStyles(colors, isDark);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={onSeeAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <ChevronRight color={colors.purpleAccent} size={16} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Horizontal song card ────────────────────────────────────────
function HScrollCard({ song, categoryName, onPress }) {
  const { colors } = useSettings();
  const styles = makeStyles(colors, isDark);
  return (
    <PressCard onPress={onPress} style={styles.hCard}>
      <SongImage uri={song.feature_image_url} style={styles.hCardImg} iconSize={24} />
      <Text style={styles.hCardTitle} numberOfLines={1}>{song.title}</Text>
      <Text style={styles.hCardSub} numberOfLines={1}>{categoryName}</Text>
    </PressCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);

  const [categories, setCategories] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [lastPlayed, setLastPlayed] = useState(null);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);

  // ── Data fetch ──
  const fetchData = useCallback(async () => {
    try {
      const [catRes, songRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase
          .from('songs')
          .select('*, categories(name)')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (songRes.data) setSongs(songRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  const checkUnreadNotifs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== '42P01') {
        return;
      }

      if (data) {
        const latestTime = new Date(data.created_at).getTime();
        const lastReadTimeStr = await AsyncStorage.getItem('@last_read_notification_time');
        const lastReadTime = lastReadTimeStr ? new Date(lastReadTimeStr).getTime() : 0;
        
        // Add a small 1000ms buffer in case of parsing discrepancies
        setHasUnreadNotifs(latestTime > lastReadTime + 1000);
      } else {
        setHasUnreadNotifs(false);
      }
    } catch (err) {
      // ignore
    }
  }, []);

  const loadLastPlayed = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@last_played_song');
      if (raw) setLastPlayed(JSON.parse(raw));
    } catch (_) {}
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchData(), loadLastPlayed(), checkUnreadNotifs()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
      loadLastPlayed();
      checkUnreadNotifs();
    });
    return unsubscribe;
  }, [navigation, fetchData, loadLastPlayed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), checkUnreadNotifs()]);
    setRefreshing(false);
  }, [fetchData, checkUnreadNotifs]);

  // ── Derived data ──
  const categoryMap = {};
  categories.forEach((c) => { categoryMap[c.id] = c; });

  const getCatName = (song) =>
    song.categories?.name || categoryMap[song.category_id]?.name || 'Song';

  const recentSongs = activeFilter === 'all'
    ? songs.slice(0, 15)
    : songs.filter((s) => s.category_id === activeFilter).slice(0, 15);

  // Group songs by category (only cats with ≥1 song)
  // We useMemo and shuffle them here so the 'Popular in...' sections
  // are randomized on load, but stable while scrolling/filtering.
  const songsByCategory = useMemo(() => {
    const grouped = {};
    songs.forEach((s) => {
      if (!grouped[s.category_id]) grouped[s.category_id] = [];
      grouped[s.category_id].push(s);
    });

    // Shuffle the songs in each category
    Object.keys(grouped).forEach((catId) => {
      const list = grouped[catId];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    });

    return grouped;
  }, [songs]);

  const populatedCategories = categories.filter(
    (c) => songsByCategory[c.id] && songsByCategory[c.id].length > 0,
  );

  const filteredPopularCategories =
    activeFilter === 'all'
      ? populatedCategories
      : populatedCategories.filter((c) => c.id === activeFilter);

  // First 3 categories for the quick-access grid
  const gridCategories = categories.slice(0, 3);

  const navigateToSong = (song) =>
    navigation.navigate('Song', { song });

  const navigateToCategory = (cat) =>
    navigation.navigate('Category', { categoryId: cat.id, categoryName: cat.name });

  // ── Skeleton loading ──
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingHorizontal: GRID_PAD }}>
          {/* Header shimmer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Shimmer w={36} h={36} radius={18} />
            <Shimmer w={180} h={20} style={{ marginLeft: 12 }} />
          </View>
          {/* Pills shimmer */}
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            {[60, 100, 110, 90].map((w, i) => (
              <Shimmer key={i} w={w} h={32} radius={16} style={{ marginRight: 8 }} />
            ))}
          </View>
          {/* Grid shimmer */}
          {[0, 1, 2].map((row) => (
            <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: CARD_GAP }}>
              <Shimmer w={GRID_CARD_W} h={64} radius={12} />
              <Shimmer w={GRID_CARD_W} h={64} radius={12} />
            </View>
          ))}
          {/* Section shimmer */}
          <Shimmer w={140} h={20} style={{ marginTop: 20, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row' }}>
            {[0, 1, 2].map((i) => (
              <Shimmer key={i} w={SCROLL_CARD_W} h={SCROLL_CARD_W} radius={10} style={{ marginRight: 12 }} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Empty state (zero songs) ──
  if (songs.length === 0 && !loading) {
    return (
      <View style={[styles.container, styles.emptyCenter]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 100, height: 100, opacity: 0.5, marginBottom: 20 }}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>Songs are on the way</Text>
        <Text style={styles.emptySub}>
          New songs will appear here as they{'\n'}are published. Check back soon!
        </Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  const sections = [];

  // 1️⃣ Header
  sections.push({ key: 'header' });

  // 2️⃣ Filter pills
  sections.push({ key: 'pills' });

  // 3️⃣ Quick-access grid
  sections.push({ key: 'grid' });

  // 4️⃣ Recently Added
  if (recentSongs.length > 0) {
    sections.push({ key: 'recent' });
  }

  // 5️⃣ Popular in [Category]
  filteredPopularCategories.forEach((cat) => {
    sections.push({ key: `popular-${cat.id}`, category: cat });
  });

  const renderSection = ({ item }) => {
    switch (item.key) {
      case 'header':
        return (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerLogo}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.headerTitle}>Original Song Lyrics</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.headerSearchBtn, { marginRight: 12 }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Bell color={colors.textWhite} size={22} />
                {hasUnreadNotifs && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#EF4444',
                    borderWidth: 2,
                    borderColor: colors.bg,
                  }} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerSearchBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => navigation.navigate('Search')}
              >
                <Search color={colors.textWhite} size={22} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'pills':
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            <TouchableOpacity
              style={[styles.pill, activeFilter === 'all' && styles.pillActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.pillText, activeFilter === 'all' && styles.pillTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pill, activeFilter === cat.id && styles.pillActive]}
                onPress={() => setActiveFilter(cat.id)}
              >
                <Text
                  style={[styles.pillText, activeFilter === cat.id && styles.pillTextActive]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        );

      case 'grid':
        return renderQuickGrid();

      case 'recent':
        return (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Recently Added" onSeeAll={() => {}} />
            <FlatList
              horizontal
              data={recentSongs}
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: GRID_PAD }}
              renderItem={({ item: song }) => (
                <HScrollCard
                  song={song}
                  categoryName={getCatName(song)}
                  onPress={() => navigateToSong(song)}
                />
              )}
            />
          </View>
        );

      default:
        // Popular in [Category]
        if (item.key.startsWith('popular-') && item.category) {
          const cat = item.category;
          const catSongs = (songsByCategory[cat.id] || []).slice(0, 15);
          return (
            <View style={styles.sectionWrap}>
              <SectionHeader
                title={`Popular in ${cat.name}`}
                onSeeAll={() => navigateToCategory(cat)}
              />
              <FlatList
                horizontal
                data={catSongs}
                keyExtractor={(s) => s.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: GRID_PAD }}
                renderItem={({ item: song }) => (
                  <HScrollCard
                    song={song}
                    categoryName={cat.name}
                    onPress={() => navigateToSong(song)}
                  />
                )}
              />
            </View>
          );
        }
        return null;
    }
  };

  // ── Quick-access grid ──
  function renderQuickGrid() {
    // Build 6 grid items
    const gridItems = [];

    // 1. Continue Listening
    gridItems.push({
      id: 'continue',
      title: lastPlayed ? lastPlayed.title : 'Continue Listening',
      subtitle: lastPlayed ? getCatName(lastPlayed) : 'Pick up where you left off',
      icon: <Play color={colors.purpleAccent} size={18} fill={colors.purpleAccent} />,
      image: lastPlayed?.feature_image_url,
      onPress: lastPlayed
        ? () => navigateToSong(lastPlayed)
        : undefined,
    });

    // 2. Favorites
    gridItems.push({
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Your saved songs...',
      icon: <Heart color="#FFF" size={18} fill="#FFF" />,
      solidPurple: true,
      onPress: () => navigation.navigate('Favorites'),
    });

    // 3. Recently Added
    gridItems.push({
      id: 'recent-grid',
      title: 'Recently Added',
      subtitle: 'Latest songs...',
      icon: <Clock color={colors.purpleAccent} size={18} />,
      image: recentSongs[0]?.feature_image_url,
      onPress: () => {},
    });

    // 4–6. First 3 categories
    gridCategories.forEach((cat, idx) => {
      const firstSong = songsByCategory[cat.id]?.[0];
      gridItems.push({
        id: `cat-${cat.id}`,
        title: cat.name,
        subtitle: `${(songsByCategory[cat.id] || []).length} songs`,
        image: cat.image_url || firstSong?.feature_image_url,
        gradientIdx: idx,
        onPress: () => navigateToCategory(cat),
      });
    });

    return (
      <View style={styles.gridContainer}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.gridRow}>
            {[0, 1].map((col) => {
              const item = gridItems[row * 2 + col];
              if (!item) return <View key={col} style={[styles.gridCard, { opacity: 0 }]} />;
              return (
                <PressCard key={item.id} onPress={item.onPress} style={styles.gridCard}>
                  {item.solidPurple ? (
                    <View style={[styles.gridCardInner, { backgroundColor: colors.purple }]}>
                      <View style={styles.gridThumbWrap}>
                        <View style={[styles.gridThumb, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                          {item.icon}
                        </View>
                      </View>
                      <View style={styles.gridTextWrap}>
                        <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.gridSub} numberOfLines={1}>{item.subtitle}</Text>
                      </View>
                      <ChevronRight color="rgba(255,255,255,0.5)" size={16} />
                    </View>
                  ) : (
                    <View style={styles.gridCardInner}>
                      <View style={styles.gridThumbWrap}>
                        {item.image ? (
                          <SongImage uri={item.image} style={styles.gridThumb} iconSize={16} />
                        ) : (
                          <View style={[styles.gridThumb, styles.gridThumbFallback]}>
                            {item.icon || <Music color="rgba(255,255,255,0.3)" size={16} />}
                          </View>
                        )}
                        {item.id === 'continue' && lastPlayed && (
                          <View style={styles.playOverlay}>
                            <Play color="#FFF" size={12} fill="#FFF" />
                          </View>
                        )}
                      </View>
                      <View style={styles.gridTextWrap}>
                        <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.gridSub} numberOfLines={1}>{item.subtitle}</Text>
                      </View>
                      <ChevronRight color="rgba(255,255,255,0.3)" size={16} />
                    </View>
                  )}
                </PressCard>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.purpleAccent}
            colors={[colors.purple]}
          />
        }
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

  // ── Empty ──
  emptyCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: colors.textWhite,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingHorizontal: GRID_PAD,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSearchBtn: {
    padding: 6,
  },

  // ── Pills ──
  pillRow: {
    paddingHorizontal: GRID_PAD,
    paddingBottom: 14,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  pillText: {
    color: colors.purpleAccent,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  // ── Quick-access grid ──
  gridContainer: {
    paddingHorizontal: GRID_PAD,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  gridCard: {
    width: GRID_CARD_W,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
  },
  gridCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  gridThumbWrap: {
    position: 'relative',
  },
  gridThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  gridThumbFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(109,40,217,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTextWrap: {
    flex: 1,
    marginLeft: 10,
    marginRight: 4,
  },
  gridTitle: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  gridSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },

  // ── Section ──
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GRID_PAD,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
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

  // ── Horizontal scroll cards ──
  hCard: {
    width: SCROLL_CARD_W,
    marginRight: 12,
  },
  hCardImg: {
    width: SCROLL_CARD_W,
    height: SCROLL_CARD_W,
    borderRadius: 10,
    marginBottom: 8,
  },
  hCardTitle: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  hCardSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  // ── Image fallback ──
  imgFallback: {
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
