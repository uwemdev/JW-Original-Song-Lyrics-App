import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, G, Line, Defs } from 'react-native-svg';
import { getWallpaperById } from '../lib/wallpapers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChatWallpaperBackground({ wallpaperId, isDark, colors, preview = false }) {
  const wallpaper = useMemo(() => getWallpaperById(wallpaperId), [wallpaperId]);

  if (!wallpaper || wallpaper.id === 'default') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.container,
          { backgroundColor: preview ? (isDark ? '#161324' : '#F8FAFC') : colors.bg },
        ]}
      />
    );
  }

  const gradientColors = isDark ? wallpaper.darkGradient : wallpaper.lightGradient;
  const strokeColor = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.8)';
  const patternOpacity = preview
    ? isDark
      ? 0.25
      : 0.18
    : isDark
    ? 0.12
    : 0.08;

  const renderPattern = () => {
    switch (wallpaper.patternType) {
      case 'melody':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: patternOpacity }]}
          >
            {/* Staff lines */}
            <Line x1="20" y1="120" x2="380" y2="120" stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" />
            <Line x1="20" y1="135" x2="380" y2="135" stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" />
            <Line x1="20" y1="150" x2="380" y2="150" stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" />
            <Line x1="20" y1="460" x2="380" y2="460" stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" />
            <Line x1="20" y1="475" x2="380" y2="475" stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" />
            <Line x1="20" y1="490" x2="380" y2="490" stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" />

            {/* Treble clef abstract motif */}
            <Path
              d="M75,170 C70,140 90,105 75,80 C65,65 50,75 50,90 C50,115 85,130 80,165 C75,190 55,200 55,220 C55,235 70,245 85,240 C95,235 90,215 75,215"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Eighth notes and musical elements */}
            <G transform="translate(160, 100)">
              <Circle cx="15" cy="40" r="9" fill={strokeColor} />
              <Line x1="24" y1="40" x2="24" y2="10" stroke={strokeColor} strokeWidth="2.5" />
              <Circle cx="55" cy="32" r="9" fill={strokeColor} />
              <Line x1="64" y1="32" x2="64" y2="2" stroke={strokeColor} strokeWidth="2.5" />
              <Path d="M24,10 L64,2" stroke={strokeColor} strokeWidth="4" />
            </G>

            <G transform="translate(280, 240)">
              <Circle cx="15" cy="35" r="8" fill={strokeColor} />
              <Line x1="23" y1="35" x2="23" y2="12" stroke={strokeColor} strokeWidth="2" />
              <Path d="M23,12 C32,15 35,24 40,28" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            </G>

            <G transform="translate(60, 430)">
              <Circle cx="15" cy="40" r="9" fill={strokeColor} />
              <Line x1="24" y1="40" x2="24" y2="10" stroke={strokeColor} strokeWidth="2.5" />
              <Circle cx="60" cy="35" r="9" fill={strokeColor} />
              <Line x1="69" y1="35" x2="69" y2="5" stroke={strokeColor} strokeWidth="2.5" />
              <Path d="M24,10 L69,5" stroke={strokeColor} strokeWidth="4" />
            </G>

            <G transform="translate(260, 520)">
              <Circle cx="20" cy="45" r="9" fill={strokeColor} />
              <Line x1="29" y1="45" x2="29" y2="15" stroke={strokeColor} strokeWidth="2" />
              <Path d="M29,15 C40,18 45,28 50,32" stroke={strokeColor} strokeWidth="2.5" fill="none" />
            </G>

            <G transform="translate(130, 640)">
              <Circle cx="12" cy="30" r="8" fill={strokeColor} />
              <Line x1="20" y1="30" x2="20" y2="8" stroke={strokeColor} strokeWidth="2" />
            </G>
          </Svg>
        );

      case 'stardust':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.16 : 0.09 }]}
          >
            {/* 4-point twinkling stars */}
            <Path d="M80,90 Q90,90 90,80 Q90,90 100,90 Q90,90 90,100 Q90,90 80,90 Z" fill={strokeColor} />
            <Path d="M310,140 Q320,140 320,130 Q320,140 330,140 Q320,140 320,150 Q320,140 310,140 Z" fill={strokeColor} />
            <Path d="M180,260 Q190,260 190,250 Q190,260 200,260 Q190,260 190,270 Q190,260 180,260 Z" fill={strokeColor} />
            <Path d="M60,420 Q70,420 70,410 Q70,420 80,420 Q70,420 70,430 Q70,420 60,420 Z" fill={strokeColor} />
            <Path d="M330,500 Q340,500 340,490 Q340,500 350,500 Q340,500 340,510 Q340,500 330,500 Z" fill={strokeColor} />
            <Path d="M140,680 Q150,680 150,670 Q150,680 160,680 Q150,680 150,690 Q150,680 140,680 Z" fill={strokeColor} />

            {/* Constellation dots */}
            <Circle cx="50" cy="180" r="2.5" fill={strokeColor} />
            <Circle cx="120" cy="210" r="2" fill={strokeColor} />
            <Circle cx="160" cy="170" r="3" fill={strokeColor} />
            <Line x1="50" y1="180" x2="120" y2="210" stroke={strokeColor} strokeWidth="0.8" strokeDasharray="3,3" />
            <Line x1="120" y1="210" x2="160" y2="170" stroke={strokeColor} strokeWidth="0.8" strokeDasharray="3,3" />

            <Circle cx="240" cy="380" r="2.5" fill={strokeColor} />
            <Circle cx="290" cy="410" r="2" fill={strokeColor} />
            <Circle cx="350" cy="370" r="3" fill={strokeColor} />
            <Line x1="240" y1="380" x2="290" y2="410" stroke={strokeColor} strokeWidth="0.8" strokeDasharray="3,3" />
            <Line x1="290" y1="410" x2="350" y2="370" stroke={strokeColor} strokeWidth="0.8" strokeDasharray="3,3" />

            {/* Ambient small stardust */}
            <Circle cx="220" cy="80" r="1.5" fill={strokeColor} />
            <Circle cx="350" cy="220" r="1.5" fill={strokeColor} />
            <Circle cx="290" cy="290" r="1.5" fill={strokeColor} />
            <Circle cx="110" cy="350" r="1.5" fill={strokeColor} />
            <Circle cx="40" cy="530" r="1.5" fill={strokeColor} />
            <Circle cx="220" cy="590" r="1.5" fill={strokeColor} />
            <Circle cx="300" cy="650" r="1.5" fill={strokeColor} />
            <Circle cx="70" cy="740" r="1.5" fill={strokeColor} />
            <Circle cx="280" cy="760" r="1.5" fill={strokeColor} />
          </Svg>
        );

      case 'acoustic':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.12 : 0.07 }]}
          >
            <Path
              d="M-50,150 C80,80 180,220 320,150 C380,120 420,180 480,150"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
            />
            <Path
              d="M-50,170 C80,100 180,240 320,170 C380,140 420,200 480,170"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.2"
              strokeDasharray="6,4"
            />
            <Path
              d="M-50,380 C100,300 200,450 350,380 C410,350 450,420 500,380"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            <Path
              d="M-50,405 C100,325 200,475 350,405 C410,375 450,445 500,405"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.2"
              strokeDasharray="4,4"
            />
            <Path
              d="M-50,620 C90,560 190,690 330,620 C390,590 430,650 490,620"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </Svg>
        );

      case 'botanical':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.11 : 0.07 }]}
          >
            {/* Olive branch motif left */}
            <G transform="translate(20, 120)">
              <Path d="M10,120 Q50,60 110,10" fill="none" stroke={strokeColor} strokeWidth="2" />
              <Path d="M40,90 Q55,75 50,60 Q35,75 40,90 Z" fill={strokeColor} />
              <Path d="M60,65 Q80,60 85,45 Q70,45 60,65 Z" fill={strokeColor} />
              <Path d="M85,40 Q105,35 110,20 Q95,20 85,40 Z" fill={strokeColor} />
            </G>

            {/* Olive branch motif right */}
            <G transform="translate(240, 360)">
              <Path d="M110,120 Q70,60 10,10" fill="none" stroke={strokeColor} strokeWidth="2" />
              <Path d="M80,90 Q65,75 70,60 Q85,75 80,90 Z" fill={strokeColor} />
              <Path d="M60,65 Q40,60 35,45 Q50,45 60,65 Z" fill={strokeColor} />
              <Path d="M35,40 Q15,35 10,20 Q25,20 35,40 Z" fill={strokeColor} />
            </G>

            {/* Olive branch motif bottom left */}
            <G transform="translate(30, 580)">
              <Path d="M10,110 Q60,50 120,10" fill="none" stroke={strokeColor} strokeWidth="2" />
              <Path d="M45,85 Q60,70 55,55 Q40,70 45,85 Z" fill={strokeColor} />
              <Path d="M70,60 Q90,55 95,40 Q80,40 70,60 Z" fill={strokeColor} />
            </G>
          </Svg>
        );

      case 'geometric':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.10 : 0.06 }]}
          >
            {/* Repeating diamond grid */}
            {[0, 100, 200, 300, 400].map((x) =>
              [0, 100, 200, 300, 400, 500, 600, 700].map((y) => (
                <Path
                  key={`dia-${x}-${y}`}
                  d={`M${x},${y - 40} L${x + 40},${y} L${x},${y + 40} L${x - 40},${y} Z`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.2"
                />
              ))
            )}
          </Svg>
        );

      case 'grid':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.14 : 0.08 }]}
          >
            {[40, 100, 160, 220, 280, 340].map((x) =>
              [60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720].map((y) => (
                <Circle key={`pt-${x}-${y}`} cx={x} cy={y} r="1.8" fill={strokeColor} />
              ))
            )}
          </Svg>
        );

      case 'spheres':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.12 : 0.07 }]}
          >
            {/* Top right concentric spheres */}
            <Circle cx="350" cy="140" r="50" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            <Circle cx="350" cy="140" r="100" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="6,4" />
            <Circle cx="350" cy="140" r="160" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="3,3" />

            {/* Bottom left concentric spheres */}
            <Circle cx="60" cy="620" r="60" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            <Circle cx="60" cy="620" r="120" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="6,4" />
            <Circle cx="60" cy="620" r="190" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="3,3" />
          </Svg>
        );

      case 'mountains':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.14 : 0.08 }]}
          >
            {/* Subtle distant mountain silhouettes */}
            <Path
              d="M-40,460 L50,390 L130,440 L210,360 L310,430 L400,370 L460,460 Z"
              fill={strokeColor}
              fillOpacity={0.4}
            />
            <Path
              d="M-40,540 L80,450 L180,510 L280,420 L370,490 L450,440 L460,540 Z"
              fill={strokeColor}
              fillOpacity={0.6}
            />
          </Svg>
        );

      case 'vinyl':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.11 : 0.07 }]}
          >
            {/* Vinyl record groove circles */}
            {[40, 80, 120, 160, 200, 240, 280].map((r) => (
              <Circle
                key={`groove-${r}`}
                cx="200"
                cy="400"
                r={r}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.2"
                strokeDasharray="8,6"
              />
            ))}
          </Svg>
        );

      case 'scroll':
        return (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.11 : 0.07 }]}
          >
            {/* Greek key / parchment border motifs */}
            <Rect x="20" y="40" width="360" height="720" rx="16" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="8,6" />
            <Path d="M35,60 L55,60 L55,80 L75,80" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            <Path d="M365,60 L345,60 L345,80 L325,80" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            <Path d="M35,740 L55,740 L55,720 L75,720" fill="none" stroke={strokeColor} strokeWidth="1.8" />
            <Path d="M365,740 L345,740 L345,720 L325,720" fill="none" stroke={strokeColor} strokeWidth="1.8" />
          </Svg>
        );

      default:
        return null;
    }
  };

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {renderPattern()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
