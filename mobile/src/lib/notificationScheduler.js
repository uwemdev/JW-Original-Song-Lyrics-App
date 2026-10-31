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
        title: 'How was the meeting today?',
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
        title: 'Song of the Day',
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

/**
 * Inactivity Re-engagement Reminders (7 Days, 14 Days, 30 Days)
 * Warm, uplifting messages delivered only if the user hasn't opened the app.
 */
export const INACTIVITY_NOTIFICATIONS = [
  {
    identifier: 'inactivity-reminder-7d',
    days: 7,
    title: 'Thinking of you',
    body: 'Hope your week is going well. Whenever you need peace and encouragement, your Kingdom song lyrics are waiting for you.',
    data: { type: 'inactivity_7d' },
  },
  {
    identifier: 'inactivity-reminder-14d',
    days: 14,
    title: 'A gentle melody for your heart',
    body: 'Take a peaceful moment today. An uplifting song can bring comfort and strength during a busy week.',
    data: { type: 'inactivity_14d' },
  },
  {
    identifier: 'inactivity-reminder-30d',
    days: 30,
    title: 'Always here for encouragement',
    body: 'Whenever you need comfort and spiritual strength, your song lyrics and sing-along are ready for you.',
    data: { type: 'inactivity_30d' },
  },
];

/**
 * Schedule inactivity reminders for 7, 14, and 30 days of absence.
 * Resets the countdown every time the user opens or resumes the app.
 */
export async function scheduleInactivityReminders(enabled = true) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const inactivityIds = INACTIVITY_NOTIFICATIONS.map((n) => n.identifier);

    // Cancel existing inactivity notifications
    for (const notif of scheduled) {
      if (inactivityIds.includes(notif.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    if (!enabled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await setupAndroidChannel();

    for (const item of INACTIVITY_NOTIFICATIONS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + item.days);
      targetDate.setHours(17, 0, 0, 0); // 5:00 PM local time

      // Safety check: ensure targetDate is in the future
      if (targetDate.getTime() <= Date.now()) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: {
          title: item.title,
          body: item.body,
          sound: 'default',
          channelId: 'reminders',
          data: item.data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
          channelId: 'reminders',
        },
      });
    }
  } catch (err) {
    console.warn('[NotificationScheduler] Failed to schedule inactivity reminders:', err?.message || err);
  }
}

/**
 * Developer / Test helper: schedule a test warm notification 4 seconds from now.
 */
export async function triggerTestWarmReminder(days = 7) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;
    await setupAndroidChannel();

    const notifItem = INACTIVITY_NOTIFICATIONS.find((n) => n.days === days) || INACTIVITY_NOTIFICATIONS[0];

    await Notifications.scheduleNotificationAsync({
      identifier: 'test-warm-reminder',
      content: {
        title: notifItem.title,
        body: notifItem.body,
        sound: 'default',
        channelId: 'reminders',
        data: notifItem.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 4,
        repeats: false,
        channelId: 'reminders',
      },
    });
    return true;
  } catch (err) {
    console.warn('[NotificationScheduler] Failed to trigger test warm reminder:', err?.message || err);
    return false;
  }
}
