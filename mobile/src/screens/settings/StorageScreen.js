import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  Trash2,
  Play,
  HardDrive,
  Download,
  CheckCircle,
  CloudDownload,
  Music,
  ShieldCheck,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../context/SettingsContext';
import { useAudio } from '../../context/AudioContext';
import {
  getDownloadedSongsMap,
  deleteDownloadedSong,
  clearAllDownloadedSongs,
  downloadSong,
  formatBytes,
} from '../../lib/offlineManager';

export default function StorageScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const { playSong } = useAudio();

  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const loadDownloads = useCallback(async () => {
    try {
      const map = await getDownloadedSongsMap();
      const list = Object.values(map).sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
      setDownloadedSongs(list);
    } catch (_) {
      setDownloadedSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const totalBytes = downloadedSongs.reduce((sum, s) => sum + (s.sizeBytes || 0), 0);

  // Play a downloaded song directly from local storage
  const handlePlaySong = (song) => {
    playSong(song, downloadedSongs);
    navigation.navigate('Song', { song, queue: downloadedSongs });
  };

  // Remove a single downloaded song
  const handleRemove = (song) => {
    Alert.alert(
      'Remove Download',
      `Delete "${song.title}" from offline storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteDownloadedSong(song.id);
            setDownloadedSongs((prev) => prev.filter((s) => s.id !== song.id));
          },
        },
      ]
    );
  };

  // Clear all offline storage
  const handleClearAll = () => {
    if (downloadedSongs.length === 0) return;
    Alert.alert(
      'Clear All Offline Audio',
      'This will delete all saved audio files from your device. You can download them again anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllDownloadedSongs();
            setDownloadedSongs([]);
          },
        },
      ]
    );
  };

  // Batch download all favorited songs
  const handleDownloadFavorites = async () => {
    try {
      const raw = await AsyncStorage.getItem('@favorites');
      let favIds = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(favIds)) {
        favIds = Object.keys(favIds).filter((k) => favIds[k]);
      }

      if (favIds.length === 0) {
        Alert.alert('No Favorites', 'You have no favorited songs yet to download.');
        return;
      }

      // Fetch full song objects from Supabase
      const { data, error } = await supabase
        .from('songs')
        .select('*, categories(name)')
        .in('id', favIds)
        .eq('is_published', true);

      if (error || !data || data.length === 0) {
        Alert.alert('Notice', 'Could not fetch favorite songs for download.');
        return;
      }

      // Filter out already downloaded songs
      const alreadyIds = new Set(downloadedSongs.map((s) => String(s.id)));
      const toDownload = data.filter((s) => !alreadyIds.has(String(s.id)) && s.mp3_url);

      if (toDownload.length === 0) {
        Alert.alert('All Saved', 'All of your favorited songs are already downloaded offline!');
        return;
      }

      setIsBatchDownloading(true);
      setBatchProgress({ current: 0, total: toDownload.length });

      for (let i = 0; i < toDownload.length; i++) {
        setBatchProgress({ current: i + 1, total: toDownload.length });
        await downloadSong(toDownload[i]);
      }

      setIsBatchDownloading(false);
      await loadDownloads();
      Alert.alert('Completed', `Successfully downloaded ${toDownload.length} songs for offline listening!`);
    } catch (err) {
      setIsBatchDownloading(false);
      Alert.alert('Download Error', 'Could not complete batch download.');
    }
  };

  const renderHeader = () => (
    <View style={styles.bannerWrap}>
      {/* Storage Card */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={styles.summaryTop}>
          <View style={[styles.hardDriveIconWrap, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.10)' }]}>
            <HardDrive size={24} color={colors.purpleAccent} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.storageSizeText, { color: colors.textWhite }]}>
              {formatBytes(totalBytes)}
            </Text>
            <Text style={[styles.storageSubText, { color: colors.textMuted }]}>
              {downloadedSongs.length} {downloadedSongs.length === 1 ? 'song' : 'songs'} saved offline
            </Text>
          </View>
        </View>

        {/* Private Vault Badge */}
        <View
          style={[
            styles.vaultBadge,
            {
              backgroundColor: isDark ? 'rgba(37, 211, 102, 0.12)' : 'rgba(37, 211, 102, 0.08)',
              borderColor: isDark ? 'rgba(37, 211, 102, 0.25)' : 'rgba(37, 211, 102, 0.2)',
            },
          ]}
        >
          <ShieldCheck size={14} color="#25D366" />
          <Text style={[styles.vaultBadgeText, { color: isDark ? '#86EFAC' : '#15803D' }]}>
            Isolated App Vault • Hidden from Device Media
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.purple, opacity: isBatchDownloading ? 0.7 : 1 },
            ]}
            onPress={handleDownloadFavorites}
            disabled={isBatchDownloading}
            activeOpacity={0.8}
          >
            {isBatchDownloading ? (
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
            ) : (
              <CloudDownload size={16} color="#FFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.actionBtnText}>
              {isBatchDownloading
                ? `Saving (${batchProgress.current}/${batchProgress.total})`
                : 'Download Favorites'}
            </Text>
          </TouchableOpacity>

          {downloadedSongs.length > 0 && (
            <TouchableOpacity
              style={[
                styles.clearBtn,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.20)',
                },
              ]}
              onPress={handleClearAll}
              activeOpacity={0.8}
            >
              <Trash2 size={15} color={colors.danger} />
              <Text style={[styles.clearBtnText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textWhite }]}>
          Downloaded Tracks
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Top Header */}
      <View style={[styles.topHeader, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={[styles.topHeaderTitle, { color: colors.textWhite }]}>
          Offline Music & Storage
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.purpleAccent} />
        </View>
      ) : (
        <FlatList
          data={downloadedSongs}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 130 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)' },
                ]}
              >
                <CloudDownload size={40} color={colors.purpleAccent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textWhite }]}>No offline songs yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Download songs to listen anywhere with 0% data usage. Downloaded files are kept private inside the app.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.purple }]}
                onPress={() => navigation.navigate('FavoritesMain')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyActionBtnText}>Go to Favorites</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.songRow,
                { backgroundColor: colors.cardBg, borderColor: colors.divider },
              ]}
              onPress={() => handlePlaySong(item)}
              activeOpacity={0.7}
            >
              {item.feature_image_url ? (
                <Image source={{ uri: item.feature_image_url }} style={styles.songThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.songThumb, styles.songThumbFallback, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                  <Music size={18} color={colors.textMuted} />
                </View>
              )}

              <View style={styles.songInfo}>
                <Text style={[styles.songTitle, { color: colors.textWhite }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.songMetaRow}>
                  <Text style={[styles.songCategory, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.category_name || 'Original Song'}
                  </Text>
                  <Text style={[styles.songDot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.songSizeBadge, { color: colors.purpleAccent }]}>
                    {formatBytes(item.sizeBytes)}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.songActions}>
                <TouchableOpacity
                  style={[styles.rowPlayBtn, { backgroundColor: 'rgba(109, 40, 217, 0.15)' }]}
                  onPress={() => handlePlaySong(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Play size={14} color={colors.purpleAccent} fill={colors.purpleAccent} style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rowDeleteBtn}
                  onPress={() => handleRemove(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 32) + 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  topHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hardDriveIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storageSizeText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  storageSubText: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  vaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    gap: 6,
  },
  vaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  clearBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  songThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
  },
  songThumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  songMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  songCategory: {
    fontSize: 12,
    maxWidth: '60%',
  },
  songDot: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  songSizeBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowDeleteBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 30,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
