import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Trophy, ChevronRight, Users } from 'lucide-react-native';

export default function FamilyQuizBanner({ onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={['#7C3AED', '#5B21B6', '#312E81']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Top Tag */}
            <View style={styles.topRow}>
              <View style={styles.tag}>
                <Users size={12} color="#FDE047" style={{ marginRight: 5 }} />
                <Text style={styles.tagText}>Family Worship Activity</Text>
              </View>
              <View style={styles.sparkleWrap}>
                <Sparkles size={16} color="rgba(255, 255, 255, 0.7)" />
              </View>
            </View>

            {/* Title & Description */}
            <Text style={styles.title}>“Finish the Lyric” Quiz</Text>
            <Text style={styles.subtitle}>
              Test your family’s song memory with 5 fun questions together!
            </Text>

            {/* Bottom Play Button */}
            <View style={styles.bottomRow}>
              <View style={styles.badge}>
                <Trophy size={13} color="#F59E0B" style={{ marginRight: 5 }} />
                <Text style={styles.badgeText}>5 Quick Questions</Text>
              </View>

              <View style={styles.playBtn}>
                <Text style={styles.playBtnText}>Play Now</Text>
                <ChevronRight size={14} color="#FFF" />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  card: {
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    borderRadius: 20,
    padding: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(253, 224, 71, 0.18)',
  },
  tagText: {
    color: '#FDE047',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sparkleWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
