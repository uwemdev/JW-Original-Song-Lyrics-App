import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Plus, Check, ListMusic } from 'lucide-react-native';
import { usePlaylists } from '../context/PlaylistContext';
import { useSettings } from '../context/SettingsContext';

export default function AddToPlaylistModal({ visible, onClose, song, onToast }) {
  const { colors, isDark } = useSettings();
  const { playlists, toggleSongInPlaylist, createPlaylist, isSongInPlaylist } = usePlaylists();

  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!song) return null;

  const handleToggle = async (playlist) => {
    const res = await toggleSongInPlaylist(playlist.id, song.id);
    if (onToast) {
      onToast(res.added ? `Added to "${res.playlistName}"` : `Removed from "${res.playlistName}"`);
    }
  };

  const handleCreate = async () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;

    const created = await createPlaylist(trimmed);
    if (created) {
      await toggleSongInPlaylist(created.id, song.id);
      setNewPlaylistName('');
      setIsCreating(false);
      if (onToast) {
        onToast(`Created "${created.name}" and added song`);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              {/* Drag Indicator */}
              <View style={styles.dragBarWrap}>
                <View style={[styles.dragBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerTitle, { color: colors.textWhite }]}>
                    Add to Playlist
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {song.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* In-line Create Playlist Box */}
              {isCreating ? (
                <View style={[styles.createBox, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)', borderColor: colors.purpleAccent }]}>
                  <TextInput
                    style={[styles.createInput, { color: colors.textWhite }]}
                    placeholder="Playlist name (e.g. Family Worship)"
                    placeholderTextColor={colors.textMuted}
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    autoFocus
                    maxLength={40}
                  />
                  <View style={styles.createActions}>
                    <TouchableOpacity
                      onPress={() => { setIsCreating(false); setNewPlaylistName(''); }}
                      style={styles.cancelCreateBtn}
                    >
                      <Text style={[styles.cancelCreateText, { color: colors.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCreate}
                      disabled={!newPlaylistName.trim()}
                      style={[
                        styles.submitCreateBtn,
                        { backgroundColor: colors.purple, opacity: newPlaylistName.trim() ? 1 : 0.5 },
                      ]}
                    >
                      <Text style={styles.submitCreateText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsCreating(true)}
                  style={[styles.newPlaylistBtn, { borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)' }]}
                  activeOpacity={0.75}
                >
                  <View style={[styles.newPlaylistIconWrap, { backgroundColor: 'rgba(109, 40, 217, 0.15)' }]}>
                    <Plus size={18} color={colors.purpleAccent} />
                  </View>
                  <Text style={[styles.newPlaylistText, { color: colors.purpleAccent }]}>
                    New Playlist
                  </Text>
                </TouchableOpacity>
              )}

              {/* Playlists List */}
              <FlatList
                data={playlists}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => {
                  const inPlaylist = isSongInPlaylist(item.id, song.id);
                  const songCount = item.songIds?.length || 0;

                  return (
                    <TouchableOpacity
                      style={[styles.playlistRow, { borderBottomColor: colors.divider }]}
                      onPress={() => handleToggle(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.playlistIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <ListMusic size={20} color={inPlaylist ? colors.purpleAccent : colors.textMuted} />
                      </View>

                      <View style={styles.playlistRowInfo}>
                        <Text style={[styles.playlistName, { color: colors.textWhite }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.playlistCount, { color: colors.textMuted }]}>
                          {songCount} {songCount === 1 ? 'song' : 'songs'}
                        </Text>
                      </View>

                      {/* Checkbox indicator */}
                      <View
                        style={[
                          styles.checkbox,
                          inPlaylist
                            ? { backgroundColor: colors.purple, borderColor: colors.purple }
                            : { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' },
                        ]}
                      >
                        {inPlaylist && <Check size={14} color="#FFFFFF" strokeWidth={2.5} />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '75%',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dragBarWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  newPlaylistIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPlaylistText: {
    fontSize: 14,
    fontWeight: '700',
  },
  createBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  createInput: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 6,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  cancelCreateBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelCreateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitCreateBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  submitCreateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    marginTop: 4,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistRowInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '700',
  },
  playlistCount: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
