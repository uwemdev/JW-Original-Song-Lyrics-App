import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Music } from 'lucide-react-native';
import MoodIcon from './MoodIcon';

export default function ActiveMoodBanner({ mood, songCount, onClear }) {
  if (!mood) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={mood.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View style={styles.iconCircle}>
              <MoodIcon moodId={mood.id} size={18} color="#FFF" />
            </View>
            <View style={styles.countBadge}>
              <Music size={11} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.countText}>
                {songCount} {songCount === 1 ? 'song' : 'songs'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.clearBtn}
            onPress={onClear}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
            <X size={14} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{mood.title}</Text>
        <Text style={styles.description}>{mood.description}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  gradient: {
    borderRadius: 18,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  countText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    gap: 4,
  },
  clearBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
