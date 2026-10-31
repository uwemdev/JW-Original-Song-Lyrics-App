import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlaylistContext = createContext(null);
const STORAGE_KEY = '@user_playlists';

// Initial default starter playlist if user has no playlists
const DEFAULT_PLAYLISTS = [
  {
    id: 'pl_family_worship',
    name: 'Family Worship',
    description: 'Favorite songs for family worship and study evenings',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    songIds: [],
  },
];

export function PlaylistProvider({ children }) {
  const [playlists, setPlaylists] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load playlists from storage on launch
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setPlaylists(parsed);
          } else {
            setPlaylists(DEFAULT_PLAYLISTS);
          }
        } else {
          setPlaylists(DEFAULT_PLAYLISTS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLAYLISTS));
        }
      } catch (err) {
        console.warn('Failed to load playlists:', err);
        setPlaylists(DEFAULT_PLAYLISTS);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save to storage helper
  const persistPlaylists = async (newList) => {
    setPlaylists(newList);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (err) {
      console.warn('Failed to save playlists:', err);
    }
  };

  // Create a new playlist
  const createPlaylist = useCallback(async (name, description = '') => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;

    const newPlaylist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      description: (description || '').trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      songIds: [],
    };

    const updated = [newPlaylist, ...playlists];
    await persistPlaylists(updated);
    return newPlaylist;
  }, [playlists]);

  // Rename or update playlist details
  const updatePlaylist = useCallback(async (playlistId, { name, description }) => {
    const updated = playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        name: typeof name === 'string' && name.trim() ? name.trim() : pl.name,
        description: typeof description === 'string' ? description.trim() : pl.description,
        updatedAt: Date.now(),
      };
    });
    await persistPlaylists(updated);
  }, [playlists]);

  // Delete a playlist
  const deletePlaylist = useCallback(async (playlistId) => {
    const updated = playlists.filter((pl) => pl.id !== playlistId);
    await persistPlaylists(updated);
  }, [playlists]);

  // Add song to playlist
  const addSongToPlaylist = useCallback(async (playlistId, songId) => {
    if (!songId) return;
    const target = playlists.find((pl) => pl.id === playlistId);
    if (!target) return;

    if (target.songIds.includes(songId)) return;

    const updated = playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        songIds: [songId, ...pl.songIds],
        updatedAt: Date.now(),
      };
    });

    await persistPlaylists(updated);
  }, [playlists]);

  // Remove song from playlist
  const removeSongFromPlaylist = useCallback(async (playlistId, songId) => {
    const updated = playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        songIds: pl.songIds.filter((id) => id !== songId),
        updatedAt: Date.now(),
      };
    });

    await persistPlaylists(updated);
  }, [playlists]);

  // Toggle song in playlist (returns { added: boolean, playlistName: string })
  const toggleSongInPlaylist = useCallback(async (playlistId, songId) => {
    const target = playlists.find((pl) => pl.id === playlistId);
    if (!target) return { added: false, playlistName: '' };

    const exists = target.songIds.includes(songId);
    if (exists) {
      await removeSongFromPlaylist(playlistId, songId);
      return { added: false, playlistName: target.name };
    } else {
      await addSongToPlaylist(playlistId, songId);
      return { added: true, playlistName: target.name };
    }
  }, [playlists, addSongToPlaylist, removeSongFromPlaylist]);

  // Check if a song is in a given playlist
  const isSongInPlaylist = useCallback((playlistId, songId) => {
    const pl = playlists.find((p) => p.id === playlistId);
    return pl ? pl.songIds.includes(songId) : false;
  }, [playlists]);

  // Get all playlists that contain a song
  const getPlaylistsForSong = useCallback((songId) => {
    return playlists.filter((pl) => pl.songIds.includes(songId));
  }, [playlists]);

  // Find a playlist by ID
  const getPlaylistById = useCallback((playlistId) => {
    return playlists.find((pl) => pl.id === playlistId) || null;
  }, [playlists]);

  const value = {
    playlists,
    loaded,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    toggleSongInPlaylist,
    isSongInPlaylist,
    getPlaylistsForSong,
    getPlaylistById,
  };

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylists() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylists must be used within a PlaylistProvider');
  }
  return context;
}
