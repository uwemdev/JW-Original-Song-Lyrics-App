import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Star, Sparkles, ExternalLink, MessageSquare, X, Heart } from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import { openStorePage } from '../lib/versionCheck';

const { width } = Dimensions.get('window');

export const RATING_STORAGE_KEYS = {
  HAS_RATED: '@app_has_rated_store',
  REMIND_LATER: '@app_rating_remind_later_time',
  DISMISSED: '@app_rating_dismissed',
};

/**
 * Check whether the 7-day rating prompt should be shown.
 */
export async function shouldShowRatingPrompt(installDate) {
  try {
    if (!installDate) return false;

    // Check if user already rated
    const hasRated = await AsyncStorage.getItem(RATING_STORAGE_KEYS.HAS_RATED);
    if (hasRated === 'true') return false;

    // Check if permanently dismissed
    const dismissed = await AsyncStorage.getItem(RATING_STORAGE_KEYS.DISMISSED);
    if (dismissed === 'true') return false;

    // Check remind later delay
    const remindLaterStr = await AsyncStorage.getItem(RATING_STORAGE_KEYS.REMIND_LATER);
    if (remindLaterStr) {
      const remindTime = parseInt(remindLaterStr, 10);
      if (Date.now() < remindTime) return false;
    }

    // Check if 7 days have passed since install
    const installedAt = new Date(installDate).getTime();
    if (isNaN(installedAt)) return false;

    const daysPassed = (Date.now() - installedAt) / (1000 * 60 * 60 * 24);
    return daysPassed >= 7;
  } catch (err) {
    return false;
  }
}

export default function RatingModal({
  visible,
  onClose,
  navigation,
  isManualTrigger = false,
}) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);

  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const starScales = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (visible) {
      setRating(5);
      setSubmitted(false);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleSelectStar = (selectedStar) => {
    setRating(selectedStar);
    const starIdx = selectedStar - 1;
    if (starScales[starIdx]) {
      Animated.sequence([
        Animated.timing(starScales[starIdx], { toValue: 1.35, duration: 100, useNativeDriver: true }),
        Animated.spring(starScales[starIdx], { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleRateOnPlayStore = async () => {
    try {
      await AsyncStorage.setItem(RATING_STORAGE_KEYS.HAS_RATED, 'true');
    } catch (_) {}

    setSubmitted(true);
    setTimeout(() => {
      openStorePage();
      if (onClose) onClose();
    }, 400);
  };

  const handleSendFeedback = () => {
    if (onClose) onClose();
    if (navigation) {
      navigation.navigate('FeedbackScreen');
    }
  };

  const handleRemindLater = async () => {
    try {
      // Remind again in 3 days
      const threeDaysMs = Date.now() + 3 * 24 * 60 * 60 * 1000;
      await AsyncStorage.setItem(RATING_STORAGE_KEYS.REMIND_LATER, String(threeDaysMs));
    } catch (_) {}
    if (onClose) onClose();
  };

  const handleDismiss = async () => {
    try {
      if (!isManualTrigger) {
        await AsyncStorage.setItem(RATING_STORAGE_KEYS.DISMISSED, 'true');
      }
    } catch (_) {}
    if (onClose) onClose();
  };

  if (!visible) return null;

  const isHighRating = rating >= 4;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleDismiss}
        />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close rating modal"
          >
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Top Badge Icon */}
          <View style={styles.topBadgeWrap}>
            <View style={styles.badgeCircle}>
              <Star size={32} color="#F59E0B" fill="#F59E0B" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isHighRating ? 'Enjoying the App?' : 'How Can We Improve?'}
          </Text>

          {/* Description */}
          <Text style={styles.body}>
            {isHighRating
              ? 'Your 5-star rating helps brothers and sisters discover uplifting Kingdom song lyrics and sing-alongs worldwide.'
              : 'We strive to make your worship and sing-along experience wonderful. Tell us how we can make the app better for you.'}
          </Text>

          {/* 5 Interactive Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((starNum) => {
              const isFilled = starNum <= rating;
              return (
                <TouchableOpacity
                  key={starNum}
                  onPress={() => handleSelectStar(starNum)}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${starNum} stars`}
                >
                  <Animated.View style={{ transform: [{ scale: starScales[starNum - 1] }] }}>
                    <Star
                      size={36}
                      color={isFilled ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}
                      fill={isFilled ? '#F59E0B' : 'transparent'}
                      strokeWidth={1.8}
                    />
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Star label hint */}
          <Text style={styles.ratingHint}>
            {rating === 5
              ? 'Loved it! 5 Stars'
              : rating === 4
              ? 'Very Good! 4 Stars'
              : rating === 3
              ? 'It’s Okay — 3 Stars'
              : rating === 2
              ? 'Needs Work — 2 Stars'
              : 'Needs Improvement — 1 Star'}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsWrap}>
            {isHighRating ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRateOnPlayStore}
                activeOpacity={0.85}
              >
                <Star size={18} color="#FFF" fill="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Rate 5 Stars on Google Play</Text>
                <ExternalLink size={15} color="#FFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtnFeedback}
                onPress={handleSendFeedback}
                activeOpacity={0.85}
              >
                <MessageSquare size={17} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Send Us Feedback</Text>
              </TouchableOpacity>
            )}

            {/* Secondary Option */}
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleRemindLater}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Maybe Later</Text>
              </TouchableOpacity>

              {!isHighRating && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleRateOnPlayStore}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.purpleAccent }]}>
                    Rate on Play Store anyway
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: isDark ? '#1A1425' : '#FFFFFF',
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    closeBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    topBadgeWrap: {
      marginBottom: 16,
    },
    badgeCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderWidth: 1.5,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: 10,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 8,
      marginBottom: 20,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 8,
    },
    starTouch: {
      padding: 4,
    },
    ratingHint: {
      fontSize: 13,
      fontWeight: '700',
      color: '#F59E0B',
      marginBottom: 24,
    },
    actionsWrap: {
      width: '100%',
      gap: 12,
    },
    primaryBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#7C3AED',
      paddingVertical: 14,
      borderRadius: 14,
      ...Platform.select({
        ios: {
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    primaryBtnFeedback: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2563EB',
      paddingVertical: 14,
      borderRadius: 14,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    secondaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginTop: 4,
    },
    secondaryBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    secondaryBtnText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
  });
