import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Bell, Music, Edit3, FolderPlus, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' mins ago';
  return Math.floor(seconds) + ' seconds ago';
};

const BG = '#0F0A1A';
const PURPLE = '#6D28D9';
const PURPLE_ACCENT = '#A78BFA';
const CARD_BG = '#1A1425';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#B8AFC9';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
    markAsRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error && error.code !== '42P01') {
        // Ignore 42P01 (relation does not exist) in case they haven't applied migration yet
        console.error('Error fetching notifications:', error);
      }
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async () => {
    try {
      await AsyncStorage.setItem('@last_read_notification_time', new Date().toISOString());
    } catch (e) {
      // ignore
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handlePress = async (notif) => {
    if (!notif.reference_id) return;

    if (notif.type === 'new_category') {
      // Fetch category name first (optional, but good for UX)
      navigation.navigate('Category', {
        categoryId: notif.reference_id,
        categoryName: 'Category', // Will be loaded by CategoryScreen
      });
    } else {
      // For songs (new_song, song_edited), we need to fetch the song data first
      // since SongScreen expects the full song object
      try {
        const { data, error } = await supabase
          .from('songs')
          .select('*, categories(name)')
          .eq('id', notif.reference_id)
          .single();

        if (data) {
          navigation.navigate('Song', { song: data });
        }
      } catch (err) {
        console.error('Failed to fetch song for notification', err);
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'new_song':
        return <Music size={20} color={PURPLE_ACCENT} />;
      case 'song_edited':
        return <Edit3 size={20} color="#38BDF8" />; // Blue for edits
      case 'new_category':
        return <FolderPlus size={20} color="#10B981" />; // Green for new categories
      default:
        return <Bell size={20} color={TEXT_MUTED} />;
    }
  };

  const renderItem = ({ item }) => {
    let dateStr = '';
    try {
      dateStr = timeAgo(item.created_at);
    } catch (e) {}

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handlePress(item)}
      >
        <View style={styles.iconContainer}>
          {getIcon(item.type)}
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{dateStr}</Text>
        </View>
        <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      
      {/* ── Header ── */}
      <LinearGradient
        colors={[BG, 'rgba(15,10,26,0.9)']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={TEXT_WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 22 }} /> 
      </LinearGradient>

      {/* ── List ── */}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PURPLE_ACCENT}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={40} color={PURPLE_ACCENT} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>You're all caught up!</Text>
              <Text style={styles.emptySub}>
                When new songs or categories are added, they'll appear here.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(109, 40, 217, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: TEXT_WHITE,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    color: TEXT_MUTED,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
