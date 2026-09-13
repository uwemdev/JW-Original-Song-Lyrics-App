import React from 'react';
import { View, Platform } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useAudio } from '../context/AudioContext';
import MiniPlayer from './MiniPlayer';

// Helper to find the currently active route name deep in the navigator
const getActiveRouteName = (state) => {
  if (!state || !state.routes) return null;
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return route.name;
};

export default function GlobalPlayerOverlay() {
  const { currentSong, isPlaying, progress, pause, resume } = useAudio();
  const navigation = useNavigation();
  
  // Re-evaluates whenever navigation state changes
  const activeRouteName = useNavigationState(getActiveRouteName);

  // Don't show if there's no song, or if we're on the full SongScreen
  if (!currentSong || activeRouteName === 'Song') {
    return null;
  }

  return (
    <View style={{ position: 'absolute', bottom: Platform.OS === 'ios' ? 88 : 72, left: 0, right: 0 }}>
      <MiniPlayer
        song={currentSong}
        isPlaying={isPlaying}
        progress={progress}
        onPlayPause={() => (isPlaying ? pause() : resume())}
        onPress={() => navigation.navigate('Song', { song: currentSong })}
      />
    </View>
  );
}
