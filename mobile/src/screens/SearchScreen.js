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
  Dimensions,
  Keyboard,
} from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search as SearchIcon,
  ArrowLeft,
  X,
  Clock,
  Trash2,
  Heart,
  Music,
  ChevronRight,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');
const STATUS_BAR_H = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 32;

// ─── Constants ───
const DEBOUNCE_MS = 300;
const RECENT_KEY = '@recent_searches';
const MAX_RECENT = 10;

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

// ─── Highlighted text helper ─────────────────────────────────────
function HighlightedText({ text, highlight, style, colors }) {
  if (!highlight || !highlight.trim()) {
    return <Text style={style} numberOfLines={1}>{text}</Text>;
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style} numberOfLines={1}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Text key={i} style={{ color: colors.purpleAccent }}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function SearchScreen({ navigation, route }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  // Scoped search context (if opened from a specific category)
  const scopedCategoryId = route?.params?.categoryId || null;
  const scopedCategoryName = route?.params?.categoryName || null;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState({});

  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    loadRecentSearches();
    loadFavorites();
    // Auto-focus
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  // Re-load favorites on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
    });
    return unsubscribe;
  }, [navigation]);

  // ── Recent searches ──
  const loadRecentSearches = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch (_) {}
  };

  const saveRecentSearch = async (term) => {
    try {
      let recent = [...recentSearches];
      recent = recent.filter((s) => s.toLowerCase() !== term.toLowerCase());
      recent.unshift(term);
      recent = recent.slice(0, MAX_RECENT);
      setRecentSearches(recent);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (_) {}
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  };

  // ── Favorites ──
  const loadFavorites = async () => {
    try {
      const raw = await AsyncStorage.getItem('@favorites');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const map = {};
        parsed.forEach((id) => { map[id] = true; });
        setFavorites(map);
      } else {
        setFavorites(parsed);
      }
    } catch (_) {}
  };

  const toggleFavorite = async (songId) => {
    const next = { ...favorites };
    if (next[songId]) {
      delete next[songId];
    } else {
      next[songId] = true;
    }
    setFavorites(next);

    // Persist as array (consistent with SongScreen format)
    const ids = Object.keys(next).filter((k) => next[k]);
    await AsyncStorage.setItem('@favorites', JSON.stringify(ids));
  };

  // ── Search logic ──
  const performSearch = useCallback(
    async (searchTerm) => {
      if (!searchTerm.trim()) {
        setResults([]);
        setHasSearched(false);
        setSearching(false);
        return;
      }

      setSearching(true);
      setHasSearched(true);

      try {
        const term = `%${searchTerm.trim()}%`;

        let queryBuilder = supabase
          .from('songs')
          .select('*, categories(name)')
          .eq('is_published', true)
          .or(`title.ilike.${term},writeup.ilike.${term},lyrics.ilike.${term}`);

        if (scopedCategoryId) {
          queryBuilder = queryBuilder.eq('category_id', scopedCategoryId);
        }

        const { data, error } = await queryBuilder.limit(50);

        if (error) throw error;

        // Sort results: title matches first, then writeup, then lyrics
        const lowerTerm = searchTerm.trim().toLowerCase();
        const scored = (data || []).map((s) => {
          let score = 3;
          if (s.title?.toLowerCase().includes(lowerTerm)) score = 1;
          else if (s.writeup?.toLowerCase().includes(lowerTerm)) score = 2;
          return { ...s, _score: score };
        });
        scored.sort((a, b) => a._score - b._score || (a.title || '').localeCompare(b.title || ''));

        setResults(scored);
        saveRecentSearch(searchTerm.trim());
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      }
      setSearching(false);
    },
    [scopedCategoryId],
  );

  // Debounced search
  const handleQueryChange = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      performSearch(text);
    }, DEBOUNCE_MS);
  };

  const handleRecentTap = (term) => {
    setQuery(term);
    performSearch(term);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const navigateToSong = (song) => {
    Keyboard.dismiss();
    navigation.navigate('Song', { song });
  };

  const navigateToCategory = (song) => {
    Keyboard.dismiss();
    navigation.navigate('Category', {
      categoryId: song.category_id,
      categoryName: song.categories?.name || 'Category',
    });
  };

  // ── Song row ──
  function renderSongRow({ item: song, index }) {
    const catName = song.categories?.name || 'Song';
    const isFav = !!favorites[song.id];

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
        }}
      >
        <TouchableOpacity
          style={styles.songRow}
          activeOpacity={0.7}
          onPress={() => navigateToSong(song)}
        >
          <SongImage uri={song.feature_image_url} style={styles.songRowImg} iconSize={18} />
          <View style={styles.songRowInfo}>
            <HighlightedText colors={colors}
              text={song.title || 'Untitled'}
              highlight={query}
              style={styles.songRowTitle}
            />
            <TouchableOpacity onPress={() => navigateToCategory(song)} activeOpacity={0.6}>
              <Text style={styles.songRowCat} numberOfLines={1}>
                {catName}
              </Text>
            </TouchableOpacity>
          </View>
          <HeartButton isFav={isFav} onToggle={() => toggleFavorite(song.id)} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Recent searches ──
  function renderRecentSearches() {
    if (recentSearches.length === 0) return null;

    return (
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <TouchableOpacity onPress={clearRecentSearches}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>
        {recentSearches.map((term, idx) => (
          <TouchableOpacity
            key={`${term}-${idx}`}
            style={styles.recentItem}
            onPress={() => handleRecentTap(term)}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`Search for ${term}`}
          >
            <Clock size={16} color={colors.textMuted} style={{ marginRight: 12 }} />
            <Text style={styles.recentItemText} numberOfLines={1}>
              {term}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ── Loading shimmer ──
  function renderLoadingShimmer() {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Shimmer w={56} h={56} radius={12} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Shimmer w={140 + Math.random() * 60} h={16} style={{ marginBottom: 6 }} />
              <Shimmer w={80} h={12} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // ── Empty results ──
  function renderEmptyResults() {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconCircle}>
          <SearchIcon size={40} color={colors.purpleAccent} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No songs found</Text>
        <Text style={styles.emptySubtext}>
          No results for "{query}". Check your spelling or try browsing categories.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => {
            Keyboard.dismiss();
            navigation.navigate('Categories');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyBtnText}>Browse Categories</Text>
          <ChevronRight color="#FFF" size={18} />
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* ── Search header ── */}
      <View style={styles.searchHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            Keyboard.dismiss();
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color={colors.textWhite} />
        </TouchableOpacity>

        <View style={styles.searchInputWrap}>
          <SearchIcon size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={
              scopedCategoryName
                ? `Search in ${scopedCategoryName}...`
                : 'Search songs, lyrics...'
            }
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(query)}
            accessibilityLabel="Search songs"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Scoped label ── */}
      {scopedCategoryName && (
        <View style={styles.scopeLabel}>
          <Text style={styles.scopeLabelText}>
            Searching in <Text style={{ color: colors.purpleAccent, fontWeight: '700' }}>{scopedCategoryName}</Text>
          </Text>
        </View>
      )}

      {/* ── Content ── */}
      {!query.trim() ? (
        // Show recent searches
        renderRecentSearches()
      ) : searching ? (
        renderLoadingShimmer()
      ) : hasSearched && results.length === 0 ? (
        renderEmptyResults()
      ) : (
        <FlatList
          data={results}
          keyExtractor={(s) => s.id}
          renderItem={renderSongRow}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.resultCount}>
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const makeStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Search header ──
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: STATUS_BAR_H + 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(109, 40, 217, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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

  // ── Scope label ──
  scopeLabel: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  scopeLabelText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // ── Recent searches ──
  recentSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textWhite,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.purpleAccent,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  recentItemText: {
    fontSize: 15,
    color: colors.textWhite,
    fontWeight: '500',
    flex: 1,
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

  // ── Result count ──
  resultCount: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
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
});
