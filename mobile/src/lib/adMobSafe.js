import React from 'react';
import { TurboModuleRegistry, NativeModules, View } from 'react-native';

// Check safely without throwing an Invariant Violation error
const hasNativeAdMob = Boolean(
  (TurboModuleRegistry && typeof TurboModuleRegistry.get === 'function' && TurboModuleRegistry.get('RNGoogleMobileAdsModule')) ||
  (NativeModules && NativeModules.RNGoogleMobileAdsModule)
);

let RNGoogleMobileAds = null;
if (hasNativeAdMob) {
  try {
    RNGoogleMobileAds = require('react-native-google-mobile-ads');
  } catch (e) {
    RNGoogleMobileAds = null;
  }
}

export const isAdMobAvailable = Boolean(RNGoogleMobileAds);

export const BannerAdSize = RNGoogleMobileAds?.BannerAdSize || {
  BANNER: 'BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  FULL_BANNER: 'FULL_BANNER',
  LEADERBOARD: 'LEADERBOARD',
  ADAPTIVE_BANNER: 'ADAPTIVE_BANNER',
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  INLINE_ADAPTIVE_BANNER: 'INLINE_ADAPTIVE_BANNER',
  WIDE_SKYSCRAPER: 'WIDE_SKYSCRAPER',
};

export const TestIds = RNGoogleMobileAds?.TestIds || {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  NATIVE: 'ca-app-pub-3940256099942544/2247696110',
};

export const BannerAd = RNGoogleMobileAds?.BannerAd || (() => null);

export const useNativeAd =
  RNGoogleMobileAds?.useNativeAd ||
  (() => ({
    status: 'idle',
    nativeAd: null,
  }));

export const NativeAdView =
  RNGoogleMobileAds?.NativeAdView ||
  (({ children, ...props }) => <View {...props}>{children}</View>);

export const NativeAsset =
  RNGoogleMobileAds?.NativeAsset ||
  (({ children, ...props }) => <View {...props}>{children}</View>);

export const NativeAssetType = RNGoogleMobileAds?.NativeAssetType || {
  HEADLINE: 'headline',
  BODY: 'body',
  CALL_TO_ACTION: 'callToAction',
  ICON: 'icon',
  IMAGE: 'image',
  STAR_RATING: 'starRating',
  ADVERTISER: 'advertiser',
  STORE: 'store',
  PRICE: 'price',
};

export const NativeMediaView =
  RNGoogleMobileAds?.NativeMediaView || (() => null);

export const mobileAds =
  RNGoogleMobileAds?.default ||
  (() => ({
    initialize: async () => ({}),
    setRequestConfiguration: async () => ({}),
  }));

export default mobileAds;
