import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const PROFILE_KEY = '@community_profile';
const IP_KEY = '@community_user_ip';
const COUNTRY_KEY = '@community_user_country';
const ONBOARDED_KEY = '@community_terms_accepted';
export const JOINED_AT_KEY = '@community_joined_at';

/**
 * Generate randomized BBM-style handle: 1 letter + 5 digits (e.g. U71234)
 */
export function generateUserHandle() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
  const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
  return `${randomLetter}${randomDigits}`;
}

/**
 * Convert 2-letter ISO country code into Unicode flag regional indicator
 */
export function getCountryFlag(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') return '';
  const clean = countryCode.trim().toUpperCase();
  if (clean.length !== 2) return '';
  const offset = 127397;
  try {
    return String.fromCodePoint(clean.charCodeAt(0) + offset, clean.charCodeAt(1) + offset);
  } catch (_) {
    return '';
  }
}

/**
 * Curated list of 12 dignified avatar colors and initials/icons
 */
export const AVATAR_OPTIONS = [
  { id: 1, name: 'Purple Harp', bg: '#8B5CF6', text: '#A78BFA', initial: 'H' },
  { id: 2, name: 'Royal Sapphire', bg: '#2563EB', text: '#60A5FA', initial: 'S' },
  { id: 3, name: 'Emerald Palm', bg: '#059669', text: '#34D399', initial: 'E' },
  { id: 4, name: 'Golden Lyre', bg: '#D97706', text: '#FBBF24', initial: 'L' },
  { id: 5, name: 'Ruby Melody', bg: '#E11D48', text: '#FB7185', initial: 'M' },
  { id: 6, name: 'Deep Teal', bg: '#0D9488', text: '#2DD4BF', initial: 'T' },
  { id: 7, name: 'Indigo Chime', bg: '#4F46E5', text: '#818CF8', initial: 'C' },
  { id: 8, name: 'Rose Praise', bg: '#DB2777', text: '#F472B6', initial: 'P' },
  { id: 9, name: 'Bronze Psalm', bg: '#B45309', text: '#F97316', initial: 'B' },
  { id: 10, name: 'Slate Song', bg: '#475569', text: '#94A3B8', initial: 'Z' },
  { id: 11, name: 'Cyan Chorus', bg: '#0891B2', text: '#22D3EE', initial: 'K' },
  { id: 12, name: 'Violet Verse', bg: '#7C3AED', text: '#C084FC', initial: 'V' },
];

/**
 * Detect and block phone numbers, addresses, emails, and external links
 */
export function validateCleanMessage(rawText) {
  if (!rawText || !rawText.trim()) {
    return { isValid: false, error: 'Message cannot be empty.' };
  }

  const text = rawText.trim();

  // 1. URLs and web links
  const urlRegex = /(https?:\/\/|www\.|\.com|\.org|\.net|\.ng|\.co|\.app|t\.me\/|wa\.me\/|discord\.gg)/i;
  if (urlRegex.test(text)) {
    return {
      isValid: false,
      error: 'For safety and privacy, external website and social links cannot be shared in the community.',
    };
  }

  // 2. Email addresses
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  if (emailRegex.test(text)) {
    return {
      isValid: false,
      error: 'For privacy, email addresses cannot be shared.',
    };
  }

  // 3. Phone numbers (standard digits, with spaces, hyphens, plus signs, brackets)
  const phoneDigitRegex = /(\+?\d[\d\s\-\(\)\.]{7,}\d)/;
  if (phoneDigitRegex.test(text)) {
    return {
      isValid: false,
      error: 'For your safety, phone numbers cannot be shared in the community.',
    };
  }

  // 4. Spelled out numbers commonly used to evade phone filters
  const spelledPhoneRegex = /(zero|one|two|three|four|five|six|seven|eight|nine)[\s\W]*(zero|one|two|three|four|five|six|seven|eight|nine)[\s\W]*(zero|one|two|three|four|five|six|seven|eight|nine)/i;
  if (spelledPhoneRegex.test(text)) {
    return {
      isValid: false,
      error: 'Contact numbers and spelled-out phone digits cannot be shared.',
    };
  }

  // 5. Social handles
  const socialHandleRegex = /(@[a-zA-Z0-9_]{4,}|snapchat|whatsapp|instagram|telegram)/i;
  if (socialHandleRegex.test(text)) {
    return {
      isValid: false,
      error: 'Personal social handles and messenger tags cannot be shared.',
    };
  }

  return { isValid: true, cleanText: text };
}

/**
 * Determine country and IP address securely for moderation and flag display
 */
