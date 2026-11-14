import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSettings } from './SettingsContext';
import { getLocalAudioUri } from '../lib/offlineManager';
import { logSongEvent } from '../lib/analytics';

const AudioContext = createContext(null);

export function AudioProvider({ children, navigationRef }) {
  const { settings } = useSettings();
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('');
  const [isAudioOffline, setIsAudioOffline] = useState(false);

  // Sleep Timer state
  const [sleepTimerOption, setSleepTimerOption] = useState(null); // null | '15' | '30' | '45' | '60' | 'end_of_song'
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState(null);
  const sleepTimerIntervalRef = useRef(null);

  // Single persistent expo-audio player instance with high-frequency progress updates (250ms)
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const prevDidFinishRef = useRef(false);

  // Sleep Timer controllers
  const clearSleepTimer = useCallback(() => {
    if (sleepTimerIntervalRef.current) {
      clearInterval(sleepTimerIntervalRef.current);
      sleepTimerIntervalRef.current = null;
    }
    setSleepTimerOption(null);
    setSleepTimerRemainingSec(null);
  }, []);

  const setSleepTimer = useCallback((option) => {
    if (sleepTimerIntervalRef.current) {
      clearInterval(sleepTimerIntervalRef.current);
      sleepTimerIntervalRef.current = null;
    }

    if (!option || option === 'off') {
      setSleepTimerOption(null);
      setSleepTimerRemainingSec(null);
      return;
    }

    if (option === 'end_of_song') {
      setSleepTimerOption('end_of_song');
      setSleepTimerRemainingSec(null);
      return;
    }

    const minutes = parseInt(option, 10);
    if (!isNaN(minutes) && minutes > 0) {
      const totalSec = minutes * 60;
      setSleepTimerOption(option);
      setSleepTimerRemainingSec(totalSec);

      sleepTimerIntervalRef.current = setInterval(() => {
        setSleepTimerRemainingSec((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(sleepTimerIntervalRef.current);
            sleepTimerIntervalRef.current = null;
            try {
              player.pause();
            } catch (_) {}
            setSleepTimerOption(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [player]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current);
      }
    };
  }, []);

  // Play a song and optionally set/update the playback queue
  const playSong = useCallback((song, newQueue = null) => {
    if (!song) return;

    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((s) => s.id === song.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else if (currentSong?.id !== song.id) {
      // If no new queue provided and it's a different song, keep existing queue or make single-item
      setQueue((prev) => {
        const idx = prev.findIndex((s) => s.id === song.id);
        if (idx >= 0) {
          setQueueIndex(idx);
          return prev;
        }
        setQueueIndex(0);
        return [song];
      });
    }

    // If tapping the already loaded song, just resume if paused
    if (currentSong?.id === song.id && song.mp3_url) {
      if (!player.playing) {
        player.play();
      }
      setIsMiniPlayerVisible(true);
      return;
    }

    setCurrentSong(song);
    setIsMiniPlayerVisible(true);

    const startPlayback = async () => {
      try {
        const localUri = await getLocalAudioUri(song.id);
        setIsAudioOffline(!!localUri);
        const targetUri = localUri || song.mp3_url;
        if (!targetUri) return;

        player.replace({ uri: targetUri });
        player.play();
        if (song?.id) {
          logSongEvent(song.id, 'play', settings?.deviceId);
        }
        try {
          player.setActiveForLockScreen(true, {
            title: song.title || 'Original Song',
            artist: song.categories?.name || song.category_name || 'JW Original Songs',
            artwork: song.feature_image_url || undefined,
          });
        } catch (_) {}
      } catch (err) {
        console.warn('Error loading audio:', err);
      }
    };

    startPlayback();
  }, [currentSong?.id, player]);

  // Toggle play / pause
  const togglePlayPause = useCallback(() => {
    if (!currentSong?.mp3_url) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [currentSong, player]);

  const pause = useCallback(() => {
    if (player.playing) {
      player.pause();
    }
  }, [player]);

  const play = useCallback(() => {
    if (!player.playing && currentSong?.mp3_url) {
      player.play();
    }
  }, [player, currentSong]);

  const seekTo = useCallback((seconds) => {
    if (typeof seconds === 'number' && !isNaN(seconds)) {
      player.seekTo(Math.max(0, seconds));
    }
  }, [player]);

  const seekBy = useCallback((seconds) => {
    const cur = status.currentTime || 0;
    const dur = status.duration || 0;
    const target = Math.max(0, Math.min(cur + seconds, dur));
    player.seekTo(target);
  }, [player, status.currentTime, status.duration]);

  // Play next track in queue
  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIdx = queueIndex + 1;
    if (nextIdx < queue.length) {
      const nextSong = queue[nextIdx];
      setQueueIndex(nextIdx);
      playSong(nextSong);
    } else {
      // End of queue
      player.pause();
    }
  }, [queue, queueIndex, playSong, player]);

  // Play previous track in queue
  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    // If more than 3 seconds in, restart current track
    if ((status.currentTime || 0) > 3) {
      player.seekTo(0);
      return;
    }
    const prevIdx = queueIndex - 1;
    if (prevIdx >= 0) {
      const prevSong = queue[prevIdx];
      setQueueIndex(prevIdx);
      playSong(prevSong);
    } else {
      player.seekTo(0);
    }
  }, [queue, queueIndex, status.currentTime, playSong, player]);

  // Dismiss mini player completely
  const dismissMiniPlayer = useCallback(() => {
    try {
      player.pause();
    } catch (_) {}
    setIsMiniPlayerVisible(false);
  }, [player]);

  // Continuous Play & Sleep Timer check: Auto-advance or pause when track finishes
  useEffect(() => {
    if (status.didJustFinish && !prevDidFinishRef.current) {
      prevDidFinishRef.current = true;
      if (sleepTimerOption === 'end_of_song') {
        try {
          player.pause();
        } catch (_) {}
        clearSleepTimer();
      } else if (settings?.autoPlay) {
        playNext();
      }
    } else if (!status.didJustFinish) {
      prevDidFinishRef.current = false;
    }
  }, [status.didJustFinish, sleepTimerOption, settings?.autoPlay, playNext, player, clearSleepTimer]);

  // Progress fraction (0 to 1)
  const progress = status.duration > 0 ? Math.min(1, Math.max(0, status.currentTime / status.duration)) : 0;

  const value = {
    player,
    status,
    currentSong,
    queue,
    queueIndex,
    isPlaying: !!player.playing,
    isBuffering: !!status.isBuffering,
    currentTime: status.currentTime || 0,
    duration: status.duration || 0,
    progress,
    isAudioOffline,
    isMiniPlayerVisible: isMiniPlayerVisible && !!currentSong && currentScreen !== 'Song',
    sleepTimerOption,
    sleepTimerRemainingSec,
    setSleepTimer,
    clearSleepTimer,
    setCurrentScreen,
    playSong,
    togglePlayPause,
    pause,
    play,
    seekTo,
    seekBy,
    playNext,
    playPrev,
    dismissMiniPlayer,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return ctx;
}

