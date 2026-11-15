import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getWallpaperById } from '../lib/wallpapers';

const PALM_CANOPIES = [
  { left: '-25%', bottom: '38%', transform: [{ rotate: '-18deg' }] },
  { left: '3%', bottom: '38%', transform: [{ rotate: '20deg' }] },
  { right: '-26%', bottom: '32%', transform: [{ rotate: '18deg' }] },
  { right: '2%', bottom: '32%', transform: [{ rotate: '-20deg' }] },
];
const FOREST_CANOPIES = [
  { left: '-20%', bottom: '12%' },
  { left: '6%', bottom: '18%' },
  { left: '32%', bottom: '10%' },
  { right: '-20%', bottom: '17%' },
];

function Scenery({ type, isDark }) {
  const silhouette = isDark ? '#071A30' : '#38526B';
  const glow = isDark ? '#FFFFFF' : '#FFF8E8';

  if (type === 'dunes' || type === 'ocean') {
    return (
      <>
        <View style={[styles.duneBack, { backgroundColor: silhouette, opacity: type === 'ocean' ? 0.18 : 0.25 }]} />
        <View style={[styles.duneFront, { backgroundColor: silhouette, opacity: type === 'ocean' ? 0.24 : 0.4 }]} />
      </>
    );
  }

  if (type === 'mountains') {
    return (
      <>
        <View style={[styles.mountainBack, { backgroundColor: silhouette, opacity: 0.24 }]} />
        <View style={[styles.mountainFront, { backgroundColor: silhouette, opacity: 0.42 }]} />
      </>
    );
  }

  if (type === 'aurora') {
    return (
      <>
        <View style={[styles.auroraBand, styles.auroraBack, { backgroundColor: glow }]} />
        <View style={[styles.auroraBand, styles.auroraFront, { backgroundColor: glow }]} />
      </>
    );
  }

  if (type === 'sunset') {
    return (
      <>
        <View style={[styles.sunGlow, { backgroundColor: glow }]} />
        <View style={[styles.sun, { backgroundColor: glow }]} />
        <View style={[styles.horizon, { backgroundColor: silhouette }]} />
      </>
    );
  }

  if (type === 'palms' || type === 'forest') {
    return (
      <>
        <View style={[styles.canopyGround, { backgroundColor: silhouette }]} />
        {(type === 'palms' ? PALM_CANOPIES : FOREST_CANOPIES).map((position, index) => (
          <View key={index} style={[styles.canopy, position, { backgroundColor: silhouette }]} />
        ))}
        {type === 'palms' && (
          <>
            <View style={[styles.palmTrunk, styles.trunkLeft, { backgroundColor: silhouette }]} />
            <View style={[styles.palmTrunk, styles.trunkRight, { backgroundColor: silhouette }]} />
          </>
        )}
      </>
    );
  }

  return <View style={[styles.minimalGlow, { backgroundColor: glow }]} />;
}

export default function ChatWallpaperBackground({ wallpaperId, isDark }) {
  const wallpaper = getWallpaperById(wallpaperId);

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={isDark ? wallpaper.darkGradient : wallpaper.lightGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: wallpaper.previewColors[0], opacity: 0.17 }]} />
      <Scenery type={wallpaper.landscapeType} isDark={isDark} />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: isDark ? 'rgba(15, 10, 26, 0.35)' : 'rgba(255, 255, 255, 0.12)' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  duneBack: {
    position: 'absolute', left: '-30%', bottom: '-4%', width: '150%', height: '38%',
    borderTopLeftRadius: 300, borderTopRightRadius: 300, transform: [{ rotate: '-9deg' }],
  },
  duneFront: {
    position: 'absolute', left: '-25%', bottom: '-13%', width: '150%', height: '38%',
    borderTopLeftRadius: 300, borderTopRightRadius: 300, transform: [{ rotate: '8deg' }],
  },
  mountainBack: {
    position: 'absolute', left: '-28%', bottom: '-24%', width: '100%', height: '60%',
    borderRadius: 28, transform: [{ rotate: '45deg' }],
  },
  mountainFront: {
    position: 'absolute', right: '-35%', bottom: '-28%', width: '110%', height: '60%',
    borderRadius: 28, transform: [{ rotate: '-45deg' }],
  },
  auroraBand: {
    position: 'absolute', left: '-25%', width: '150%', height: '13%',
    borderRadius: 100, transform: [{ rotate: '-12deg' }],
  },
  auroraBack: { top: '18%', opacity: 0.17 },
  auroraFront: { top: '31%', opacity: 0.1 },
  sunGlow: {
    position: 'absolute', width: '80%', height: '40%', left: '10%', bottom: '14%',
    borderRadius: 300, opacity: 0.13,
  },
  sun: {
    position: 'absolute', width: '48%', height: '24%', left: '26%', bottom: '18%',
    borderRadius: 300, opacity: 0.35,
  },
  horizon: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '25%', opacity: 0.32,
  },
  canopyGround: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '18%', opacity: 0.4,
  },
  canopy: {
    position: 'absolute', width: '55%', height: '24%', borderRadius: 200, opacity: 0.36,
  },
  palmTrunk: {
    position: 'absolute', width: '5%', height: '45%', bottom: '8%', opacity: 0.4, borderRadius: 20,
  },
  trunkLeft: { left: '15%', transform: [{ rotate: '8deg' }] },
  trunkRight: { right: '15%', transform: [{ rotate: '-8deg' }] },
  minimalGlow: {
    position: 'absolute', width: '100%', height: '30%', top: '10%', left: '30%',
    borderRadius: 300, opacity: 0.08,
  },
});
