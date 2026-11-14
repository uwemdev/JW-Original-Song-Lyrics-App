import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Sun,
  Bell,
  Music,
  Edit3,
  FolderPlus,
  ChevronRight,
  CheckCheck,
  Megaphone,
  ExternalLink,
  Heart,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDailySong, getDailyNotification } from '../lib/dailySong';
import { isSunday, getSundayGreeting } from '../lib/sundayGreetings';

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

export default function NotificationsScreen({ navigation }) {
  const { colors, isDark, installDate, dismissedNotifs, dismissNotification } = useSettings();
  const styles = makeStyles(colors, isDark);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      // 1. Collect all dismissed notification IDs from AsyncStorage and Context
      const dismissedSet = new Set(dismissedNotifs || []);
      try {
        const rawDismissed = await AsyncStorage.getItem('@settings_dismissed_notifs');
        if (rawDismissed) {
          const parsed = JSON.parse(rawDismissed);
          if (Array.isArray(parsed)) {
            parsed.forEach((id) => dismissedSet.add(id));
          }
        }
      } catch (_) {}

      // 2. Fetch notifications from database tables safely
      const [autoRes, pushRes, annRes, songsRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
          .catch(() => ({ data: [] })),
        supabase
          .from('app_notifications')
          .select('*')
          .gte('created_at', installDate || new Date(0).toISOString())
          .order('created_at', { ascending: false })
          .limit(50)
          .catch(() => ({ data: [] })),
        supabase
          .from('app_announcements')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(20)
          .catch(() => ({ data: [] })),
        supabase
          .from('songs')
          .select('*, categories(name)')
          .eq('is_published', true)
          .limit(100)
          .catch(() => ({ data: [] })),
      ]);

      let fetched = [];
      const now = Date.now();

      // Time-based and active admin announcements
      if (annRes?.data && Array.isArray(annRes.data)) {
        annRes.data.forEach((a) => {
          const hasExpiry = Boolean(a.expires_at);
          const isExpired = hasExpiry && new Date(a.expires_at).getTime() <= now;
          if (isExpired) return; // Expired time-based notices should no longer appear

          const isTimeBased = hasExpiry && new Date(a.expires_at).getTime() > now;
          fetched.push({
            id: a.id,
            type: 'admin_announcement',
            title: a.title,
            message: a.message,
            banner_type: a.banner_type || 'info',
            action_type: a.action_type || 'none',
            action_id: a.action_id || null,
            action_label: a.action_label || '',
            is_time_based: isTimeBased,
            expires_at: a.expires_at || null,
            created_at: a.created_at || a.starts_at || new Date().toISOString(),
          });
        });
      }

      // Automated system notifications (new songs, updates, categories)
      if (autoRes?.data && Array.isArray(autoRes.data)) {
        fetched = [...fetched, ...autoRes.data];
      }

      // Admin push broadcast messages
      if (pushRes?.data && Array.isArray(pushRes.data)) {
        const mappedPush = pushRes.data.map((p) => ({
          id: p.id,
          type: 'admin_push',
          title: p.title,
          message: p.message,
          link_url: p.link_url,
          song_id: p.song_id,
          expires_at: null,
          is_time_based: false,
          created_at: p.created_at,
        }));
        fetched = [...fetched, ...mappedPush];
      }

      // Daily Song and Sunday Reflection
      if (songsRes?.data && songsRes.data.length > 0) {
        const dailySong = getDailySong(songsRes.data);
        const dailyNotif = getDailyNotification(dailySong);
        if (dailyNotif) {
          fetched = [
            {
              ...dailyNotif,
              expires_at: null,
              is_time_based: false,
            },
            ...fetched,
          ];
        }

        if (isSunday()) {
          const sundaySong = songsRes.data[Math.floor(Math.random() * songsRes.data.length)];
          const sundayNotif = {
            id: `sunday-reflection-${new Date().toDateString()}`,
            type: 'sunday_reflection',
            title: 'How was the meeting today?',
            message: getSundayGreeting(sundaySong.title),
            song_id: sundaySong.id,
            expires_at: null,
            is_time_based: false,
            created_at: new Date().toISOString(),
          };
          fetched = [sundayNotif, ...fetched];
        }
      }

      // 3. Filter: Keep only active time-based admin notifications OR undismissed notices
      const visible = fetched.filter((item) => {
        const isTimeBasedAdminNotice = Boolean(
          item.expires_at && new Date(item.expires_at).getTime() > now
        );
        // Time-based notifications set via admin always remain visible until their expiration time
        if (isTimeBasedAdminNotice) {
          return true;
        }
        // All other notifications that have been tapped or cleared are dismissed permanently
        if (dismissedSet.has(item.id)) {
          return false;
        }
        return true;
      });

      visible.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotifications(visible.slice(0, 50));

      // Mark current time as last read time for the bell indicator
      await AsyncStorage.setItem('@last_read_notification_time', new Date().toISOString());
    } catch (err) {
      console.error('fetchNotifications error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [installDate, dismissedNotifs]);

  useEffect(() => {
    fetchNotifications();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications();
    });
    return unsubscribe;
  }, [navigation, fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const clearAll = async () => {
    try {
      const now = Date.now();
      // Keep only active time-based notifications set via admin
      const timeBased = notifications.filter((n) => {
        return Boolean(n.expires_at && new Date(n.expires_at).getTime() > now);
      });
      const toDismiss = notifications
        .filter((n) => !(n.expires_at && new Date(n.expires_at).getTime() > now))
        .map((n) => n.id);

      // Immediately update local UI
      setNotifications(timeBased);

      // Persist dismissed IDs into AsyncStorage and Context
      if (toDismiss.length > 0) {
        let existing = [];
        try {
          const raw = await AsyncStorage.getItem('@settings_dismissed_notifs');
          if (raw) existing = JSON.parse(raw);
        } catch (_) {}
        const merged = Array.from(new Set([...existing, ...toDismiss]));
        await AsyncStorage.setItem('@settings_dismissed_notifs', JSON.stringify(merged));
        dismissNotification(toDismiss);
      }

      await AsyncStorage.setItem('@last_read_notification_time', new Date().toISOString());
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    }
  };

  const handlePress = async (notif) => {
    const now = Date.now();
    const isTimeBased = Boolean(
      notif.expires_at && new Date(notif.expires_at).getTime() > now
    );

    // If NOT a time-based admin notification, dismiss it immediately so it disappears from the screen
    if (!isTimeBased) {
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      try {
        let existing = [];
        const raw = await AsyncStorage.getItem('@settings_dismissed_notifs');
        if (raw) existing = JSON.parse(raw);
        if (!existing.includes(notif.id)) {
          const merged = [...existing, notif.id];
          await AsyncStorage.setItem('@settings_dismissed_notifs', JSON.stringify(merged));
        }
      } catch (_) {}
      dismissNotification(notif.id);
    }

    // Execute navigation / deep link
    if (notif.type === 'admin_push') {
      if (notif.link_url) {
        Linking.openURL(notif.link_url).catch((err) => console.error("Couldn't open URL", err));
        return;
      }
      if (notif.song_id) {
        try {
          const { data } = await supabase
            .from('songs')
            .select('*, categories(name)')
            .eq('id', notif.song_id)
            .single();
          if (data) navigation.navigate('Song', { song: data });
        } catch (_) {}
        return;
      }
      return;
    }

    if (notif.type === 'admin_announcement') {
      if (notif.action_type === 'song' && notif.action_id) {
        try {
          const { data } = await supabase
            .from('songs')
            .select('*, categories(name)')
            .eq('id', notif.action_id)
            .single();
          if (data) navigation.navigate('Song', { song: data });
        } catch (_) {}
        return;
      }
      if (notif.action_type === 'category' && notif.action_id) {
        navigation.navigate('Category', {
          categoryId: notif.action_id,
          categoryName: notif.title || 'Category',
        });
        return;
      }
      if ((notif.action_type === 'url' || notif.link_url) && (notif.action_id || notif.link_url)) {
        const urlToOpen = notif.action_id || notif.link_url;
        Linking.openURL(urlToOpen).catch((err) => console.error("Couldn't open URL", err));
        return;
      }
      return;
    }

    if ((notif.type === 'daily_song' || notif.type === 'sunday_reflection') && notif.song_id) {
      try {
        const { data } = await supabase
          .from('songs')
          .select('*, categories(name)')
          .eq('id', notif.song_id)
          .single();
        if (data) {
          navigation.navigate('Song', { song: data });
        }
      } catch (err) {
        console.error('Failed to open daily song', err);
      }
      return;
    }

    if (!notif.reference_id) return;

    if (notif.type === 'new_category') {
      navigation.navigate('Category', {
        categoryId: notif.reference_id,
        categoryName: notif.title || 'Category',
      });
    } else {
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

  const getIcon = (item) => {
    switch (item.type) {
      case 'new_song':
        return <Music size={20} color={colors.purpleAccent} />;
      case 'song_edited':
        return <Edit3 size={20} color="#38BDF8" />;
      case 'new_category':
        return <FolderPlus size={20} color="#10B981" />;
      case 'sunday_reflection':
        return <Heart size={20} color="#EC4899" fill="#EC4899" />;
      case 'daily_song':
        return <Sun size={20} color="#F59E0B" />;
      case 'admin_push':
        return <Megaphone size={20} color={colors.purpleAccent} />;
      case 'admin_announcement':
        if (item.banner_type === 'alert') return <Bell size={20} color="#EF4444" />;
        if (item.banner_type === 'warning') return <Bell size={20} color="#F59E0B" />;
        if (item.banner_type === 'success') return <Sparkles size={20} color="#10B981" />;
        return <Megaphone size={20} color={colors.purpleAccent} />;
      default:
        return <Bell size={20} color={colors.textMuted} />;
    }
  };

  const renderItem = ({ item }) => {
    let dateStr = '';
    try {
      dateStr = timeAgo(item.created_at);
    } catch (e) {}

    const now = Date.now();
    const isTimeBased = Boolean(
      item.expires_at && new Date(item.expires_at).getTime() > now
    );

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isTimeBased && styles.cardTimeBased,
        ]}
        activeOpacity={0.7}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconContainer, isTimeBased && styles.iconContainerTimeBased]}>
          {getIcon(item)}
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {isTimeBased && (
              <View style={styles.timeBadge}>
                <Clock size={10} color="#A78BFA" />
                <Text style={styles.timeBadgeText}>Admin Notice</Text>
              </View>
            )}
          </View>
          <Text style={styles.message}>{item.message}</Text>
          {((item.type === 'admin_push' && item.link_url) ||
            (item.type === 'admin_announcement' && (item.action_id || item.link_url))) && (
            <View style={styles.linkWrap}>
              <Text style={[styles.time, { color: colors.purpleAccent }]}>
                {item.action_label || 'View Link'}
              </Text>
              <ExternalLink size={12} color={colors.purpleAccent} style={{ marginLeft: 4 }} />
            </View>
          )}
          <View style={styles.footerRow}>
            <Text style={styles.time}>{dateStr}</Text>
            {isTimeBased && item.expires_at && (
              <Text style={styles.timeExpiryText}>
                Active until {new Date(item.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </View>
        </View>
        <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      
      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.bg, 'rgba(15,10,26,0.9)']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={clearAll}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear all notifications"
        >
          <CheckCheck color={colors.textMuted} size={20} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── List ── */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={40} color={colors.purpleAccent} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>You're all caught up!</Text>
              <Text style={styles.emptySub}>
                When new songs, updates, or announcements are added, they'll appear here.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  clearBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textWhite,
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
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  cardTimeBased: {
    borderColor: 'rgba(167, 139, 250, 0.25)',
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
  iconContainerTimeBased: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    flex: 1,
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    gap: 4,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A78BFA',
    letterSpacing: 0.3,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  time: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  timeExpiryText: {
    fontSize: 11,
    color: colors.purpleAccent,
    fontWeight: '500',
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
    color: colors.textWhite,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
