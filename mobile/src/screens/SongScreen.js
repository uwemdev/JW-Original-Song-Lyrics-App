import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause, Square } from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';

export default function SongScreen({ route }) {
  const { song } = route.params;
  const { width } = useWindowDimensions();
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  async function handlePlayPause() {
    if (!song.audio_url) return;

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: song.audio_url },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
      }
    } catch (err) {
      console.error('Error playing audio', err);
    }
  }

  async function handleStop() {
    if (sound) {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
    }
  }

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {song.feature_image_url && (
        <Image source={{ uri: song.feature_image_url }} style={styles.heroImage} />
      )}
      
      <Text style={styles.title}>{song.title}</Text>
      
      {song.audio_url && (
        <View style={styles.playerContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
              {isPlaying ? <Pause color="#FFF" size={24} /> : <Play color="#FFF" size={24} />}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Square color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.progressRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }
                ]} 
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      )}

      {song.writeup ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this Song</Text>
          <Text style={styles.writeup}>{song.writeup}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lyrics</Text>
        <RenderHTML
          contentWidth={width}
          source={{ html: song.lyrics || '<p>No lyrics available.</p>' }}
          baseStyle={{ color: '#CBD5E1', fontSize: 16, lineHeight: 32 }}
          tagsStyles={{
            p: { marginBottom: 16 }
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 24,
  },
  playerContainer: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
    gap: 16,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    width: 40,
    textAlign: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  writeup: {
    fontSize: 15,
    lineHeight: 24,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  lyrics: {
    fontSize: 16,
    lineHeight: 32,
    color: '#CBD5E1',
  }
});
