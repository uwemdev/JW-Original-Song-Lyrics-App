import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Check,
  X,
  Trophy,
  RotateCcw,
  Sparkles,
  Music,
  Heart,
  ChevronRight,
  HelpCircle,
  Award,
} from 'lucide-react-native';
import { generateQuizRound } from '../lib/quizEngine';
import ConfettiEffect from '../components/ConfettiEffect';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

const CHEER_PHRASES = [
  'Spot on! 🎉',
  'Yes, that’s it! 👏',
  'Incredible memory! ⭐',
  'Sing it loud and clear! 🎵',
  'You know your Kingdom songs! ✨',
];

export default function LyricQuizScreen({ navigation, route }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);

  const initialMode = route?.params?.mode || 'all';
  const [mode, setMode] = useState(initialMode); // 'all' or 'kids'
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [answersHistory, setAnswersHistory] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cheerMsg, setCheerMsg] = useState('');

  // Animations
  const cardFadeAnim = useRef(new Animated.Value(1)).current;
  const buttonBounceAnim = useRef(new Animated.Value(1)).current;
  const trophyScale = useRef(new Animated.Value(0.5)).current;

  // Initialize round
  useEffect(() => {
    startNewRound(mode);
  }, [mode]);

  const startNewRound = (quizMode) => {
    const round = generateQuizRound(5, quizMode);
    setQuestions(round);
    setCurrentIndex(0);
    setSelectedOption(null);
    setHasAnswered(false);
    setScore(0);
    setIsRoundOver(false);
    setAnswersHistory([]);
    setShowConfetti(false);
    setCheerMsg('');
    cardFadeAnim.setValue(1);
  };

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optIndex) => {
    if (hasAnswered || !currentQ) return;

    setSelectedOption(optIndex);
    setHasAnswered(true);

    const isCorrect = optIndex === currentQ.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      const randomCheer = CHEER_PHRASES[Math.floor(Math.random() * CHEER_PHRASES.length)];
      setCheerMsg(randomCheer);
    } else {
      setCheerMsg(`Missing lyric: “${currentQ.blank}”`);
    }

    setAnswersHistory((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        isCorrect,
        songTitle: currentQ.songTitle,
        blank: currentQ.blank,
      },
    ]);

    // Button bounce
    Animated.sequence([
      Animated.timing(buttonBounceAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.spring(buttonBounceAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      // Fade transition to next question
      Animated.sequence([
        Animated.timing(cardFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(cardFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
      setCheerMsg('');
    } else {
      // Round Finished!
      setIsRoundOver(true);
      setShowConfetti(true);

      Animated.spring(trophyScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RESULTS / SCORECARD VIEW
  // ═══════════════════════════════════════════════════════════════
  if (isRoundOver) {
    const isPerfect = score === 5;
    const isGood = score >= 3;

    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
        <ConfettiEffect active={showConfetti} />

        <ScrollView contentContainerStyle={styles.resultsScroll} showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color={colors.textWhite} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Family Worship Quiz</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Trophy & Celebration */}
          <View style={styles.trophySection}>
            <Animated.View style={[styles.trophyCircle, { transform: [{ scale: trophyScale }] }]}>
              <LinearGradient
                colors={
                  isPerfect
                    ? ['#F59E0B', '#D97706']
                    : isGood
                    ? ['#8B5CF6', '#6D28D9']
                    : ['#3B82F6', '#1D4ED8']
                }
                style={styles.trophyGradient}
              >
                {isPerfect ? (
                  <Trophy size={48} color="#FFF" />
                ) : (
                  <Award size={48} color="#FFF" />
                )}
              </LinearGradient>
            </Animated.View>

            <Text style={styles.resultsHeading}>
              {isPerfect
                ? '🏆 Perfect 5/5!'
                : score === 4
                ? '🌟 Fantastic Job!'
                : score === 3
                ? '👏 Great Effort!'
                : '❤️ Nice Try!'}
            </Text>

            <Text style={styles.resultsSub}>
              {isPerfect
                ? 'Your family knows their Kingdom songs inside and out! Truly wonderful memory!'
                : score === 4
                ? 'You almost had a clean sweep! Sing along together to master them all!'
                : score === 3
                ? 'Good teamwork for Family Worship! Play another round to beat your score.'
                : 'Family Worship is all about learning together. Sing along with the lyrics and try again!'}
            </Text>

            {/* Score Pill */}
            <View style={styles.scorePill}>
              <Text style={styles.scorePillText}>
                Score: <Text style={{ color: colors.purpleAccent, fontWeight: '800' }}>{score}</Text> / 5
              </Text>
            </View>
          </View>

          {/* Round Summary List */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Songs in This Round</Text>
            {answersHistory.map((item, idx) => (
              <View key={idx} style={styles.summaryRow}>
                <View
                  style={[
                    styles.summaryIconWrap,
                    { backgroundColor: item.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                  ]}
                >
                  {item.isCorrect ? (
                    <Check size={14} color="#10B981" />
                  ) : (
                    <X size={14} color="#EF4444" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summarySongTitle} numberOfLines={1}>
                    {item.songTitle}
                  </Text>
                  <Text style={styles.summaryBlankText} numberOfLines={1}>
                    Lyric: “{item.blank}”
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsWrap}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => startNewRound(mode)}
            >
              <RotateCcw size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Play Another Round</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.8}
              onPress={() => setMode(mode === 'all' ? 'kids' : 'all')}
            >
              <Sparkles size={16} color={colors.purpleAccent} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryBtnText}>
                {mode === 'all' ? 'Switch to Kids Mode' : 'Switch to All Songs'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textBtn}
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.textBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTIVE QUESTION GAMEPLAY VIEW
  // ═══════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.textWhite} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.topBarTitle}>Finish the Lyric</Text>
          <Text style={styles.topBarSub}>Family Worship Quiz</Text>
        </View>

        {/* Mode Pill Toggle */}
        <TouchableOpacity
          style={[styles.modeToggle, mode === 'kids' && styles.modeToggleKids]}
          onPress={() => setMode(mode === 'all' ? 'kids' : 'all')}
          activeOpacity={0.8}
        >
          <Text style={styles.modeToggleText}>{mode === 'kids' ? '👨‍👩‍👧 Kids' : '🎵 All'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.gameplayScroll} showsVerticalScrollIndicator={false}>
        {/* Progress Tracker (5 Dots) */}
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4].map((step) => {
            const isCompleted = step < currentIndex;
            const isCurrent = step === currentIndex;
            const stepResult = answersHistory[step];

            return (
              <View
                key={step}
                style={[
                  styles.progressDot,
                  isCurrent && styles.progressDotCurrent,
                  isCompleted && (stepResult?.isCorrect ? styles.progressDotSuccess : styles.progressDotFail),
                ]}
              >
                {isCompleted ? (
                  stepResult?.isCorrect ? (
                    <Check size={10} color="#FFF" />
                  ) : (
                    <X size={10} color="#FFF" />
                  )
                ) : (
                  <Text style={[styles.progressDotNum, isCurrent && styles.progressDotNumCurrent]}>
                    {step + 1}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Question Counter & Score Bar */}
        <View style={styles.subMetaRow}>
          <Text style={styles.questionNumText}>
            Question {currentIndex + 1} of 5
          </Text>
          <View style={styles.scoreBadge}>
            <Trophy size={12} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={styles.scoreBadgeText}>Score: {score}</Text>
          </View>
        </View>

        {/* Question Lyric Card */}
        {currentQ && (
          <Animated.View style={[styles.card, { opacity: cardFadeAnim }]}>
            {/* Song Origin Pill */}
            <View style={styles.songTag}>
              <Music size={13} color={colors.purpleAccent} style={{ marginRight: 5 }} />
              <Text style={styles.songTagText} numberOfLines={1}>
                {currentQ.songTitle}
              </Text>
            </View>

            {/* Lyric Snippet with Blank */}
            <View style={styles.lyricBox}>
              <Text style={styles.lyricText}>
                “{currentQ.lyricBefore}{' '}
                <Text style={styles.lyricBlankHighlight}>
                  {hasAnswered ? currentQ.blank : '______'}
                </Text>{' '}
                {currentQ.lyricAfter}”
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Answer Options (A, B, C) */}
        {currentQ && (
          <View style={styles.optionsWrap}>
            {currentQ.options.map((option, optIdx) => {
              const letter = ['A', 'B', 'C'][optIdx];
              const isChosen = selectedOption === optIdx;
              const isCorrectAnswer = optIdx === currentQ.correctIndex;

              let optionStyle = styles.optionCard;
              let letterWrapStyle = styles.optionLetterWrap;
              let textColor = colors.textWhite;

              if (hasAnswered) {
                if (isCorrectAnswer) {
                  optionStyle = [styles.optionCard, styles.optionCorrect];
                  letterWrapStyle = [styles.optionLetterWrap, styles.optionLetterCorrect];
                  textColor = '#FFFFFF';
                } else if (isChosen && !isCorrectAnswer) {
                  optionStyle = [styles.optionCard, styles.optionWrong];
                  letterWrapStyle = [styles.optionLetterWrap, styles.optionLetterWrong];
                  textColor = '#FFFFFF';
                } else {
                  optionStyle = [styles.optionCard, styles.optionDimmed];
                }
              }

              return (
                <TouchableOpacity
                  key={optIdx}
                  style={optionStyle}
                  onPress={() => handleSelectOption(optIdx)}
                  activeOpacity={hasAnswered ? 1 : 0.75}
                  disabled={hasAnswered}
                >
                  <View style={letterWrapStyle}>
                    <Text style={styles.optionLetter}>{letter}</Text>
                  </View>
                  <Text style={[styles.optionText, { color: textColor }]} numberOfLines={2}>
                    {option}
                  </Text>
                  {hasAnswered && isCorrectAnswer && (
                    <View style={styles.resultIconWrap}>
                      <Check size={18} color="#10B981" />
                    </View>
                  )}
                  {hasAnswered && isChosen && !isCorrectAnswer && (
                    <View style={styles.resultIconWrap}>
                      <X size={18} color="#EF4444" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Immediate Feedback Banner & Next Button */}
        {hasAnswered && (
          <Animated.View style={[styles.feedbackWrap, { transform: [{ scale: buttonBounceAnim }] }]}>
            <View
              style={[
                styles.feedbackBanner,
                selectedOption === currentQ.correctIndex
                  ? styles.feedbackBannerSuccess
                  : styles.feedbackBannerWrong,
              ]}
            >
              <Text style={styles.feedbackText}>{cheerMsg}</Text>
            </View>

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={handleNextQuestion}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>
                {currentIndex < questions.length - 1 ? 'Next Question' : 'See Final Score 🏆'}
              </Text>
              <ChevronRight size={18} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 54 : 40,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleWrap: {
      alignItems: 'center',
    },
    topBarTitle: {
      color: colors.textWhite,
      fontSize: 18,
      fontWeight: '800',
    },
    topBarSub: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    modeToggle: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    modeToggleKids: {
      backgroundColor: 'rgba(236, 72, 153, 0.15)',
      borderColor: 'rgba(236, 72, 153, 0.3)',
    },
    modeToggleText: {
      color: colors.textWhite,
      fontSize: 12,
      fontWeight: '700',
    },
    gameplayScroll: {
      paddingHorizontal: 18,
      paddingBottom: 40,
    },

    // ── Progress Dots ──
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      marginBottom: 16,
    },
    progressDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    progressDotCurrent: {
      borderColor: colors.purpleAccent,
      backgroundColor: 'rgba(139, 92, 246, 0.25)',
      transform: [{ scale: 1.1 }],
    },
    progressDotSuccess: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    progressDotFail: {
      backgroundColor: '#EF4444',
      borderColor: '#EF4444',
    },
    progressDotNum: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    progressDotNumCurrent: {
      color: '#FFFFFF',
    },

    // ── Sub Meta ──
    subMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    questionNumText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    scoreBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    scoreBadgeText: {
      color: '#F59E0B',
      fontSize: 12,
      fontWeight: '700',
    },

    // ── Question Card ──
    card: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    songTag: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      marginBottom: 14,
    },
    songTagText: {
      color: colors.purpleAccent,
      fontSize: 12,
      fontWeight: '700',
    },
    lyricBox: {
      minHeight: 80,
      justifyContent: 'center',
    },
    lyricText: {
      color: colors.textWhite,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 28,
      fontStyle: 'italic',
    },
    lyricBlankHighlight: {
      color: colors.purpleAccent,
      fontWeight: '800',
      textDecorationLine: 'underline',
      fontStyle: 'normal',
    },

    // ── Options ──
    optionsWrap: {
      gap: 12,
      marginBottom: 20,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    optionLetterWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    optionLetter: {
      color: colors.textWhite,
      fontSize: 14,
      fontWeight: '700',
    },
    optionText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
    },
    optionCorrect: {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderColor: '#10B981',
    },
    optionLetterCorrect: {
      backgroundColor: '#10B981',
    },
    optionWrong: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderColor: '#EF4444',
    },
    optionLetterWrong: {
      backgroundColor: '#EF4444',
    },
    optionDimmed: {
      opacity: 0.5,
    },
    resultIconWrap: {
      marginLeft: 8,
    },

    // ── Feedback & Next ──
    feedbackWrap: {
      marginTop: 4,
      marginBottom: 24,
    },
    feedbackBanner: {
      padding: 14,
      borderRadius: 14,
      marginBottom: 12,
      alignItems: 'center',
    },
    feedbackBannerSuccess: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    feedbackBannerWrong: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    feedbackText: {
      color: colors.textWhite,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    nextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.purple,
      paddingVertical: 14,
      borderRadius: 16,
      elevation: 4,
      shadowColor: colors.purple,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      gap: 6,
    },
    nextBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },

    // ── Results Screen Styles ──
    resultsScroll: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    trophySection: {
      alignItems: 'center',
      marginVertical: 20,
    },
    trophyCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      marginBottom: 16,
      elevation: 6,
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
    },
    trophyGradient: {
      flex: 1,
      borderRadius: 45,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resultsHeading: {
      color: colors.textWhite,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 8,
    },
    resultsSub: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    scorePill: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    scorePillText: {
      color: colors.textWhite,
      fontSize: 15,
      fontWeight: '600',
    },

    // Summary Card
    summaryCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    summaryCardTitle: {
      color: colors.textWhite,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
      gap: 10,
    },
    summaryIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    summarySongTitle: {
      color: colors.textWhite,
      fontSize: 14,
      fontWeight: '600',
    },
    summaryBlankText: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },

    // Actions
    actionsWrap: {
      gap: 10,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.purple,
      paddingVertical: 14,
      borderRadius: 16,
      elevation: 4,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    secondaryBtnText: {
      color: colors.purpleAccent,
      fontSize: 15,
      fontWeight: '700',
    },
    textBtn: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    textBtnText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
  });

