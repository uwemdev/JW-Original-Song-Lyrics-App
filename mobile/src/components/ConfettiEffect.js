import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#A855F7', // Violet
];

const NUM_PIECES = 40;

function ConfettiPiece({ index, active }) {
  const animY = useRef(new Animated.Value(-40)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const animRotate = useRef(new Animated.Value(0)).current;

  // Random parameters per piece
  const startX = useRef(Math.random() * SCREEN_W).current;
  const drift = useRef((Math.random() - 0.5) * 120).current;
  const sizeW = useRef(8 + Math.random() * 8).current;
  const sizeH = useRef(10 + Math.random() * 12).current;
  const color = useRef(CONFETTI_COLORS[index % CONFETTI_COLORS.length]).current;
  const isCircle = useRef(Math.random() > 0.6).current;
  const duration = useRef(2000 + Math.random() * 1200).current;
  const delay = useRef(Math.random() * 400).current;

  useEffect(() => {
    if (!active) return;

    animY.setValue(-40);
    animX.setValue(0);
    animRotate.setValue(0);

    const fall = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(animY, {
          toValue: SCREEN_H + 50,
          duration: duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(animX, {
          toValue: drift,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animRotate, {
          toValue: (Math.random() > 0.5 ? 1 : -1) * 360 * (2 + Math.random() * 3),
          duration: duration,
          useNativeDriver: true,
        }),
      ]),
    ]);

    fall.start();
  }, [active]);

  const rotateStr = animRotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          left: startX,
          width: sizeW,
          height: sizeH,
          borderRadius: isCircle ? sizeW / 2 : 2,
          backgroundColor: color,
          transform: [
            { translateY: animY },
            { translateX: animX },
            { rotate: rotateStr },
          ],
        },
      ]}
    />
  );
}

export default function ConfettiEffect({ active = false }) {
  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {Array.from({ length: NUM_PIECES }).map((_, i) => (
        <ConfettiPiece key={i} index={i} active={active} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    elevation: 99,
    zIndex: 999,
  },
});

