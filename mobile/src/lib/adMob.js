import mobileAds, { TestIds, BannerAdSize } from 'react-native-google-mobile-ads';

// ─── Ad Unit Configuration ──────────────────────────────────────────────
// In development (__DEV__), TestIds are automatically used to protect your AdMob account.
// When you create ad units in Google AdMob, replace the production strings below.
export const AD_UNIT_IDS = {
  // Banner Ad Unit ID (ca-app-pub-5615986237010538/4152881814)
  BANNER: __DEV__ ? TestIds.BANNER : 'ca-app-pub-5615986237010538/4152881814',

  // Native Ad Unit ID (ca-app-pub-5615986237010538/7485622165)
  NATIVE: __DEV__ ? TestIds.NATIVE : 'ca-app-pub-5615986237010538/7485622165',

  // Interstitial Fullscreen Ad Unit ID (ca-app-pub-5615986237010538/xxxxxxxxxx)
  INTERSTITIAL: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-5615986237010538/YOUR_INTERSTITIAL_AD_UNIT_ID',
};

export { BannerAdSize, TestIds };

/**
 * Initialize Google Mobile Ads SDK on app launch
 */
export async function initMobileAds() {
  try {
    const adapterStatuses = await mobileAds().initialize();
    return adapterStatuses;
  } catch (err) {
    console.warn('[AdMob] Initialization warning:', err?.message || err);
    return null;
  }
}
