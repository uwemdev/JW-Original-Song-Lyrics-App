import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Music, PlayCircle, Heart } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

// Custom colors for categories
const CATEGORY_COLORS = [
  ['#8B5CF6', '#D946EF'], // Purple to Pink
  ['#3B82F6', '#06B6D4'], // Blue to Cyan
  ['#F59E0B', '#EF4444'], // Amber to Red
  ['#10B981', '#3B82F6'], // Emerald to Blue
  ['#6366F1', '#A855F7'], // Indigo to Purple
  ['#F43F5E', '#F97316'], // Rose to Orange
];

export default function HomeScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
        
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const renderCategory = ({ item, index }) => {
    const isEven = index % 2 === 0;
    const colors = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    
    // Staggered effect: odd items have top margin
    const dynamicStyle = {
      marginTop: isEven ? 0 : 30,
      height: isEven ? 180 : 210, // Slight height variation for masonry look
    };

    return (
      <TouchableOpacity 
        style={[styles.cardContainer, dynamicStyle]}
        onPress={() => navigation.navigate('Category', { categoryId: item.id, categoryName: item.name })}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardOverlay}>
            <View style={styles.iconContainer}>
              <Music color="#FFF" size={24} />
            </View>
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>Explore Collection</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={item => item.id.toString()}
        renderItem={renderCategory}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>Discover</Text>
            <Text style={styles.headerTitle}>Collections</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  header: {
    marginTop: 110, // Space for transparent header
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerSubtitle: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  list: {
    padding: 16,
    paddingBottom: 100, // Space for absolute bottom tab
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardContainer: {
    width: COLUMN_WIDTH,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  cardGradient: {
    flex: 1,
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // Darken slightly to make text pop
    padding: 20,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  }
});
