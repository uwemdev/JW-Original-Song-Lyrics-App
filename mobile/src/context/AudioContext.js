import React, { createContext, useState, useEffect, useContext } from 'react';
import { Audio } from 'expo-av';

export const AudioContext = createContext(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const [sound, setSound] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  // Configure Audio for playback (allows it to play even on silent switch on iOS)
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: 1, // INTERRUPTION_MODE_IOS_DO_NOT_MIX
      interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(console.error);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    } else if (status.error) {
      console.error('Playback error:', status.error);
    }
  };

  const playSong = async (song) => {
    try {
      // If pressing the same song that is already playing or paused
      if (currentSong?.id === song.id) {
        if (sound) {
          if (isPlaying) {
            await sound.pauseAsync();
          } else {
            await sound.playAsync();
          }
          return;
        }
      }

      // If playing a new song
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setCurrentSong(song);
      setIsPlaying(false);
      setPosition(0);
      setIsBuffering(true);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.mp3_url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
    } catch (err) {
      console.error('Failed to load sound', err);
      setIsBuffering(false);
    }
  };

  const pause = async () => {
    if (sound) {
      await sound.pauseAsync();
    }
  };

  const resume = async () => {
    if (sound) {
      await sound.playAsync();
    }
  };

  const seek = async (millis) => {
    if (sound) {
      await sound.setPositionAsync(millis);
    }
  };

  const stop = async () => {
    if (sound) {
      await sound.stopAsync();
      setPosition(0);
      setIsPlaying(false);
    }
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        isBuffering,
        position,
        duration,
        progress,
        playSong,
        pause,
        resume,
        seek,
        stop,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};
