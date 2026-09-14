import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Search, Music, LayoutGrid } from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

const SIDE_PAD = 16;
const GRID_GAP = 12;
const GRID_CARD_W = (width - SIDE_PAD * 2 - GRID_GAP) / 2;
const STATUS_BAR_H = Platform.OS === 'ios' ? 60 : StatusBar.currentHeight || 44;

function PressCard({ onPress, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  return (
    <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

export default function CategoriesScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors);

  const [categories, setCategories] = useState([]);
  const [songCounts, setSongCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, songRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('songs').select('category_id').eq('is_published', true),
      ]);
      
      if (catRes.data) setCategories(catRes.data);
      
      if (songRes.data) {
        const counts = {};
        songRes.data.forEach((s) => {
          counts[s.category_id] = (counts[s.category_id] || 0) + 1;
        });
        setSongCounts(counts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const navigateToCategory = (cat) => {
    navigation.navigate('Category', {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryImage: cat.image_url,
    });
  };

  const renderCard = ({ item: cat }) => {
    const count = songCounts[cat.id] || 0;
    
    return (
      <PressCard onPress={() => navigateToCategory(cat)} style={styles.card}>
        {cat.image_url ? (
          <Image source={{ uri: cat.image_url }} style={styles.cardImg} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#2D1B4E', '#1A1425']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardImg}
          >
            <Music color="rgba(255,255,255,0.15)" size={32} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.6, 1]}
          style={styles.cardOverlay}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {cat.name}
          </Text>
          <Text style={styles.cardCount}>
            {count} {count === 1 ? 'Song' : 'Songs'}
          </Text>
        </View>
      </PressCard>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <LayoutGrid color={colors.textWhite} size={28} style={{ marginRight: 10 }} />
          <Text style={styles.headerTitle}>Collections</Text>
        </View>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: STATUS_BAR_H + 10,
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textWhite,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 120, // Space for bottom tab nav
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  card: {
    width: GRID_CARD_W,
    height: GRID_CARD_W * 1.2,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
  },
  cardImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  cardTitle: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
