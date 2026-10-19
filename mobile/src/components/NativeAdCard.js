import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import {
  useNativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../lib/adMob';
import { useSettings } from '../context/SettingsContext';

export default function NativeAdCard({ style, showMedia = false }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);

  const { status, nativeAd } = useNativeAd({
    adUnitId: AD_UNIT_IDS.NATIVE,
  });

  // Only render when the native ad is successfully loaded
  if (status !== 'loaded' || !nativeAd) {
    return null;
  }

  const hasMedia = showMedia && nativeAd.mediaContent?.aspectRatio;

  return (
    <View style={[styles.outerContainer, style]}>
      <NativeAdView nativeAd={nativeAd} style={styles.card}>
        {/* Top bar: Ad badge & Advertiser */}
        <View style={styles.topRow}>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>Ad</Text>
          </View>
          {nativeAd.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.advertiserText} numberOfLines={1}>
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          ) : (
            <Text style={styles.sponsoredText}>Sponsored</Text>
          )}
        </View>

        {/* Content row: Icon + Headline + Body */}
        <View style={styles.contentRow}>
          {nativeAd.icon?.url && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.adIcon} resizeMode="cover" />
            </NativeAsset>
          )}

          <View style={styles.textColumn}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline} numberOfLines={2}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>

            {nativeAd.body ? (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.bodyText} numberOfLines={2}>
                  {nativeAd.body}
                </Text>
              </NativeAsset>
            ) : null}
          </View>
        </View>

        {/* Optional Media View for rich visual ads */}
        {hasMedia ? (
          <View style={styles.mediaWrap}>
            <NativeMediaView style={styles.mediaView} />
          </View>
        ) : null}

        {/* Call to action button */}
        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
              <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
            </TouchableOpacity>
          </NativeAsset>
        ) : null}
      </NativeAdView>
    </View>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    outerContainer: {
      paddingHorizontal: 16,
      marginVertical: 12,
      width: '100%',
    },
    card: {
      backgroundColor: isDark ? '#1A1425' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167, 139, 250, 0.16)' : 'rgba(109, 40, 217, 0.1)',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    adBadge: {
      backgroundColor: isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(109, 40, 217, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167, 139, 250, 0.35)' : 'rgba(109, 40, 217, 0.25)',
    },
    adBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.purpleAccent,
      letterSpacing: 0.5,
    },
    advertiserText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      flex: 1,
    },
    sponsoredText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    adIcon: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    },
    textColumn: {
      flex: 1,
      justifyContent: 'center',
    },
    headline: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textWhite,
      marginBottom: 3,
      lineHeight: 18,
    },
    bodyText: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.textMuted,
    },
    mediaWrap: {
      width: '100%',
      height: 160,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 12,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
    },
    mediaView: {
      width: '100%',
      height: '100%',
    },
    ctaButton: {
      backgroundColor: colors.purple,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      ...Platform.select({
        ios: {
          shadowColor: colors.purple,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    ctaText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });
