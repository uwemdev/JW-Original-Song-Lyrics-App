import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, X, ChevronRight } from 'lucide-react-native';
import { MOODS } from '../lib/moodCategories';
import MoodIcon from './MoodIcon';
import { useSettings } from '../context/SettingsContext';

export default function MoodPills({
  selectedMood,
  onSelectMood,
  showHeader = true,
  compact = false,
}) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark, compact);
  const scrollRef = useRef(null);

  // Auto-nudge peek animation on mount so users visually see the options slide and discover other moods
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 95, animated: true });
      const returnTimer = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, animated: true });
      }, 750);
      return () => clearTimeout(returnTimer);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.heartIconWrap}>
              <Heart size={14} color="#EC4899" fill="#EC4899" />
            </View>
            <Text style={styles.title}>How are you feeling today?</Text>
            {selectedMood ? (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => onSelectMood(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearBtnText}>Reset</Text>
                <X size={12} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <View style={styles.scrollHint}>
                <Text style={styles.scrollHintText}>Swipe</Text>
                <ChevronRight size={13} color={colors.textMuted} />
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            Find uplifting songs for your heart’s current need
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.id;

          if (isSelected) {
            return (
              <TouchableOpacity
                key={mood.id}
                activeOpacity={0.85}
                onPress={() => onSelectMood(null)} // toggle off
                style={styles.pillActiveWrap}
              >
                <LinearGradient
                  colors={mood.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pillActive}
                >
                  <View style={styles.pillIconWrapActive}>
                    <MoodIcon moodId={mood.id} size={15} color="#FFF" />
                  </View>
                  <Text style={styles.pillTextActive}>{mood.tagline}</Text>
                  <View style={styles.activeCheckCircle}>
                    <X size={11} color="#FFF" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={mood.id}
              activeOpacity={0.7}
              onPress={() => onSelectMood(mood.id)}
              style={styles.pillInactive}
            >
              <View
                style={[
                  styles.pillIconWrapInactive,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : mood.lightBg,
                  },
                ]}
              >
                <MoodIcon moodId={mood.id} size={14} color={mood.accentColor} />
              </View>
              <Text style={styles.pillTextInactive}>{mood.tagline}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors, isDark, compact) =>
  StyleSheet.create({
    container: {
      marginVertical: compact ? 6 : 10,
    },
    header: {
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heartIconWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(236, 72, 153, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 6,
    },
    title: {
      color: colors.textWhite,
      fontSize: compact ? 14 : 16,
      fontWeight: '800',
      flex: 1,
      letterSpacing: -0.2,
    },
    scrollHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    scrollHintText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.06)',
      gap: 4,
    },
    clearBtnText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
      marginLeft: 28,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingVertical: 2,
      gap: 8,
    },
    pillInactive: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    },
    pillIconWrapInactive: {
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 7,
    },
    pillActiveWrap: {
      borderRadius: 22,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    pillActive: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 22,
    },
    pillIconWrapActive: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 7,
    },
    pillTextInactive: {
      color: colors.textWhite,
      fontSize: 13,
      fontWeight: '600',
    },
    pillTextActive: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    activeCheckCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(255, 255, 255, 0.28)',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 7,
    },
  });
