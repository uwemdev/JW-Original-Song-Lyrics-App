import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const RECENT_VIEWS_CACHE = new Map();
const RECENT_PLAYS_CACHE = new Map();
let lastSearchQuery = '';
let lastSearchTime = 0;

/**
 * Safely retrieve device ID from AsyncStorage without throwing
 */
async function getStoredDeviceId() {
  try {
    return await AsyncStorage.getItem('@settings_device_id');
  } catch (_) {
    return null;
  }
}

/**
 * Log user search query and result count to Supabase
 * Debounced and offline-safe
 *
 * @param {string} query - The search query term
 * @param {number} resultsCount - Number of matches found
 * @param {string|null} [explicitDeviceId] - Optional device ID
 */
export async function logSearchQuery(query, resultsCount = 0, explicitDeviceId = null) {
  try {
    if (!query || typeof query !== 'string') return;
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.length < 2) return;

    // Throttle exact duplicate searches within 4 seconds
    const now = Date.now();
    if (cleanQuery === lastSearchQuery && now - lastSearchTime < 4000) {
      return;
    }
    lastSearchQuery = cleanQuery;
    lastSearchTime = now;

    const deviceId = explicitDeviceId || (await getStoredDeviceId());

    // Fire and forget, never block UI
    supabase
      .from('app_search_logs')
      .insert([
        {
          query: cleanQuery,
          results_count: typeof resultsCount === 'number' ? resultsCount : 0,
          device_id: deviceId || null,
        },
      ])
      .then(() => {})
      .catch((err) => {
        // Silently capture network failures
        if (__DEV__) {
          console.log('[Analytics] Search log skipped:', err?.message || err);
        }
      });
  } catch (_) {
    // Never crash caller
  }
}

/**
 * Log song interaction events (view, play, download, share_status, favorite)
 *
 * @param {string} songId - UUID of the song
 * @param {'view'|'play'|'download'|'share_status'|'favorite'} eventType - Type of interaction
 * @param {string|null} [explicitDeviceId] - Optional device ID
 */
export async function logSongEvent(songId, eventType, explicitDeviceId = null) {
  try {
    if (!songId || !eventType) return;

    const now = Date.now();

    // In-memory throttling to prevent event spam
    if (eventType === 'view') {
      const lastView = RECENT_VIEWS_CACHE.get(songId) || 0;
      if (now - lastView < 60000) return; // 1 view per minute per song
      RECENT_VIEWS_CACHE.set(songId, now);
    } else if (eventType === 'play') {
      const lastPlay = RECENT_PLAYS_CACHE.get(songId) || 0;
      if (now - lastPlay < 30000) return; // 1 play per 30 seconds per song
      RECENT_PLAYS_CACHE.set(songId, now);
    }

    const deviceId = explicitDeviceId || (await getStoredDeviceId());

    // Fire and forget
    supabase
      .from('app_song_events')
      .insert([
        {
          song_id: songId,
          event_type: eventType,
          device_id: deviceId || null,
        },
      ])
      .then(() => {})
      .catch((err) => {
        if (__DEV__) {
          console.log('[Analytics] Song event skipped:', err?.message || err);
        }
      });
  } catch (_) {
    // Never crash caller
  }
}
