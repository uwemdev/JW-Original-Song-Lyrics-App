import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Image,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Music, BookOpen, Headphones } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// ─── Brand Palette ───────────────────────────────────────────────
const BG_DARK = '#0F0A1A';
const PURPLE_PRIMARY = '#6D28D9';
const PURPLE_ACCENT = '#A78BFA';
const PURPLE_FAINT = '#C4B5FD';
const TEXT_MUTED = '#B8AFC9';
const CARD_BG = '#1A1425';
const ICON_BG = '#251B3A';

// ─── Responsive sizing ───────────────────────────────────────────
const isSmall = height < 800;
const scale = isSmall ? 0.75 : 1;

// ─── Dot ring generation ─────────────────────────────────────────
function makeDots(count, radius) {
  const dots = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const r = 2.5 + Math.random() * 4;
    const opacity = 0.15 + Math.random() * 0.55;
    dots.push({ angle, r, opacity });
  }
  return dots;
}

export const INNER_R = 100 * scale;
export const MID_R = 132 * scale;
export const OUTER_R = 160 * scale;

const innerDots = makeDots(24, INNER_R);
const midDots = makeDots(32, MID_R);
const outerDots = makeDots(42, OUTER_R);

const SVG_SIZE = (OUTER_R + 20) * 2;
const SVG_CENTER = SVG_SIZE / 2;

