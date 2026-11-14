import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { scheduleSundayMeetingReminder, scheduleDailySongReminder, scheduleInactivityReminders, triggerSystemNotification } from '../lib/notificationScheduler';
import { CURRENT_APP_VERSION } from '../lib/versionCheck';

const SettingsContext = createContext(null);

// Storage keys
const KEYS = {
  theme: '@settings_theme',
  fontSizeIdx: '@lyrics_font_size', // matches SongScreen's existing key
  autoPlay: '@settings_auto_play',
  dataSaver: '@settings_data_saver',
  autoCacheFavorites: '@settings_auto_cache_favorites',
  newSongAlerts: '@settings_new_song_alerts',
  dailySongReminder: '@settings_daily_song_reminder',
  sundayMeetingReminder: '@settings_sunday_meeting_reminder',
  inactivityReminders: '@settings_inactivity_reminders',
  deviceId: '@settings_device_id',
  installDate: '@settings_install_date',
  dismissedNotifs: '@settings_dismissed_notifs',
  deliveredPushIds: '@settings_delivered_push_ids',
};

// Defaults
const DEFAULTS = {
  theme: 'system', // 'dark' | 'light' | 'system'
  fontSizeIdx: 1, // 0=small, 1=medium, 2=large
  autoPlay: true,
  dataSaver: false,
  autoCacheFavorites: false,
  newSongAlerts: true,
  dailySongReminder: true,
  sundayMeetingReminder: true,
  inactivityReminders: true,
};

export const DarkColors = {
  bg: '#0F0A1A',
  cardBg: '#1A1425',
  purple: '#6D28D9',
  purpleAccent: '#A78BFA',
  textWhite: '#FFFFFF',
  textMuted: '#B8AFC9',
  divider: 'rgba(255,255,255,0.06)',
  danger: '#EF4444',
};

