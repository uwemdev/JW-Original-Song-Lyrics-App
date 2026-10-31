import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set handler so notifications display banner/sound
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (_) {}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    return false;
  }
}

/**
 * Configure Android notification channel
 */
async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Daily Songs & Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6D28D9',
        sound: 'default',
      });
    } catch (_) {}
  }
}

/**
 * Schedule weekly Sunday 8:00 PM meeting reflection reminder
 */
export async function scheduleSundayMeetingReminder(enabled = true) {
  try {
    // 1. Cancel existing sunday reminder if any
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier === 'sunday-meeting-reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    if (!enabled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await setupAndroidChannel();

    // Weekday 1 is Sunday
    await Notifications.scheduleNotificationAsync({
      identifier: 'sunday-meeting-reminder',
      content: {
        title: '🕊️ How was the meeting today?',
        body: 'Hope you had an encouraging meeting! Relax this evening with an uplifting song.',
        sound: 'default',
        channelId: 'reminders',
        data: { type: 'sunday_reflection' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        channelId: 'reminders',
        weekday: 1, // Sunday
        hour: 20,   // 8:00 PM
        minute: 0,
      },
    });
  } catch (err) {
    console.warn('[NotificationScheduler] Failed to schedule Sunday reminder:', err?.message || err);
  }
}

/**
 * Schedule daily 7:30 AM morning Song of the Day reminder
 */
export async function scheduleDailySongReminder(enabled = true) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier === 'daily-song-reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    if (!enabled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await setupAndroidChannel();

    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-song-reminder',
      content: {
        title: '🌅 Song of the Day',
        body: 'Start your morning with encouraging words and melody.',
        sound: 'default',
        channelId: 'reminders',
        data: { type: 'daily_song' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: 'reminders',
        hour: 7,   // 7:30 AM
        minute: 30,
      },
    });
  } catch (err) {
    console.warn('[NotificationScheduler] Failed to schedule daily reminder:', err?.message || err);
  }
}

