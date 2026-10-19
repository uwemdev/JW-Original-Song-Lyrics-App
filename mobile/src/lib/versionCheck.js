import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import appJson from '../../app.json';

export const CURRENT_APP_VERSION = appJson?.expo?.version || '1.0.2';
export const PLAY_STORE_PACKAGE = appJson?.expo?.android?.package || 'com.jworiginalsongslyrics.app';
export const PLAY_STORE_MARKET_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;
export const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

const DISMISSED_UPDATE_KEY = '@dismissed_update_version';

/**
 * Compare two semver strings: '1.0.2' vs '1.0.3'
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const clean1 = String(v1).replace(/^v/i, '').trim();
  const clean2 = String(v2).replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Fetch the latest version configuration from Supabase
 */
export async function fetchVersionConfig() {
  try {
    const { data, error } = await supabase
      .from('app_version_config')
      .select('*')
      .eq('platform', Platform.OS === 'ios' ? 'ios' : 'android')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[VersionCheck] Error fetching version config:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[VersionCheck] Unexpected error:', err);
    return null;
  }
}

/**
 * Check if the user has dismissed this specific version update
 */
export async function isUpdateDismissed(version) {
  try {
    const dismissed = await AsyncStorage.getItem(DISMISSED_UPDATE_KEY);
    return dismissed === version;
  } catch {
    return false;
  }
}

/**
 * Mark a version as dismissed
 */
export async function markUpdateDismissed(version) {
  try {
    if (version) {
      await AsyncStorage.setItem(DISMISSED_UPDATE_KEY, version);
    }
  } catch {}
}

/**
 * Opens Google Play Store (market scheme first, then web fallback)
 */
export async function openStorePage(customUrl) {
  const marketUrl = customUrl || PLAY_STORE_MARKET_URL;
  const webUrl = PLAY_STORE_WEB_URL;

  try {
    const canOpen = await Linking.canOpenURL(marketUrl);
    if (canOpen) {
      await Linking.openURL(marketUrl);
      return;
    }
  } catch (_) {}

  try {
    await Linking.openURL(webUrl);
  } catch (err) {
    console.error('[VersionCheck] Failed to open store URL:', err);
  }
}
