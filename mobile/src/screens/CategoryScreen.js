import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Play, MoreVertical, Music } from 'lucide-react-native';

export default function CategoryScreen({ route, navigation }) {
  const { categoryId, categoryName } = route.params;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongs();
  }, [categoryId]);

  async function fetchSongs() {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setSongs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const renderSong = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('Song', { song: item })}
      activeOpacity={0.7}
    >
      <View style={styles.indexContainer}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>
      
      {item.feature_image_url ? (
        <Image source={{ uri: item.feature_image_url }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholder]}>
          <Music color="rgba(255,255,255,0.5)" size={20} />
        </View>
      )}
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        {item.writeup ? (
          <Text style={styles.cardSubtitle} numberOfLines={1}>{item.writeup}</Text>
        ) : (
          <Text style={styles.cardSubtitle}>Original Song</Text>
        )}
      </View>
      
      <TouchableOpacity style={styles.moreButton}>
        <MoreVertical color="#94A3B8" size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Decorative Background Gradient */}
      <View style={styles.bgGlow} />
      
      <FlatList
        data={songs}
        keyExtractor={item => item.id.toString()}
        renderItem={renderSong}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerArtworkPlaceholder}>
              <LinearGradient
                colors={['#8B5CF6', '#3B82F6']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.headerArtworkGradient}
              >
                <Music color="#FFF" size={48} opacity={0.8} />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>{categoryName}</Text>
            <Text style={styles.headerSubtitle}>{songs.length} Tracks</Text>
            
            {songs.length > 0 && (
              <TouchableOpacity 
                style={styles.playAllButton}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Song', { song: songs[0] })}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#F472B6']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.playAllGradient}
                >
                  <Play color="#FFF" size={20} fill="#FFF" />
                  <Text style={styles.playAllText}>Play Collection</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No songs available in this collection yet.</Text>
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
  bgGlow: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#8B5CF6',
    opacity: 0.15,
    transform: [{ scale: 1.5 }],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  header: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 30,
  },
  headerArtworkPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  headerArtworkGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 24,
  },
  playAllButton: {
    borderRadius: 30,
    overflow: 'hidden',
    width: 200,
    shadowColor: '#F472B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  playAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  playAllText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 120, // Space for bottom tab
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  indexContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  indexText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
  },
  moreButton: {
    padding: 8,
  }
});
