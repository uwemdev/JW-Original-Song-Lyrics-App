import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, G, Line, Rect } from 'react-native-svg';
import { getWallpaperById } from '../lib/wallpapers';

export default function ChatWallpaperBackground({ wallpaperId, isDark, colors, preview = false }) {
  const wallpaper = useMemo(() => getWallpaperById(wallpaperId), [wallpaperId]);
  const defaultBg = colors?.bg || (isDark ? '#0F0A1A' : '#FFFFFF');

  if (!wallpaper || wallpaper.id === 'pitch_black') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.container,
          { backgroundColor: isDark ? '#000000' : '#F8FAFC' },
        ]}
      />
    );
  }

  const gradientColors = isDark ? wallpaper.darkGradient : wallpaper.lightGradient;
  const safeColors =
    Array.isArray(gradientColors) && gradientColors.length >= 2
      ? gradientColors
      : [defaultBg, defaultBg];

  const strokeColor = isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.90)';
  const patternOpacity = preview
    ? isDark
      ? 0.35
      : 0.28
    : isDark
    ? 0.22
    : 0.16;

  const renderPattern = () => {
    switch (wallpaper.patternType) {
      case 'celestial':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Stars & Crescent Moon */}
            <Circle cx="80" cy="110" r="3" fill={strokeColor} />
            <Circle cx="160" cy="70" r="2" fill={strokeColor} />
            <Circle cx="320" cy="130" r="3.5" fill={strokeColor} />
            <Circle cx="260" cy="200" r="2" fill={strokeColor} />
            <Circle cx="60" cy="280" r="2.5" fill={strokeColor} />

            {/* Crescent moon top left */}
            <Path
              d="M100,160 A24,24 0 1,0 128,204 A19,19 0 1,1 100,160 Z"
              fill={strokeColor}
            />

            {/* Constellation lines */}
            <Line x1="160" y1="70" x2="210" y2="105" stroke={strokeColor} strokeWidth="1" strokeDasharray="3 3" />
            <Line x1="210" y1="105" x2="260" y2="90" stroke={strokeColor} strokeWidth="1" strokeDasharray="3 3" />
            <Circle cx="210" cy="105" r="2.5" fill={strokeColor} />
            <Circle cx="260" cy="90" r="3" fill={strokeColor} />

            {/* Midfield celestial elements */}
            <Circle cx="340" cy="380" r="3" fill={strokeColor} />
            <Circle cx="120" cy="460" r="2" fill={strokeColor} />
            <Circle cx="280" cy="510" r="3.5" fill={strokeColor} />
            <Circle cx="70" cy="620" r="2.5" fill={strokeColor} />
            <Circle cx="220" cy="680" r="3" fill={strokeColor} />
            <Circle cx="330" cy="730" r="2" fill={strokeColor} />

            {/* Starburst crosses */}
            <Path d="M220,340 L220,360 M210,350 L230,350" stroke={strokeColor} strokeWidth="1.5" />
            <Path d="M140,580 L140,600 M130,590 L150,590" stroke={strokeColor} strokeWidth="1.5" />
          </Svg>
        );

      case 'waves':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            <Path d="M-20,120 Q80,80 180,120 T380,120 T580,120" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M-20,150 Q90,190 200,150 T400,150" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeDasharray="5 4" />
            <Path d="M-20,280 Q100,240 200,280 T400,280" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M-20,420 Q90,380 200,420 T400,420" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M-20,450 Q100,490 210,450 T420,450" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeDasharray="5 4" />
            <Path d="M-20,580 Q100,540 200,580 T400,580" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M-20,710 Q100,670 200,710 T400,710" stroke={strokeColor} strokeWidth="2.5" fill="none" />
          </Svg>
        );

      case 'aurora':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            <Path d="M-30,100 C80,40 200,180 430,110" stroke={strokeColor} strokeWidth="3.5" fill="none" />
            <Path d="M-30,140 C90,80 220,220 430,150" stroke={strokeColor} strokeWidth="2" fill="none" strokeDasharray="6 4" />
            <Path d="M-30,300 C90,230 220,380 430,310" stroke={strokeColor} strokeWidth="3" fill="none" />
            <Path d="M-30,480 C70,410 200,560 430,490" stroke={strokeColor} strokeWidth="3" fill="none" />
            <Path d="M-30,520 C90,450 220,600 430,530" stroke={strokeColor} strokeWidth="1.8" fill="none" strokeDasharray="6 4" />
            <Path d="M-30,680 C80,610 210,750 430,690" stroke={strokeColor} strokeWidth="2.8" fill="none" />
          </Svg>
        );

      case 'melody':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Staff lines */}
            <Line x1="20" y1="120" x2="380" y2="120" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
            <Line x1="20" y1="135" x2="380" y2="135" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
            <Line x1="20" y1="150" x2="380" y2="150" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />

            {/* Treble clef abstract */}
            <Path
              d="M75,170 C70,140 90,105 75,80 C65,65 50,75 50,90 C50,115 85,130 80,165 C75,190 55,200 55,220 C55,235 70,245 85,240 C95,235 90,215 75,215"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Eighth notes */}
            <G transform="translate(180, 95)">
              <Circle cx="15" cy="40" r="8" fill={strokeColor} />
              <Line x1="23" y1="40" x2="23" y2="10" stroke={strokeColor} strokeWidth="2.5" />
              <Circle cx="50" cy="32" r="8" fill={strokeColor} />
              <Line x1="58" y1="32" x2="58" y2="2" stroke={strokeColor} strokeWidth="2.5" />
              <Path d="M23,10 L58,2" stroke={strokeColor} strokeWidth="3.5" />
            </G>

            {/* Lower staff lines & notes */}
            <Line x1="20" y1="460" x2="380" y2="460" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
            <Line x1="20" y1="475" x2="380" y2="475" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
            <Line x1="20" y1="490" x2="380" y2="490" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />

            <G transform="translate(110, 440)">
              <Circle cx="15" cy="35" r="7.5" fill={strokeColor} />
              <Line x1="22.5" y1="35" x2="22.5" y2="12" stroke={strokeColor} strokeWidth="2" />
              <Path d="M22.5,12 C30,15 32,22 36,26" stroke={strokeColor} strokeWidth="2.2" fill="none" />
            </G>
            <G transform="translate(270, 520)">
              <Circle cx="18" cy="40" r="8" fill={strokeColor} />
              <Line x1="26" y1="40" x2="26" y2="15" stroke={strokeColor} strokeWidth="2" />
              <Path d="M26,15 C34,18 36,25 40,28" stroke={strokeColor} strokeWidth="2.2" fill="none" />
            </G>
          </Svg>
        );

      case 'palms':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Tropical palm fronds & breeze curves */}
            <Path d="M30,220 C80,160 160,180 220,130" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M60,190 C80,165 95,145 105,120" stroke={strokeColor} strokeWidth="2" fill="none" />
            <Path d="M90,180 C115,160 130,135 140,110" stroke={strokeColor} strokeWidth="2" fill="none" />
            <Path d="M125,175 C150,155 165,130 175,105" stroke={strokeColor} strokeWidth="2" fill="none" />
            <Path d="M165,165 C190,145 205,120 215,95" stroke={strokeColor} strokeWidth="2" fill="none" />

            {/* Lower tropical palm silhouette */}
            <Path d="M370,540 C310,480 230,500 170,450" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M340,510 C320,485 305,465 295,440" stroke={strokeColor} strokeWidth="2" fill="none" />
            <Path d="M310,500 C285,480 270,455 260,430" stroke={strokeColor} strokeWidth="2" fill="none" />
            <Path d="M275,495 C250,475 235,450 225,425" stroke={strokeColor} strokeWidth="2" fill="none" />
          </Svg>
        );

      case 'dunes':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            <Path d="M-20,180 Q120,120 250,180 T430,160" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M-20,290 Q150,220 280,300 T430,270" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M-20,420 Q110,360 240,430 T430,410" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M-20,560 Q160,490 300,570 T430,540" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M-20,690 Q120,630 260,700 T430,680" stroke={strokeColor} strokeWidth="2.5" fill="none" />
          </Svg>
        );

      case 'mountains':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            <Path
              d="M-40,450 L50,370 L140,430 L220,340 L320,420 L400,360 L450,450 Z"
              stroke={strokeColor}
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M-40,560 L80,460 L180,530 L280,440 L370,510 L450,450 L460,560 Z"
              stroke={strokeColor}
              strokeWidth="2.5"
              fill="none"
            />
          </Svg>
        );

      case 'botanical':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Olive branch stem & leaves */}
            <Path d="M70,180 Q120,120 180,90" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M100,160 Q125,145 130,130 Q115,135 100,160" fill={strokeColor} />
            <Path d="M125,140 Q150,125 155,110 Q140,115 125,140" fill={strokeColor} />
            <Path d="M150,115 Q175,100 180,85 Q165,90 150,115" fill={strokeColor} />

            {/* Lower branch */}
            <Path d="M330,560 Q270,500 200,470" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            <Path d="M300,540 Q275,525 270,510 Q285,515 300,540" fill={strokeColor} />
            <Path d="M270,515 Q245,500 240,485 Q255,490 270,515" fill={strokeColor} />
            <Path d="M235,490 Q210,475 205,460 Q220,465 235,490" fill={strokeColor} />
          </Svg>
        );

      case 'sunbeams':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Sun orb */}
            <Circle cx="200" cy="180" r="36" fill="none" stroke={strokeColor} strokeWidth="2.5" />
            <Circle cx="200" cy="180" r="50" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="5 5" />
            {/* Radiating sunbeams */}
            <Line x1="200" y1="110" x2="200" y2="85" stroke={strokeColor} strokeWidth="2" />
            <Line x1="200" y1="250" x2="200" y2="275" stroke={strokeColor} strokeWidth="2" />
            <Line x1="130" y1="180" x2="105" y2="180" stroke={strokeColor} strokeWidth="2" />
            <Line x1="270" y1="180" x2="295" y2="180" stroke={strokeColor} strokeWidth="2" />
            {/* Birds in flight */}
            <Path d="M110,380 Q120,370 130,380 Q140,370 150,380" stroke={strokeColor} strokeWidth="2" fill="none" />
            <Path d="M260,420 Q270,410 280,420 Q290,410 300,420" stroke={strokeColor} strokeWidth="2" fill="none" />
          </Svg>
        );

      case 'stardust':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Concentric spiral orbital rings */}
            <Circle cx="200" cy="220" r="45" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            <Circle cx="200" cy="220" r="85" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="6 4" />
            <Circle cx="200" cy="220" r="130" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />

            <Circle cx="120" cy="540" r="40" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            <Circle cx="120" cy="540" r="75" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="6 4" />

            <Circle cx="80" cy="380" r="2.5" fill={strokeColor} />
            <Circle cx="320" cy="450" r="3" fill={strokeColor} />
            <Circle cx="260" cy="620" r="2.5" fill={strokeColor} />
          </Svg>
        );

      case 'roses':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Rose petal spirals */}
            <G transform="translate(160, 160)">
              <Circle cx="40" cy="40" r="30" fill="none" stroke={strokeColor} strokeWidth="2" />
              <Path d="M40,25 C52,25 55,45 40,45 C28,45 32,32 40,32" stroke={strokeColor} strokeWidth="2" fill="none" />
            </G>
            <G transform="translate(60, 480)">
              <Circle cx="35" cy="35" r="25" fill="none" stroke={strokeColor} strokeWidth="2" />
              <Path d="M35,22 C45,22 47,38 35,38 C25,38 28,27 35,27" stroke={strokeColor} strokeWidth="2" fill="none" />
            </G>
            <G transform="translate(260, 560)">
              <Circle cx="35" cy="35" r="25" fill="none" stroke={strokeColor} strokeWidth="2" />
              <Path d="M35,22 C45,22 47,38 35,38 C25,38 28,27 35,27" stroke={strokeColor} strokeWidth="2" fill="none" />
            </G>
          </Svg>
        );

      case 'ripples':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Concentric water ripple circles */}
            <Circle cx="180" cy="180" r="20" fill="none" stroke={strokeColor} strokeWidth="2" />
            <Circle cx="180" cy="180" r="45" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            <Circle cx="180" cy="180" r="75" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="5 4" />
            <Circle cx="180" cy="180" r="110" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="3 3" />

            <Circle cx="260" cy="520" r="25" fill="none" stroke={strokeColor} strokeWidth="2" />
            <Circle cx="260" cy="520" r="55" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            <Circle cx="260" cy="520" r="90" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="5 4" />
          </Svg>
        );

      case 'blossom':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Cherry blossom flower petals */}
            <G transform="translate(180, 160)">
              <Circle cx="20" cy="20" r="6" fill={strokeColor} />
              <Circle cx="20" cy="6" r="7" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="33" cy="16" r="7" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="28" cy="31" r="7" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="12" cy="31" r="7" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="7" cy="16" r="7" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            </G>
            <G transform="translate(80, 460)">
              <Circle cx="20" cy="20" r="5" fill={strokeColor} />
              <Circle cx="20" cy="8" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="31" cy="17" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="27" cy="29" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="13" cy="29" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="9" cy="17" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            </G>
            <G transform="translate(280, 540)">
              <Circle cx="20" cy="20" r="5" fill={strokeColor} />
              <Circle cx="20" cy="8" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="31" cy="17" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="27" cy="29" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="13" cy="29" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
              <Circle cx="9" cy="17" r="6" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            </G>
          </Svg>
        );

      case 'lavender':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Lavender flower stems */}
            <Path d="M120,260 L120,100" stroke={strokeColor} strokeWidth="2" />
            <Circle cx="114" cy="110" r="4" fill={strokeColor} />
            <Circle cx="126" cy="110" r="4" fill={strokeColor} />
            <Circle cx="114" cy="125" r="4.5" fill={strokeColor} />
            <Circle cx="126" cy="125" r="4.5" fill={strokeColor} />
            <Circle cx="114" cy="140" r="4.5" fill={strokeColor} />
            <Circle cx="126" cy="140" r="4.5" fill={strokeColor} />

            <Path d="M280,620 L280,460" stroke={strokeColor} strokeWidth="2" />
            <Circle cx="274" cy="470" r="4" fill={strokeColor} />
            <Circle cx="286" cy="470" r="4" fill={strokeColor} />
            <Circle cx="274" cy="485" r="4.5" fill={strokeColor} />
            <Circle cx="286" cy="485" r="4.5" fill={strokeColor} />
            <Circle cx="274" cy="500" r="4.5" fill={strokeColor} />
            <Circle cx="286" cy="500" r="4.5" fill={strokeColor} />
          </Svg>
        );

      case 'geometric':
        return (
          <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style={styles.svgOverlay}>
            {/* Diamond lattice */}
            <Path d="M0,100 L200,0 L400,100 L200,200 Z" stroke={strokeColor} strokeWidth="1.5" fill="none" />
            <Path d="M0,300 L200,200 L400,300 L200,400 Z" stroke={strokeColor} strokeWidth="1.5" fill="none" />
            <Path d="M0,500 L200,400 L400,500 L200,600 Z" stroke={strokeColor} strokeWidth="1.5" fill="none" />
            <Path d="M0,700 L200,600 L400,700 L200,800 Z" stroke={strokeColor} strokeWidth="1.5" fill="none" />
            <Circle cx="200" cy="200" r="4" fill={strokeColor} />
            <Circle cx="200" cy="400" r="4" fill={strokeColor} />
            <Circle cx="200" cy="600" r="4" fill={strokeColor} />
          </Svg>
        );

      default:
        return null;
    }
  };

  const renderPatternSafe = () => {
    try {
      return renderPattern();
    } catch (_) {
      return null;
    }
  };

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* 1. Hardware-accelerated vibrant background gradient */}
      <LinearGradient
        colors={safeColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.35, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Visual WhatsApp-style doodle pattern */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { opacity: patternOpacity }]}
      >
        {renderPatternSafe()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  svgOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
