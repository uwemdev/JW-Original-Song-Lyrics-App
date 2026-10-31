import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_METADATA_KEY = '@offline_downloaded_songs';
const OFFLINE_DIR = `${FileSystem.documentDirectory || ''}jw_audio_vault/`;

// Active download tasks map so downloads can be tracked or cancelled
const activeDownloadTasks = new Map();

/**
 * Ensures the isolated private vault directory exists and contains a .nomedia file
 * so downloaded files remain strictly hidden from the device's music library & media scanner.
 */
export async function ensureOfflineVaultExists() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(OFFLINE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
    }
    // Write .nomedia file so Android MediaScanner ignores this folder completely
    const nomediaPath = `${OFFLINE_DIR}.nomedia`;
    const nomediaInfo = await FileSystem.getInfoAsync(nomediaPath);
    if (!nomediaInfo.exists) {
      await FileSystem.writeAsStringAsync(nomediaPath, '');
    }
  } catch (err) {
    console.warn('Failed to initialize offline audio vault:', err);
  }
}

/**
 * Retrieve all downloaded songs metadata from storage
 * @returns {Promise<Record<string, any>>}
 */
export async function getDownloadedSongsMap() {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_METADATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Check if a specific song is downloaded and file exists on disk
 * @param {string|number} songId
 * @returns {Promise<boolean>}
 */
export async function isSongDownloaded(songId) {
  if (!songId) return false;
  const map = await getDownloadedSongsMap();
  const entry = map[String(songId)];
  if (!entry || !entry.localUri) return false;

  try {
    const fileInfo = await FileSystem.getInfoAsync(entry.localUri);
    return fileInfo.exists;
  } catch (_) {
    return false;
  }
}

/**
 * Get local file URI for a song if downloaded, otherwise null
 * @param {string|number} songId
 * @returns {Promise<string|null>}
 */
export async function getLocalAudioUri(songId) {
  if (!songId) return null;
  const map = await getDownloadedSongsMap();
  const entry = map[String(songId)];
  if (!entry || !entry.localUri) return null;

  try {
    const fileInfo = await FileSystem.getInfoAsync(entry.localUri);
    return fileInfo.exists ? entry.localUri : null;
  } catch (_) {
    return null;
  }
}

/**
 * Download a song into the isolated app vault
 * @param {object} song
 * @param {(progress: number) => void} onProgress Callback receiving 0.0 to 1.0
 * @returns {Promise<{ success: boolean, localUri?: string, error?: string }>}
 */
export async function downloadSong(song, onProgress = null) {
  if (!song || !song.mp3_url) {
    return { success: false, error: 'No audio URL available' };
  }

  await ensureOfflineVaultExists();
  const songId = String(song.id);
  const targetPath = `${OFFLINE_DIR}track_${songId}.mp3`;

  try {
    // Check if an existing download is in flight
    if (activeDownloadTasks.has(songId)) {
      return { success: false, error: 'Download already in progress' };
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      song.mp3_url,
      targetPath,
      {},
      (progressData) => {
        const total = progressData.totalBytesExpectedToWrite;
        const current = progressData.totalBytesWritten;
        if (total > 0 && typeof onProgress === 'function') {
          onProgress(Math.min(1, Math.max(0, current / total)));
        }
      }
    );

    activeDownloadTasks.set(songId, downloadResumable);
    const result = await downloadResumable.downloadAsync();
    activeDownloadTasks.delete(songId);

    if (!result || !result.uri) {
      return { success: false, error: 'Download failed' };
    }

    // Verify file size on disk
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    const sizeBytes = fileInfo.size || 0;

    // Save metadata
    const map = await getDownloadedSongsMap();
    map[songId] = {
      id: song.id,
      title: song.title,
      category_name: song.categories?.name || song.category_name || 'Original Song',
      feature_image_url: song.feature_image_url,
      lyrics: song.lyrics,
      mp3_url: song.mp3_url,
      localUri: result.uri,
      sizeBytes,
      downloadedAt: Date.now(),
    };

    await AsyncStorage.setItem(OFFLINE_METADATA_KEY, JSON.stringify(map));
    return { success: true, localUri: result.uri, sizeBytes };
  } catch (err) {
    activeDownloadTasks.delete(songId);
    console.warn(`Failed to download song ${songId}:`, err);
    return { success: false, error: err?.message || 'Download error' };
  }
}

/**
 * Remove a single downloaded song from disk and metadata
 * @param {string|number} songId
 */
export async function deleteDownloadedSong(songId) {
  const sid = String(songId);
  const map = await getDownloadedSongsMap();
  const entry = map[sid];

  if (entry && entry.localUri) {
    try {
      await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
    } catch (_) {}
  }

  delete map[sid];
  await AsyncStorage.setItem(OFFLINE_METADATA_KEY, JSON.stringify(map));
}

/**
 * Clear all downloaded offline songs and clean up vault
 */
export async function clearAllDownloadedSongs() {
  try {
    await FileSystem.deleteAsync(OFFLINE_DIR, { idempotent: true });
  } catch (_) {}
  await AsyncStorage.removeItem(OFFLINE_METADATA_KEY);
  await ensureOfflineVaultExists();
}

/**
 * Format raw bytes into human readable MB / KB
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
