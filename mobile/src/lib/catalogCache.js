import AsyncStorage from '@react-native-async-storage/async-storage';

export const CACHE_KEY_SONGS = '@cached_catalog_songs';
export const CACHE_KEY_CATEGORIES = '@cached_catalog_categories';

/**
 * Retrieve cached songs array from AsyncStorage
 * @returns {Promise<Array>}
 */
export async function getCachedSongs() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_SONGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/**
 * Retrieve cached categories array from AsyncStorage
 * @returns {Promise<Array>}
 */
export async function getCachedCategories() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_CATEGORIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/**
 * Persist songs array to AsyncStorage
 * @param {Array} songs
 */
export async function setCachedSongs(songs) {
  if (!Array.isArray(songs) || songs.length === 0) return;
  try {
    await AsyncStorage.setItem(CACHE_KEY_SONGS, JSON.stringify(songs));
  } catch (_) {}
}

/**
 * Persist categories array to AsyncStorage
 * @param {Array} categories
 */
export async function setCachedCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) return;
  try {
    await AsyncStorage.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(categories));
  } catch (_) {}
}

/**
 * Filter and sort a list of songs by category
 * @param {Array} songs
 * @param {string|number} categoryId
 * @param {string} sortKey 'az' | 'newest' | 'most_played'
 * @returns {Array}
 */
export function filterSongsByCategory(songs, categoryId, sortKey = 'newest') {
  if (!Array.isArray(songs) || !categoryId) return [];

  const matched = songs.filter(
    (s) => String(s.category_id) === String(categoryId) && s.is_published !== false
  );

  if (sortKey === 'az') {
    return matched.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  // newest / most_played fallback
  return matched.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Strip HTML tags and entities for clean text search
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[\u00A0\u202F\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Perform fast local offline search on songs matching title, writeup, and lyrics
 * @param {Array} songs
 * @param {string} searchTerm
 * @param {string|number|null} scopedCategoryId
 * @param {number} limit
 * @returns {Array}
 */
export function searchSongsLocally(songs, searchTerm, scopedCategoryId = null, limit = 50) {
  if (!Array.isArray(songs) || !searchTerm || !searchTerm.trim()) return [];

  const term = searchTerm.trim().toLowerCase();

  let pool = songs.filter((s) => s && s.is_published !== false);
  if (scopedCategoryId) {
    pool = pool.filter((s) => String(s.category_id) === String(scopedCategoryId));
  }

  const scored = [];

  for (let i = 0; i < pool.length; i++) {
    const song = pool[i];
    const titleLower = (song.title || '').toLowerCase();
    const writeupLower = (song.writeup || '').toLowerCase();
    const plainLyrics = stripHtml(song.lyrics || '').toLowerCase();

    let score = 0;
    if (titleLower.startsWith(term)) {
      score = 1;
    } else if (titleLower.includes(term)) {
      score = 2;
    } else if (writeupLower.includes(term)) {
      score = 3;
    } else if (plainLyrics.includes(term)) {
      score = 4;
    }

    if (score > 0) {
      scored.push({ ...song, _score: score });
    }
  }

  scored.sort((a, b) => a._score - b._score || (a.title || '').localeCompare(b.title || ''));
  return scored.slice(0, limit);
}

/**
 * Resolve favorite song objects from catalog given favorite IDs, maintaining order
 * @param {Array} songs
 * @param {Array<string|number>} favIds
 * @returns {Array}
 */
export function getFavoriteSongsFromCatalog(songs, favIds) {
  if (!Array.isArray(songs) || !Array.isArray(favIds) || favIds.length === 0) return [];

  const map = new Map();
  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    if (s && s.id !== undefined) {
      map.set(String(s.id), s);
    }
  }

  const result = [];
  // Most recently added last in favIds, so reverse for newest first
  for (let i = favIds.length - 1; i >= 0; i--) {
    const idStr = String(favIds[i]);
    const found = map.get(idStr);
    if (found && found.is_published !== false) {
      result.push(found);
    }
  }
  return result;
}

/**
 * Compute count of songs per category from catalog
 * @param {Array} songs
 * @returns {Record<string, number>}
 */
export function getCategoryCountsFromCatalog(songs) {
  const counts = {};
  if (!Array.isArray(songs)) return counts;

  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    if (s && s.category_id && s.is_published !== false) {
      const key = String(s.category_id);
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Get related songs from the same category
 * @param {Array} songs
 * @param {string|number} categoryId
 * @param {string|number} excludeSongId
 * @param {number} limit
 * @returns {Array}
 */
export function getRelatedSongsFromCatalog(songs, categoryId, excludeSongId, limit = 6) {
  if (!Array.isArray(songs) || !categoryId) return [];
  const catStr = String(categoryId);
  const exclStr = String(excludeSongId);

  const related = [];
  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    if (
      s &&
      String(s.category_id) === catStr &&
      String(s.id) !== exclStr &&
      s.is_published !== false
    ) {
      related.push(s);
      if (related.length >= limit) break;
    }
  }
  return related;
}
