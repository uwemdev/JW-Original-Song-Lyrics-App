import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Users, ChevronRight } from 'lucide-react-native';

export default function CommunityBanner({ onPress }) {
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
            colors={['#1E1B4B', '#312E81', '#4338CA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Top Tag Row */}
            <View style={styles.topRow}>
              <View style={styles.tag}>
                <View style={styles.liveDot} />
                <Text style={styles.tagText}>LIVE FELLOWSHIP LOUNGE</Text>
              </View>
              <View style={styles.usersWrap}>
                <Users size={15} color="rgba(255, 255, 255, 0.75)" />
              </View>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Join the Community Lounge</Text>
            <Text style={styles.subtitle}>
              Anonymous real-time fellowship, live chat, and 1-on-1 direct messaging with friends worldwide.
            </Text>

            {/* Bottom Row */}
            <View style={styles.bottomRow}>
              <View style={styles.actionBtn}>
                <MessageSquare size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Enter Lounge</Text>
                <ChevronRight size={14} color="#FFF" style={{ marginLeft: 2 }} />
              </View>
              <Text style={styles.safetyHint}>Safe & Anonymous (No phone or personal data)</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  gradient: {
    padding: 16,
    borderRadius: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  tagText: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  usersWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  safetyHint: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '500',
  },
});
