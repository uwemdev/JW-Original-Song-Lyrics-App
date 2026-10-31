import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  ChevronLeft,
  Play,
  Shuffle,
  MoreVertical,
  ListMusic,
  Trash2,
  Edit2,
  X,
  Plus,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { usePlaylists } from '../context/PlaylistContext';
import { useAudio } from '../context/AudioContext';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');
const STATUS_BAR_H = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 32;

export default function PlaylistScreen({ route, navigation }) {
  const { playlistId } = route.params || {};
  const { colors, isDark } = useSettings();
  const { getPlaylistById, updatePlaylist, deletePlaylist, removeSongFromPlaylist } = usePlaylists();
  const { playSong } = useAudio();

  const playlist = getPlaylistById(playlistId);

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(playlist?.name || '');
  const [editDesc, setEditDesc] = useState(playlist?.description || '');

  // Load song details from Supabase using playlist.songIds
  const loadPlaylistSongs = useCallback(async () => {
    if (!playlist || !playlist.songIds || playlist.songIds.length === 0) {
      setSongs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*, categories(name)')
        .in('id', playlist.songIds)
        .eq('is_published', true);

      if (error) throw error;

      // Keep order of songIds
      const map = {};
      (data || []).forEach((s) => {
        map[s.id] = s;
      });

      const ordered = playlist.songIds.map((id) => map[id]).filter(Boolean);
      setSongs(ordered);
    } catch (err) {
      console.warn('Failed to load playlist songs:', err);
    } finally {
      setLoading(false);
    }
  }, [playlist?.songIds]);

  useEffect(() => {
    loadPlaylistSongs();
  }, [loadPlaylistSongs]);

  if (!playlist) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Playlist not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.purpleAccent, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Play entire playlist from beginning
  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong(songs[0], songs);
  };

  // Shuffle playlist and play
  const handleShuffle = () => {
    if (songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  // Play specific song
  const handlePlaySong = (song) => {
    playSong(song, songs);
    navigation.navigate('Song', { song, queue: songs });
  };

  // Remove song from playlist
  const handleRemoveSong = (songId) => {
    removeSongFromPlaylist(playlist.id, songId);
    setSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  // Delete playlist confirmation
  const handleDeletePlaylist = () => {
    setShowOptions(false);
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlaylist(playlist.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  // Save edited playlist info
  const handleSaveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await updatePlaylist(playlist.id, { name: trimmed, description: editDesc });
    setShowEditModal(false);
  };

  // Header Banner Component
  const renderHeader = () => (
    <View style={styles.bannerWrap}>
      {/* Artwork Box */}
      <View
        style={[
          styles.artworkBox,
          {
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.12)',
            borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
          },
        ]}
      >
        {songs[0]?.feature_image_url ? (
          <Image
            source={{ uri: songs[0].feature_image_url }}
            style={styles.artworkImg}
            resizeMode="cover"
          />
        ) : (
          <ListMusic size={40} color={colors.purpleAccent} strokeWidth={1.75} />
        )}
      </View>

      <Text style={[styles.playlistTitle, { color: colors.textWhite }]}>
        {playlist.name}
      </Text>

      {!!playlist.description && (
        <Text style={[styles.playlistDesc, { color: colors.textMuted }]}>
          {playlist.description}
        </Text>
      )}

      <Text style={[styles.playlistStats, { color: colors.textMuted }]}>
        {songs.length} {songs.length === 1 ? 'song' : 'songs'}
      </Text>

      {/* Action Buttons: Play All & Shuffle */}
      {songs.length > 0 && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.playAllBtn, { backgroundColor: colors.purple }]}
            onPress={handlePlayAll}
            activeOpacity={0.8}
          >
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.playAllText}>Play All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.shuffleBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: colors.divider,
              },
            ]}
            onPress={handleShuffle}
            activeOpacity={0.8}
          >
            <Shuffle size={16} color={colors.textWhite} />
            <Text style={[styles.shuffleText, { color: colors.textWhite }]}>Shuffle</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={colors.textWhite} />
        </TouchableOpacity>

        <Text style={[styles.topBarTitle, { color: colors.textWhite }]} numberOfLines={1}>
          {playlist.name}
        </Text>

        <TouchableOpacity
          style={styles.optionsBtn}
          onPress={() => setShowOptions(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreVertical size={20} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.purpleAccent} />
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 140 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)' }]}>
                <ListMusic size={40} color={colors.purpleAccent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textWhite }]}>This playlist is empty</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Tap the "+ Add to Playlist" button on any song to save it here
              </Text>
              <TouchableOpacity
                style={[styles.browseBtn, { backgroundColor: colors.purple }]}
                onPress={() => navigation.navigate('Categories')}
                activeOpacity={0.85}
              >
                <Text style={styles.browseBtnText}>Browse Songs</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[styles.songRow, { borderBottomColor: colors.divider }]}
              onPress={() => handlePlaySong(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.indexNumber, { color: colors.textMuted }]}>
                {index + 1}
              </Text>

              {item.feature_image_url ? (
                <Image source={{ uri: item.feature_image_url }} style={styles.songThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.songThumb, styles.songThumbFallback, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                  <ListMusic size={16} color={colors.textMuted} />
                </View>
              )}

              <View style={styles.songInfo}>
                <Text style={[styles.songTitle, { color: colors.textWhite }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.songCat, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.categories?.name || 'Original Song'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleRemoveSong(item.id)}
                style={styles.removeSongBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Playlist Options Modal */}
      <Modal visible={showOptions} transparent animationType="fade" onRequestClose={() => setShowOptions(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={[styles.optionsMenu, { backgroundColor: colors.cardBg, borderColor: colors.divider }]}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptions(false);
                setEditName(playlist.name);
                setEditDesc(playlist.description || '');
                setShowEditModal(true);
              }}
            >
              <Edit2 size={18} color={colors.textWhite} />
              <Text style={[styles.optionItemText, { color: colors.textWhite }]}>Edit Playlist Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={handleDeletePlaylist}>
              <Trash2 size={18} color={colors.danger} />
              <Text style={[styles.optionItemText, { color: colors.danger }]}>Delete Playlist</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Playlist Details Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.editBox, { backgroundColor: colors.cardBg, borderColor: colors.divider }]}>
            <Text style={[styles.editBoxTitle, { color: colors.textWhite }]}>Edit Playlist</Text>

            <TextInput
              style={[styles.input, { color: colors.textWhite, borderColor: colors.divider }]}
              placeholder="Playlist name"
              placeholderTextColor={colors.textMuted}
              value={editName}
              onChangeText={setEditName}
            />

            <TextInput
              style={[styles.input, { color: colors.textWhite, borderColor: colors.divider, height: 70 }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
            />

            <View style={styles.editBoxActions}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.editCancelBtn}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={!editName.trim()}
                style={[styles.editSaveBtn, { backgroundColor: colors.purple, opacity: editName.trim() ? 1 : 0.5 }]}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingTop: STATUS_BAR_H + 4,
    paddingBottom: 12,
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
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  optionsBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  artworkBox: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  artworkImg: {
    width: '100%',
    height: '100%',
  },
  playlistTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  playlistDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  playlistStats: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 24,
    gap: 8,
  },
  playAllText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  shuffleText: {
    fontWeight: '700',
    fontSize: 14,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indexNumber: {
    width: 24,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 10,
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
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  songCat: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  removeSongBtn: {
    padding: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  browseBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  browseBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  optionsMenu: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  optionItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  editBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  editBoxTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  editBoxActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  editCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  editSaveBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
});