export const LightColors = {
  bg: '#F8FAFC', // Slate 50
  cardBg: '#FFFFFF',
  purple: '#6D28D9',
  purpleAccent: '#8B5CF6',
  textWhite: '#0F172A', // Slate 900 (Dark text)
  textMuted: '#64748B', // Slate 500
  divider: 'rgba(0,0,0,0.06)',
  danger: '#EF4444',
};

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULTS.theme);
  const [fontSizeIdx, setFontSizeIdxState] = useState(DEFAULTS.fontSizeIdx);
  const [autoPlay, setAutoPlayState] = useState(DEFAULTS.autoPlay);
  const [dataSaver, setDataSaverState] = useState(DEFAULTS.dataSaver);
  const [autoCacheFavorites, setAutoCacheFavoritesState] = useState(DEFAULTS.autoCacheFavorites);
  const [newSongAlerts, setNewSongAlertsState] = useState(DEFAULTS.newSongAlerts);
  const [dailySongReminder, setDailySongReminderState] = useState(DEFAULTS.dailySongReminder);
  const [sundayMeetingReminder, setSundayMeetingReminderState] = useState(DEFAULTS.sundayMeetingReminder);
  const [inactivityReminders, setInactivityRemindersState] = useState(DEFAULTS.inactivityReminders);
  const [deviceId, setDeviceIdState] = useState(null);
  const [hasUnreadFeedback, setHasUnreadFeedback] = useState(false);
  const [installDate, setInstallDate] = useState(null);
  const [dismissedNotifs, setDismissedNotifs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const systemTheme = useColorScheme(); // 'light' or 'dark'

  const generateDeviceId = () => {
    return 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  };

  // Load all settings from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const results = await AsyncStorage.multiGet(Object.values(KEYS));
        const map = {};
        results.forEach(([key, value]) => {
          if (value !== null) map[key] = value;
        });

        if (map[KEYS.theme]) setThemeState(map[KEYS.theme]);
        if (map[KEYS.fontSizeIdx]) {
          const parsed = parseInt(map[KEYS.fontSizeIdx], 10);
          if (!isNaN(parsed)) setFontSizeIdxState(parsed);
        }
        if (map[KEYS.autoPlay]) setAutoPlayState(map[KEYS.autoPlay] === 'true');
        if (map[KEYS.dataSaver]) setDataSaverState(map[KEYS.dataSaver] === 'true');
        if (map[KEYS.autoCacheFavorites]) setAutoCacheFavoritesState(map[KEYS.autoCacheFavorites] === 'true');
        if (map[KEYS.newSongAlerts] !== undefined) setNewSongAlertsState(map[KEYS.newSongAlerts] !== 'false');
        if (map[KEYS.dailySongReminder] !== undefined) setDailySongReminderState(map[KEYS.dailySongReminder] !== 'false');
        if (map[KEYS.sundayMeetingReminder] !== undefined) setSundayMeetingReminderState(map[KEYS.sundayMeetingReminder] !== 'false');
        scheduleDailySongReminder(map[KEYS.dailySongReminder] !== 'false');
        if (map[KEYS.inactivityReminders] !== undefined) setInactivityRemindersState(map[KEYS.inactivityReminders] !== 'false');
        scheduleSundayMeetingReminder(map[KEYS.sundayMeetingReminder] !== 'false');
        scheduleInactivityReminders(map[KEYS.inactivityReminders] !== 'false');

        if (map[KEYS.deviceId]) {
          setDeviceIdState(map[KEYS.deviceId]);
        } else {
          const newId = generateDeviceId();
          await AsyncStorage.setItem(KEYS.deviceId, newId);
          setDeviceIdState(newId);
        }

        if (map[KEYS.installDate]) {
          setInstallDate(map[KEYS.installDate]);
        } else {
          const now = new Date().toISOString();
          await AsyncStorage.setItem(KEYS.installDate, now);
          setInstallDate(now);
        }

        if (map[KEYS.dismissedNotifs]) {
          try {
            setDismissedNotifs(JSON.parse(map[KEYS.dismissedNotifs]));
          } catch (_) {}
        }
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  // Listen for unread feedback
  useEffect(() => {
    if (!deviceId) return;
    
    const checkUnread = async () => {
      const { count } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('device_id', deviceId)
        .eq('is_admin_reply', true)
        .eq('is_read', false);
      setHasUnreadFeedback(count > 0);
    };
    checkUnread();

    const channel = supabase.channel('global_feedback')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feedback',
        filter: `device_id=eq.${deviceId}`
      }, (payload) => {
        if (payload.new.is_admin_reply) {
          setHasUnreadFeedback(true);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'feedback',
        filter: `device_id=eq.${deviceId}`
      }, (payload) => {
        if (payload.new.is_read) {
          checkUnread();
        }
      })
      .subscribe();
      
    return () => {
       supabase.removeChannel(channel);
    };
  }, [deviceId]);

  // Register Expo Push Token for Google FCM
  useEffect(() => {
    if (!deviceId) return;

    let isMounted = true;
    const registerPushToken = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '7f7c824c-9014-473d-ba1c-f8243e4940f1',
        });
        const pushToken = tokenData?.data;

        if (pushToken && isMounted) {
          const payload = {
            device_id: deviceId,
            push_token: pushToken,
            platform: Platform.OS,
            app_version: CURRENT_APP_VERSION,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from('device_push_tokens')
            .upsert(payload, { onConflict: 'device_id' });

          // Graceful fallback if database migration hasn't been applied yet
          if (error && error.code === '42703') {
            await supabase
              .from('device_push_tokens')
              .upsert(
                {
                  device_id: deviceId,
                  push_token: pushToken,
                  platform: Platform.OS,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'device_id' }
              );
          }
        }
      } catch (err) {
        console.warn('[PushToken] Registration skipped:', err?.message || err);
      }
    };

    registerPushToken();
    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  // Listen for real-time admin push notifications while online
  useEffect(() => {
    // 1. Acknowledge existing broadcast IDs so older notifications never pop up on app open
    const acknowledgeExistingBroadcasts = async () => {
      try {
        const raw = await AsyncStorage.getItem(KEYS.deliveredPushIds);
        const delivered = raw ? JSON.parse(raw) : [];

        const { data } = await supabase
          .from('app_notifications')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(50);

        if (data && data.length > 0) {
          const allIds = data.map((n) => n.id);
          const merged = Array.from(new Set([...delivered, ...allIds]));
          await AsyncStorage.setItem(KEYS.deliveredPushIds, JSON.stringify(merged.slice(-100)));
        }
      } catch (err) {
        console.warn('[BroadcastAck] Error:', err);
      }
    };

    acknowledgeExistingBroadcasts();

    // 2. Real-time listener: ONLY trigger system alerts for brand-new live broadcasts sent right now
    const broadcastChannel = supabase
      .channel('realtime_admin_broadcasts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
        },
        async (payload) => {
          const notif = payload.new;
          if (!notif) return;

          try {
            const now = Date.now();
            const notifTime = new Date(notif.created_at).getTime();

            // Ignore stale historical notifications (only alert if sent within the last 90 seconds)
            if (now - notifTime > 90000) return;

            // Ignore notifications published before this app was installed
            if (installDate && notifTime < new Date(installDate).getTime()) return;

            const raw = await AsyncStorage.getItem(KEYS.deliveredPushIds);
            const delivered = raw ? JSON.parse(raw) : [];

            if (!delivered.includes(notif.id)) {
              await triggerSystemNotification({
                title: notif.title,
                message: notif.message,
                linkUrl: notif.link_url,
                songId: notif.song_id,
                id: notif.id,
              });

              const updated = [...delivered, notif.id];
              await AsyncStorage.setItem(KEYS.deliveredPushIds, JSON.stringify(updated.slice(-100)));
            }
          } catch (err) {
            console.warn('[BroadcastRealtime] Error:', err);
          }
        }
      )
      .subscribe();

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        acknowledgeExistingBroadcasts();
        if (deviceId) {
          supabase
            .from('device_push_tokens')
            .update({ last_active_at: new Date().toISOString() })
            .eq('device_id', deviceId)
            .then(() => {})
            .catch(() => {});
        }
      }
    });

    return () => {
      appStateSub.remove();
      supabase.removeChannel(broadcastChannel);
    };
  }, [installDate, deviceId]);

  // Setter helpers — update state immediately + persist
  const setTheme = useCallback(async (val) => {
    setThemeState(val);
    await AsyncStorage.setItem(KEYS.theme, val);
  }, []);

  const setFontSizeIdx = useCallback(async (val) => {
    setFontSizeIdxState(val);
    await AsyncStorage.setItem(KEYS.fontSizeIdx, String(val));
  }, []);

  const setAutoPlay = useCallback(async (val) => {
    setAutoPlayState(val);
    await AsyncStorage.setItem(KEYS.autoPlay, String(val));
  }, []);

  const setDataSaver = useCallback(async (val) => {
    setDataSaverState(val);
    await AsyncStorage.setItem(KEYS.dataSaver, String(val));
  }, []);

  const setAutoCacheFavorites = useCallback(async (val) => {
    setAutoCacheFavoritesState(val);
    await AsyncStorage.setItem(KEYS.autoCacheFavorites, String(val));
  }, []);

  const setNewSongAlerts = useCallback(async (val) => {
    setNewSongAlertsState(val);
    await AsyncStorage.setItem(KEYS.newSongAlerts, val ? 'true' : 'false');
  }, []);

  const setDailySongReminder = useCallback(async (val) => {
    setDailySongReminderState(val);
    await AsyncStorage.setItem(KEYS.dailySongReminder, val ? 'true' : 'false');
    scheduleDailySongReminder(val);
  }, []);

  const setSundayMeetingReminder = useCallback(async (val) => {
    setSundayMeetingReminderState(val);
    await AsyncStorage.setItem(KEYS.sundayMeetingReminder, val ? 'true' : 'false');
    scheduleSundayMeetingReminder(val);
  }, []);

  const setInactivityReminders = useCallback(async (val) => {
    setInactivityRemindersState(val);
    await AsyncStorage.setItem(KEYS.inactivityReminders, val ? 'true' : 'false');
    scheduleInactivityReminders(val);
  }, []);

  const dismissNotification = useCallback(async (idOrIds) => {
    setDismissedNotifs(prev => {
      const incoming = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const next = Array.from(new Set([...prev, ...incoming]));
      AsyncStorage.setItem(KEYS.dismissedNotifs, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Reset all settings + app data
  const resetAllData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        ...Object.values(KEYS),
        '@favorites',
        '@offline_lyrics_cache',
        '@last_played_song',
        '@recent_searches',
        '@last_read_notif',
        '@onboarding_complete',
      ]);
      // Reset state to defaults
      setThemeState(DEFAULTS.theme);
      setFontSizeIdxState(DEFAULTS.fontSizeIdx);
      setAutoPlayState(DEFAULTS.autoPlay);
      setDataSaverState(DEFAULTS.dataSaver);
      setAutoCacheFavoritesState(DEFAULTS.autoCacheFavorites);
      setNewSongAlertsState(DEFAULTS.newSongAlerts);
      setDailySongReminderState(DEFAULTS.dailySongReminder);
      setSundayMeetingReminderState(DEFAULTS.sundayMeetingReminder);
      scheduleDailySongReminder(true);
      setInactivityRemindersState(DEFAULTS.inactivityReminders);
      scheduleSundayMeetingReminder(true);
      scheduleInactivityReminders(true);
    } catch (_) {}
  }, []);

  const value = {
    loaded,
    theme, setTheme,
    fontSizeIdx, setFontSizeIdx,
    autoPlay, setAutoPlay,
    dataSaver, setDataSaver,
    autoCacheFavorites, setAutoCacheFavorites,
    newSongAlerts, setNewSongAlerts,
    dailySongReminder, setDailySongReminder,
    sundayMeetingReminder, setSundayMeetingReminder,
    inactivityReminders, setInactivityReminders,
    deviceId,
    installDate,
    dismissedNotifs, dismissNotification,
    hasUnreadFeedback, setHasUnreadFeedback,
    resetAllData,
  };

  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  value.isDark = isDark;
  value.colors = isDark ? DarkColors : LightColors;

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
