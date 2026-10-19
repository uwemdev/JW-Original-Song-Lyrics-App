import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../lib/adMob';
import { useSettings } from '../context/SettingsContext';

export default function AdBanner({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER, style }) {
  const { colors, isDark } = useSettings();
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // If loading failed (e.g. offline, ad blocker, or account pending review), hide container cleanly
  if (loadFailed) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.bg : '#F1F5F9',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        },
        !isLoaded && styles.hidden,
        style,
      ]}
    >
      <BannerAd
        unitId={AD_UNIT_IDS.BANNER}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          setIsLoaded(true);
          setLoadFailed(false);
        }}
        onAdFailedToLoad={(error) => {
          // Log only in dev mode to avoid log spam in release
          if (__DEV__) {
            console.log('[AdMob Banner] Ad failed to load:', error?.message || error);
          }
          setLoadFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 4,
    borderTopWidth: 1,
  },
  hidden: {
    height: 0,
    paddingVertical: 0,
    borderTopWidth: 0,
    overflow: 'hidden',
  },
});