export async function resolveUserCountryAndIp() {
  try {
    const cachedCountry = await AsyncStorage.getItem(COUNTRY_KEY);
    const cachedIp = await AsyncStorage.getItem(IP_KEY);

    if (cachedCountry && cachedIp) {
      return { ...JSON.parse(cachedCountry), ip: cachedIp };
    }

    // Free lightweight country lookup
    const response = await fetch('https://api.country.is', { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      const code = data?.country || 'US';
      const ip = data?.ip || '';

      const countryInfo = { code, name: code };
      await AsyncStorage.setItem(COUNTRY_KEY, JSON.stringify(countryInfo));
      if (ip) await AsyncStorage.setItem(IP_KEY, ip);

      return { ...countryInfo, ip };
    }
  } catch (_) {
    // Graceful fallback
  }

  return { code: 'US', name: 'Global', ip: '' };
}

/**
 * Check if the user's Device ID or IP address has an active ban
 */
export async function checkBanStatus(deviceId) {
  try {
    const storedIp = await AsyncStorage.getItem(IP_KEY);

    let query = supabase
      .from('community_bans')
      .select('*')
      .or(`device_id.eq.${deviceId}${storedIp ? `,ip_address.eq.${storedIp}` : ''}`);

    const { data, error } = await query;
    if (error && error.code !== '42P01') throw error;

    if (data && data.length > 0) {
      const now = new Date();
      // Check for active unexpired ban
      const activeBan = data.find((b) => {
        if (!b.banned_until) return true; // permanent
        return new Date(b.banned_until) > now;
      });

      if (activeBan) {
        return {
          isBanned: true,
          bannedUntil: activeBan.banned_until,
          reason: activeBan.reason || 'Community guideline violation',
        };
      }
    }
  } catch (_) {}

  return { isBanned: false, bannedUntil: null, reason: null };
}

/**
 * Get the timestamp when the current user joined the community
 */
export async function getUserJoinedAt(profile) {
  if (profile?.created_at) {
    await AsyncStorage.setItem(JOINED_AT_KEY, profile.created_at).catch(() => {});
    return profile.created_at;
  }
  try {
    const local = await AsyncStorage.getItem(JOINED_AT_KEY);
    if (local) return local;
  } catch (_) {}
  const now = new Date().toISOString();
  await AsyncStorage.setItem(JOINED_AT_KEY, now).catch(() => {});
  return now;
}

/**
 * Ping user activity timestamp for accurate online user counter
 */
export async function pingCommunityActive(deviceId) {
  if (!deviceId) return;
  try {
    await supabase
      .from('community_profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('device_id', deviceId);
  } catch (_) {}
}

/**
 * Query number of community members active in the last 3 minutes
 */
export async function fetchOnlineUsersCount() {
  try {
    const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('community_profiles')
      .select('device_id', { count: 'exact', head: true })
      .gte('last_active_at', threeMinsAgo);

    if (error && error.code !== '42P01') throw error;
    return Math.max(1, count || 1);
  } catch (_) {
    return 1;
  }
}

/**
 * Retrieve or initialize community profile for device
 */
export async function getOrCreateCommunityProfile(deviceId) {
  if (!deviceId) return null;

  try {
    // 1. Check local storage
    const localRaw = await AsyncStorage.getItem(PROFILE_KEY);
    if (localRaw) {
      const localProfile = JSON.parse(localRaw);
      if (localProfile?.handle) {
        if (localProfile.created_at) {
          await AsyncStorage.setItem(JOINED_AT_KEY, localProfile.created_at).catch(() => {});
        }
        return localProfile;
      }
    }

    // 2. Check remote database
    const { data: remoteData, error } = await supabase
      .from('community_profiles')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (remoteData) {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(remoteData));
      if (remoteData.created_at) {
        await AsyncStorage.setItem(JOINED_AT_KEY, remoteData.created_at).catch(() => {});
      }
      return remoteData;
    }

    // 3. Create fresh profile
    const geo = await resolveUserCountryAndIp();
    const newHandle = generateUserHandle();
    const randomAvatarId = Math.floor(Math.random() * 12) + 1;
    const nowIso = new Date().toISOString();

    const newProfile = {
      device_id: deviceId,
      handle: newHandle,
      avatar_id: randomAvatarId,
      star_level: 1,
      country_name: geo.name || 'Global',
      country_code: geo.code || 'US',
      ip_address: geo.ip || null,
      is_banned: false,
      last_active_at: nowIso,
      created_at: nowIso,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('community_profiles')
      .upsert(newProfile, { onConflict: 'device_id' })
      .select()
      .maybeSingle();

    const result = inserted || newProfile;
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(result));
    await AsyncStorage.setItem(JOINED_AT_KEY, result.created_at || nowIso).catch(() => {});
    return result;
  } catch (err) {
    console.warn('[Community] Profile retrieval fallback:', err?.message || err);
    return {
      device_id: deviceId,
      handle: generateUserHandle(),
      avatar_id: 1,
      star_level: 1,
      country_code: 'US',
      country_name: 'Global',
      created_at: new Date().toISOString(),
    };
  }
}