// ─── Spinning Dots + Pulse Glow ──────────────────────────────────
function LogoWithRings() {
  const spin1 = useRef(new Animated.Value(0)).current;
  const spin2 = useRef(new Animated.Value(0)).current;
  const spin3 = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Inner: clockwise, 18s
    Animated.loop(
      Animated.timing(spin1, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Middle: counter-clockwise, 25s
    Animated.loop(
      Animated.timing(spin2, {
        toValue: 1,
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Outer: clockwise, 35s
    Animated.loop(
      Animated.timing(spin3, {
        toValue: 1,
        duration: 35000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Pulse glow
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.12,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.25,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  const rot1 = spin1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot2 = spin2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const rot3 = spin3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const renderDotRing = (dots, radius, color) => (
    <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
      {dots.map((d, i) => (
        <Circle
          key={i}
          cx={SVG_CENTER + radius * Math.cos(d.angle)}
          cy={SVG_CENTER + radius * Math.sin(d.angle)}
          r={d.r}
          fill={color}
          opacity={d.opacity}
        />
      ))}
    </Svg>
  );

  return (
    <View style={styles.logoArea}>
      {/* Radial glow behind everything */}
      <View style={styles.radialGlow} />

      {/* Pulsing glow ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />

      {/* Inner ring — clockwise */}
      <Animated.View style={[styles.ringLayer, { transform: [{ rotate: rot1 }] }]}>
        {renderDotRing(innerDots, INNER_R, PURPLE_ACCENT)}
      </Animated.View>

      {/* Middle ring — counter-clockwise */}
      <Animated.View style={[styles.ringLayer, { transform: [{ rotate: rot2 }] }]}>
        {renderDotRing(midDots, MID_R, PURPLE_PRIMARY)}
      </Animated.View>

      {/* Outer ring — clockwise */}
      <Animated.View style={[styles.ringLayer, { transform: [{ rotate: rot3 }] }]}>
        {renderDotRing(outerDots, OUTER_R, PURPLE_FAINT)}
      </Animated.View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

// ─── Feature Card ────────────────────────────────────────────────
function FeatureCard({ icon: Icon, label, delay, parentAnim }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.iconCircle}>
        <Icon color={PURPLE_ACCENT} size={20} strokeWidth={2.5} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────
export default function OnboardingScreen({ navigation }) {
  // Staggered entrance animations
  const headFade = useRef(new Animated.Value(0)).current;
  const headSlide = useRef(new Animated.Value(24)).current;
  const subFade = useRef(new Animated.Value(0)).current;
  const subSlide = useRef(new Animated.Value(20)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(16)).current;
  const footFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Headline at 300ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(headFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(headSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 300);

    // Subtext at 500ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(subSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 500);

    // Button at 1100ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(btnFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(btnSlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 1100);

    // Footer at 1300ms
    setTimeout(() => {
      Animated.timing(footFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 1300);
  }, []);

  const handleExplore = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_complete', 'true');
    } catch (_) {}
    navigation.replace('MainApp');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.content}>
        {/* ── Logo + spinning rings ── */}
        <LogoWithRings />

        {/* ── Headline ── */}
        <Animated.View style={{ opacity: headFade, transform: [{ translateY: headSlide }] }}>
          <Text style={styles.heading}>
            <Text style={{ color: '#FFFFFF' }}>Every song,{'\n'}</Text>
            <Text style={{ color: PURPLE_ACCENT }}>every category</Text>
            <Text style={{ color: '#FFFFFF' }}>, one app</Text>
          </Text>
        </Animated.View>

        {/* ── Subtext ── */}
        <Animated.View style={{ opacity: subFade, transform: [{ translateY: subSlide }] }}>
          <Text style={styles.subtext}>
            Original Songs, Become Jehovah's Friend, Sing With Us, International Music. Lyrics, write-ups, and audio, all in one place.
          </Text>
        </Animated.View>

        {/* ── Feature cards (staggered entrance) ── */}
        <View style={styles.featuresColumn}>
          <FeatureCard icon={Music} label="Lyrics for every category" delay={700} />
          <FeatureCard icon={BookOpen} label="The story behind each song" delay={830} />
          <FeatureCard icon={Headphones} label="Listen online, read anytime" delay={960} />
        </View>

        {/* ── CTA Button ── */}
        <Animated.View
          style={[
            styles.ctaWrapper,
            { opacity: btnFade, transform: [{ translateY: btnSlide }] },
          ]}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleExplore}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Explore The App"
          >
            <Text style={styles.ctaText}>Explore The App</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Footer ── */}
        <Animated.View style={{ opacity: footFade }}>
          <Text style={styles.footer}>Free &amp; always will be</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 50 : 60,
    paddingBottom: Platform.OS === 'ios' ? 36 : 46,
  },

  // ── Logo area ──
  logoArea: {
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmall ? 16 : 24,
  },
  radialGlow: {
    position: 'absolute',
    width: 320 * scale,
    height: 320 * scale,
    borderRadius: 160 * scale,
    backgroundColor: 'rgba(109, 40, 217, 0.10)',
  },
  pulseRing: {
    position: 'absolute',
    width: 148 * scale,
    height: 148 * scale,
    borderRadius: 74 * scale,
    borderWidth: 1.5,
    borderColor: PURPLE_PRIMARY,
  },
  ringLayer: {
    position: 'absolute',
    width: SVG_SIZE,
    height: SVG_SIZE,
  },
  logoContainer: {
    width: 110 * scale,
    height: 110 * scale,
    borderRadius: 55 * scale,
    backgroundColor: '#150E28',
    borderWidth: 1.5,
    borderColor: 'rgba(109, 40, 217, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: PURPLE_PRIMARY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  logo: {
    width: 88 * scale,
    height: 88 * scale,
    borderRadius: 44 * scale,
  },

  // ── Typography ──
  heading: {
    fontSize: isSmall ? 26 : 30,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: isSmall ? 32 : 38,
    letterSpacing: -0.4,
    marginBottom: isSmall ? 6 : 10,
  },
  subtext: {
    fontSize: isSmall ? 13.5 : 14.5,
    fontWeight: '400',
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: isSmall ? 20 : 22,
    marginBottom: isSmall ? 18 : 24,
    paddingHorizontal: 4,
  },

  // ── Feature cards ──
  featuresColumn: {
    width: '100%',
    marginBottom: isSmall ? 4 : 8,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: isSmall ? 12 : 14,
    paddingHorizontal: isSmall ? 14 : 18,
    marginBottom: isSmall ? 8 : 10,
  },
  iconCircle: {
    width: isSmall ? 36 : 40,
    height: isSmall ? 36 : 40,
    borderRadius: isSmall ? 18 : 20,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureLabel: {
    fontSize: isSmall ? 14 : 15,
    fontWeight: '500',
    color: '#E2DFF0',
    flex: 1,
  },

  // ── CTA ──
  ctaWrapper: {
    width: '100%',
    marginTop: isSmall ? 10 : 16,
  },
  ctaButton: {
    width: '100%',
    height: isSmall ? 48 : 56,
    borderRadius: isSmall ? 24 : 28,
    backgroundColor: PURPLE_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: PURPLE_PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: isSmall ? 15 : 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Footer ──
  footer: {
    marginTop: isSmall ? 10 : 14,
    fontSize: isSmall ? 12 : 13,
    color: TEXT_MUTED,
    fontWeight: '400',
    opacity: 0.7,
  },
});
