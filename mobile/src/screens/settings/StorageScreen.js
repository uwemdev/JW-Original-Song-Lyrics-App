import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { ArrowLeft, Trash2, Music, HardDrive } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@offline_lyrics_cache';

export default function StorageScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors);
  const [cache, setCache] = useState([]); // [{ id, title, category, dataSize }]
  const [loading, setLoading] = useState(true);

  const loadCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        setCache(JSON.parse(raw));
      } else {
        setCache([]);
      }
    } catch (_) {
      setCache([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCache();
  }, []);

  const totalSize = cache.reduce((sum, item) => sum + (item.dataSize || 0), 0);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removeSong = async (songId) => {
    const updated = cache.filter((s) => s.id !== songId);
    setCache(updated);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    Alert.alert(
      'Clear All Cache',
      'This will remove all offline lyrics. Favorited songs will re-cache next time you\'re online if auto-cache is enabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setCache([]);
            await AsyncStorage.removeItem(CACHE_KEY);
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.cacheRow}>
      <View style={styles.cacheLeft}>
        <View style={styles.musicIcon}>
          <Music color={colors.purpleAccent} size={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cacheTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cacheSub}>{item.category || 'Unknown'} · {formatSize(item.dataSize || 0)}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => removeSong(item.id)}
        style={styles.removeBtn}
        accessibilityLabel={`Remove ${item.title} from cache`}
      >
        <Trash2 color={colors.danger} size={16} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={colors.textWhite} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Cache</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <HardDrive color={colors.purpleAccent} size={24} />
          <Text style={styles.statValue}>{cache.length}</Text>
          <Text style={styles.statLabel}>Songs cached</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSize(totalSize)}</Text>
          <Text style={styles.statLabel}>Storage used</Text>
        </View>
      </View>

      {/* Cache list */}
      {cache.length === 0 ? (
        <View style={styles.emptyWrap}>
          <HardDrive color={colors.textMuted} size={40} />
          <Text style={styles.emptyTitle}>No cached songs</Text>
          <Text style={styles.emptySub}>
            Enable "Auto-cache favorites" in Settings to automatically save lyrics for offline reading.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cache}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
          ItemSeparatorComponent={() => <View style={styles.listDivider} />}
          ListFooterComponent={
            <TouchableOpacity style={styles.clearAllBtn} onPress={clearAll}>
              <Trash2 color="#FFF" size={16} />
              <Text style={styles.clearAllText}>Clear All Cache</Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '800',
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.08)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textWhite,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(150,150,150,0.15)',
    marginHorizontal: 16,
  },
  cacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  cacheLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  musicIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cacheTitle: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  cacheSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
  listDivider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.15)',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  clearAllText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
