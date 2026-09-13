import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, useWindowDimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// import { Audio } from 'expo-av';
import { Play, Pause, Square, Music, ChevronDown } from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';

export default function SongScreen({ route, navigation }) {
  const { song } = route.params;
  const { width, height } = useWindowDimensions();
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        // sound.unloadAsync();
      }
    };
  }, [sound]);

  async function handlePlayPause() {
    if (!song.mp3_url) return;

    try {
      if (sound) {
        if (isPlaying) {
          // await sound.pauseAsync();
        } else {
          // await sound.playAsync();
        }
      } else {
        // const { sound: newSound } = await Audio.Sound.createAsync(
        //   { uri: song.mp3_url },
        //   { shouldPlay: true },
        //   onPlaybackStatusUpdate
        // );
        // setSound(newSound);
        alert("Audio playback requires compiling the app. It's disabled in the Expo Go preview.");
      }
    } catch (err) {
      console.error('Error playing audio', err);
    }
  }

  async function handleStop() {
    if (sound) {
      // await sound.stopAsync();
      // await sound.setPositionAsync(0);
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background artwork blur effect */}
      {song.feature_image_url && (
        <>
          <Image source={{ uri: song.feature_image_url }} style={styles.bgImage} blurRadius={90} />
          <View style={styles.bgOverlay} />
        </>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header Controls */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ChevronDown color="#FFF" size={32} />
          </TouchableOpacity>
        </View>

        {/* Artwork */}
        <View style={styles.artworkContainer}>
          {song.feature_image_url ? (
            <Image source={{ uri: song.feature_image_url }} style={styles.artwork} />
          ) : (
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              style={styles.artworkPlaceholder}
            >
              <Music color="#FFF" size={80} opacity={0.5} />
            </LinearGradient>
          )}
        </View>
        
        {/* Title Info */}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>{song.title}</Text>
          <Text style={styles.artist}>Original Song</Text>
        </View>
        
        {/* Player Controls */}
        {song.mp3_url && (
          <View style={styles.playerContainer}>
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

            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                <Square color="#94A3B8" size={24} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handlePlayPause}>
                <LinearGradient
                  colors={['#8B5CF6', '#F472B6']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.playButton}
                >
                  {isPlaying ? <Pause color="#FFF" size={32} fill="#FFF" /> : <Play color="#FFF" size={32} fill="#FFF" style={{marginLeft: 4}} />}
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Placeholder for symmetry */}
              <View style={{ width: 48 }} />
            </View>
          </View>
        )}

        {/* Content Tabs (Lyrics & Info) */}
        <View style={styles.infoCard}>
          {song.writeup ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this Song</Text>
              <Text style={styles.writeup}>{song.writeup}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lyrics</Text>
            <RenderHTML
              contentWidth={width - 48} // Adjusting for padding
              source={{ html: song.lyrics || '<p>No lyrics available.</p>' }}
              baseStyle={{ color: '#E2E8F0', fontSize: 18, lineHeight: 32 }}
              tagsStyles={{
                p: { marginBottom: 20 }
              }}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712', // Fallback
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
  },
  content: {
    padding: 24,
    paddingTop: 60, // For status bar
    paddingBottom: 100, // For bottom tab
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 30,
  },
  iconButton: {
    padding: 8,
    marginLeft: -8,
  },
  artworkContainer: {
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  artwork: {
    width: 300,
    height: 300,
    borderRadius: 20,
  },
  artworkPlaceholder: {
    width: 300,
    height: 300,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
  },
  artist: {
    fontSize: 18,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  playerContainer: {
    marginBottom: 40,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    width: 36,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F472B6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  stopButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  writeup: {
    fontSize: 16,
    lineHeight: 28,
    color: '#94A3B8',
    fontStyle: 'italic',
  }
});
