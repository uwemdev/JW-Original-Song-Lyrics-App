import { supabase } from '../../lib/supabase';

const STORAGE_KEY = 'admin_read_convos';

/**
 * Retrieves the local map of read conversation states.
 * Format: { [convoId]: { lastMsgId: string, timestamp: string } }
 */
export function getLocalReadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Computes the number of unread conversations from an array of feedback records.
 * A conversation is considered unread if:
 * 1. Its latest message was sent by a user (not an admin reply).
 * 2. It has not been marked as read in the database (is_read is false).
 * 3. It has not been opened/read locally in localStorage.
 *
 * @param {Array} feedbackRows - Array of feedback table rows
 * @returns {number} Count of unread conversations
 */
export function computeUnreadFeedbackCount(feedbackRows = []) {
  if (!feedbackRows || feedbackRows.length === 0) return 0;

  const readMap = getLocalReadMap();

  // Group messages into conversations by device_id or anon_id
  const convoMap = new Map();
  for (const item of feedbackRows) {
    const key = item.device_id || `anon_${item.id}`;
    if (!convoMap.has(key)) {
      convoMap.set(key, []);
    }
    convoMap.get(key).push(item);
  }

  let unreadCount = 0;

  for (const [key, msgs] of convoMap.entries()) {
    msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const last = msgs[msgs.length - 1];
    if (!last) continue;

    // 1. If the latest message was an admin reply, the thread has been answered
    if (last.is_admin_reply) {
      continue;
    }

    // 2. If the latest message is explicitly marked as read in the database
    if (last.is_read) {
      continue;
    }

    // 3. If marked as read in localStorage
    const readEntry = readMap[key];
    if (readEntry) {
      const lastReadMsgId = typeof readEntry === 'object' ? readEntry.lastMsgId : readEntry;
      const readTimestamp = typeof readEntry === 'object' ? readEntry.timestamp : null;

      if (lastReadMsgId && lastReadMsgId === last.id) {
        continue;
      }
      if (readTimestamp && new Date(readTimestamp) >= new Date(last.created_at)) {
        continue;
      }
    }

    // Conversation is unread
    unreadCount++;
  }

  return unreadCount;
}

/**
 * Fetches feedback rows from Supabase and calculates the current unread count.
 *
 * @param {object} [client] - Supabase client instance (defaults to shared instance)
 * @returns {Promise<number>} Count of unread conversations
 */
export async function fetchUnreadCountFromDb(client = supabase) {
  try {
    const { data, error } = await client
      .from('feedback')
      .select('id, device_id, is_admin_reply, is_read, created_at')
      .order('created_at', { ascending: false });

    if (error || !data) return 0;
    return computeUnreadFeedbackCount(data);
  } catch (err) {
    console.error('Error fetching unread feedback count:', err);
    return 0;
  }
}

/**
 * Marks a conversation as read both locally (localStorage) and in Supabase.
 * Broadcasts an 'admin_feedback_updated' event to notify all components.
 *
 * @param {string} convoId - Conversation ID or device_id
 * @param {Array} messages - Array of messages in this conversation
 * @param {object} [client] - Supabase client instance
 */
export async function markConversationAsRead(convoId, messages = [], client = supabase) {
  if (!convoId) return;

  const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1] : null;

  // 1. Update localStorage
  try {
    const readMap = getLocalReadMap();
    readMap[convoId] = {
      lastMsgId: lastMsg?.id || null,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readMap));
  } catch (_) {}

  // 2. Dispatch window event for instant responsive UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('admin_feedback_updated', {
        detail: { convoId, lastMsgId: lastMsg?.id },
      })
    );
  }

  // 3. Persist read state to Supabase for all unread user messages
  if (client) {
    try {
      const unreadIds = (messages || [])
        .filter((m) => !m.is_admin_reply && !m.is_read)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await client
          .from('feedback')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (err) {
      console.error('Error updating read status in Supabase:', err);
    }
  }
}

/**
 * Marks all conversations as read in localStorage and Supabase.
 *
 * @param {Array} conversations - List of conversation objects
 * @param {object} [client] - Supabase client instance
 */
export async function markAllConversationsAsRead(conversations = [], client = supabase) {
  try {
    const readMap = getLocalReadMap();
    const now = new Date().toISOString();
    const unreadIds = [];

    for (const convo of conversations) {
      const lastMsg = convo.messages && convo.messages.length > 0 ? convo.messages[convo.messages.length - 1] : null;
      readMap[convo.id] = {
        lastMsgId: lastMsg?.id || null,
        timestamp: now,
      };

      (convo.messages || []).forEach((m) => {
        if (!m.is_admin_reply && !m.is_read) {
          unreadIds.push(m.id);
        }
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(readMap));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('admin_feedback_updated', {
          detail: { all: true },
        })
      );
    }

    if (client && unreadIds.length > 0) {
      await client
        .from('feedback')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  } catch (err) {
    console.error('Error in markAllConversationsAsRead:', err);
  }
}

