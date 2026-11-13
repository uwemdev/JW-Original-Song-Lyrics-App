import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getLocalReadMap,
  markConversationAsRead,
  markAllConversationsAsRead,
} from './feedbackUtils';
import {
  Send,
  MessageSquare,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Search,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  Music,
  RefreshCw,
  X,
  Copy,
  Check,
  Flag,
  User,
  Clock,
  ExternalLink,
  Sparkles,
  Edit2,
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Smartphone,
} from 'lucide-react';

// Web Audio API harmonic chime (2-tone sine sweep, zero external files)
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0.14, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.error('Audio chime error:', err);
  }
}

// Parse song report metadata
function parseSongReport(msg) {
  if (!msg) return null;
  const text = msg.message || '';
  const meta = msg.device_meta || {};

  const isReport = text.startsWith('[SONG REPORT]') || Boolean(meta.song_title || meta.song_id || meta.issue);
  if (!isReport) return null;

  const titleMatch = text.match(/\[SONG REPORT\]\s*"([^"]+)"/);
  const idMatch = text.match(/\(ID:\s*([^\)]+)\)/);
  const issueMatch = text.match(/Issue:\s*([^\n]+)/);
  const noteMatch = text.match(/Note:\s*([\s\S]+)/);

  return {
    songTitle: meta.song_title || (titleMatch ? titleMatch[1] : 'Unknown Song'),
    songId: meta.song_id || (idMatch ? idMatch[1] : null),
    issue: meta.issue || (issueMatch ? issueMatch[1].trim() : 'Issue reported'),
    note: noteMatch ? noteMatch[1].trim() : (meta.note || null),
    os: meta.os || null,
    version: meta.version || null,
  };
}

const QUICK_REPLIES = [
  'Fixed! Thank you for reporting this.',
  'We have corrected the lyrics in the database.',
  'The audio track has been updated.',
  'Thanks for the feedback! We are looking into this.',
];

export default function FeedbackTab() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConvoId, setSelectedConvoId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Notifications & Sound
  const [notifPermission, setNotifPermission] = useState('default');
  const [liveToast, setLiveToast] = useState(null);
  const [notifHelpModalOpen, setNotifHelpModalOpen] = useState(false);
  const [notifHelpType, setNotifHelpType] = useState('unsupported');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_feedback_sound');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const selectedConvoIdRef = useRef(selectedConvoId);
  selectedConvoIdRef.current = selectedConvoId;

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_feedback_sound', String(next));
      } catch (_) {}
      if (next) playChime();
      return next;
    });
  };

  const requestNotificationPermission = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isTelegramOrInApp = /Telegram|FBAN|FBAV|Instagram|Line/i.test(navigator.userAgent);

    if (!('Notification' in window)) {
      if (isIOS && !isStandalone) {
        setNotifHelpType('ios_pwa');
      } else if (isTelegramOrInApp) {
        setNotifHelpType('in_app_browser');
      } else {
        setNotifHelpType('unsupported');
      }
      setNotifHelpModalOpen(true);
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        // Send a test notification using Service Worker or Notification constructor
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification('JW Original Songs Admin', {
              body: 'Notifications are now active for incoming messages.',
              icon: '/logo.png',
              badge: '/logo.png',
              vibrate: [200, 100, 200],
            });
          } catch (_) {
            try {
              new Notification('JW Original Songs Admin', {
                body: 'Notifications are now active for incoming messages.',
                icon: '/logo.png',
              });
            } catch (_) {}
          }
        } else {
          try {
            new Notification('JW Original Songs Admin', {
              body: 'Notifications are now active for incoming messages.',
              icon: '/logo.png',
            });
          } catch (_) {}
        }
        if (soundEnabledRef.current) playChime();
      } else if (perm === 'denied') {
        setNotifHelpType('denied');
        setNotifHelpModalOpen(true);
      }
    } catch (err) {
      console.error('Notification permission error:', err);
      setNotifHelpType('error');
      setNotifHelpModalOpen(true);
    }
  };

  const triggerNotification = useCallback((msg) => {
    try {
      const report = parseSongReport(msg);
      let title = 'New Feedback Message';
      let body = msg.message || 'A user submitted feedback.';

      if (report) {
        title = `Song Issue: ${report.songTitle}`;
        body = `Reported: ${report.issue}${report.note ? ' - ' + report.note : ''}`;
      } else if (msg.device_id) {
        title = `Message from User ${msg.device_id.slice(-4)}`;
      }

      const targetConvoId = msg.device_id || `anon_${msg.id}`;

      // 1. In-Dashboard Live Alert Banner
      setLiveToast({
        id: msg.id,
        title,
        body,
        convoId: targetConvoId,
      });

      // 2. Audible chime if sound is enabled
      if (soundEnabledRef.current) {
        playChime();
      }

      // 3. System Push / Service Worker notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/logo.png',
              badge: '/logo.png',
              vibrate: [200, 100, 200],
              tag: `feedback_${msg.id}`,
            });
          }).catch(() => {
            try {
              const notif = new Notification(title, {
                body,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: `feedback_${msg.id}`,
              });
              notif.onclick = () => {
                window.focus();
                setSelectedConvoId(targetConvoId);
              };
            } catch (_) {}
          });
        } else {
          try {
            const notif = new Notification(title, {
              body,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: `feedback_${msg.id}`,
            });
            notif.onclick = () => {
              window.focus();
              setSelectedConvoId(targetConvoId);
            };
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('Failed to trigger notification:', err);
    }
  }, []);

  const fetchConversations = useCallback(async (isInitial = false) => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const allFeedback = data || [];

      // Group by device_id or anon_id
      const convoMap = new Map();

      for (const item of allFeedback) {
        const rawDeviceId = item.device_id;
        const key = rawDeviceId ? rawDeviceId : `anon_${item.id}`;

        if (!convoMap.has(key)) {
          convoMap.set(key, {
            id: key,
            deviceId: rawDeviceId,
            isAnonymous: !rawDeviceId,
            title: '',
            latest: item.created_at,
            messages: [],
            hasReport: false,
            reportInfo: null,
            deviceMeta: item.device_meta || {},
          });
        }

        const convo = convoMap.get(key);
        convo.messages.push(item);

        const rep = parseSongReport(item);
        if (rep && !convo.hasReport) {
          convo.hasReport = true;
          convo.reportInfo = rep;
        }

        if (!convo.deviceMeta || Object.keys(convo.deviceMeta).length === 0) {
          convo.deviceMeta = item.device_meta || {};
        }
      }

      const readMap = getLocalReadMap();

      const list = Array.from(convoMap.values()).map((c) => {
        c.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const last = c.messages[c.messages.length - 1];

        if (c.hasReport && c.reportInfo) {
          c.title = c.reportInfo.songTitle ? `Report: ${c.reportInfo.songTitle}` : 'Song Report';
        } else if (c.deviceId) {
          c.title = `User ${c.deviceId.slice(-4)}`;
        } else {
          c.title = 'Anonymous Message';
        }

        c.lastMsg = last;
        c.latest = last?.created_at || c.latest;
        c.requiresAction = last ? !last.is_admin_reply : false;

        const readEntry = readMap[c.id];
        const lastReadMsgId = typeof readEntry === 'object' ? readEntry.lastMsgId : readEntry;
        const readTimestamp = typeof readEntry === 'object' ? readEntry.timestamp : null;
        const isReadLocally = Boolean(
          (lastReadMsgId && last?.id && lastReadMsgId === last.id) ||
          (readTimestamp && last?.created_at && new Date(readTimestamp) >= new Date(last.created_at))
        );

        c.isUnread = Boolean(
          last &&
          !last.is_admin_reply &&
          !last.is_read &&
          !isReadLocally
        );

        return c;
      });

      list.sort((a, b) => new Date(b.latest) - new Date(a.latest));
      setConversations(list);

      // Maintain selection or select first on desktop if available
      if (selectedConvoIdRef.current) {
        const found = list.find((c) => c.id === selectedConvoIdRef.current);
        if (found) {
          setMessages(found.messages);
          markConversationAsRead(found.id, found.messages, supabase);
        }
      } else if (isInitial && list.length > 0 && window.innerWidth > 768) {
        setSelectedConvoId(list[0].id);
        setMessages(list[0].messages);
        markConversationAsRead(list[0].id, list[0].messages, supabase);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time listener and window sync
  useEffect(() => {
    fetchConversations(true);

    const handleExternalUpdate = () => {
      fetchConversations(false);
    };

    window.addEventListener('admin_feedback_updated', handleExternalUpdate);
    window.addEventListener('storage', handleExternalUpdate);

    const channel = supabase
      .channel('admin_feedback_panel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feedback' },
        (payload) => {
          const newMsg = payload.new;

          if (!newMsg.is_admin_reply) {
            if (soundEnabledRef.current) {
              playChime();
            }
            triggerNotification(newMsg);
          }

          fetchConversations(false);

          const targetConvoId = newMsg.device_id || `anon_${newMsg.id}`;
          if (selectedConvoIdRef.current === targetConvoId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            markConversationAsRead(targetConvoId, [newMsg], supabase);
            setTimeout(() => {
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feedback' },
        () => {
          fetchConversations(false);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('admin_feedback_updated', handleExternalUpdate);
      window.removeEventListener('storage', handleExternalUpdate);
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, triggerNotification]);

  // Auto-dismiss live toast
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  const selectedConvo = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvoId) || null;
  }, [conversations, selectedConvoId]);

  const [selectedDeviceHasPush, setSelectedDeviceHasPush] = useState(false);

  useEffect(() => {
    if (!selectedConvo?.deviceId) {
      setSelectedDeviceHasPush(false);
      return;
    }
    supabase
      .from('device_push_tokens')
      .select('push_token')
      .eq('device_id', selectedConvo.deviceId)
      .maybeSingle()
      .then(({ data }) => {
        setSelectedDeviceHasPush(Boolean(data?.push_token));
      })
      .catch(() => setSelectedDeviceHasPush(false));
  }, [selectedConvo?.deviceId]);

  const handleSelect = (convo) => {
    setSelectedConvoId(convo.id);
    setMessages(convo.messages);
    convo.isUnread = false;
    markConversationAsRead(convo.id, convo.messages, supabase);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }, 50);
  };

  const handleBackToList = () => {
    setSelectedConvoId(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllConversationsAsRead(conversations, supabase);
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          isUnread: false,
          messages: c.messages.map((m) => (!m.is_admin_reply ? { ...m, is_read: true } : m)),
        }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const dispatchSupportReplyPush = async (targetDeviceId, replyMessage, reportInfo = null) => {
    if (!targetDeviceId || targetDeviceId.startsWith('anon_')) return;

    try {
      const { data: tokenData, error } = await supabase
        .from('device_push_tokens')
        .select('push_token')
        .eq('device_id', targetDeviceId)
        .maybeSingle();

      if (error || !tokenData?.push_token) return;

      const pushToken = tokenData.push_token;
      if (!pushToken.startsWith('ExponentPushToken[')) return;

      const title = reportInfo?.songTitle
        ? `Reply: ${reportInfo.songTitle}`
        : 'Support Reply';

      const payload = {
        to: pushToken,
        sound: 'default',
        title,
        body: replyMessage,
        channelId: 'announcements',
        priority: 'high',
        data: {
          screen: 'FeedbackScreen',
          type: 'support_reply',
          deviceId: targetDeviceId,
        },
      };

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (
        result?.data?.status === 'error' &&
        (result.data?.details?.error === 'DeviceNotRegistered' ||
          result.data?.message?.includes('DeviceNotRegistered'))
      ) {
        await supabase
          .from('device_push_tokens')
          .delete()
          .eq('push_token', pushToken);
        setSelectedDeviceHasPush(false);
      }
    } catch (err) {
      console.warn('[SupportPush] Failed to dispatch reply push:', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvo || sending) return;

    const text = replyText.trim();
    setSending(true);

    try {
      const targetDeviceId = selectedConvo.deviceId || selectedConvo.id;

      const { data, error } = await supabase.from('feedback').insert([
        {
          device_id: targetDeviceId,
          message: text,
          is_admin_reply: true,
          is_read: true,
        },
      ]).select();

      if (error) throw error;
      setReplyText('');

      // Send instant push notification to recipient's mobile device
      dispatchSupportReplyPush(targetDeviceId, text, selectedConvo.reportInfo);

      if (data && data[0]) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data[0].id)) return prev;
          return [...prev, data[0]];
        });
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }

      selectedConvo.requiresAction = false;
      selectedConvo.isUnread = false;
      await markConversationAsRead(selectedConvo.id, [...(selectedConvo.messages || []), ...(data || [])], supabase);

      fetchConversations();
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const copySongId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeFilter === 'needs_reply' && !c.requiresAction) return false;
      if (activeFilter === 'reports' && !c.hasReport) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesSong = c.reportInfo?.songTitle?.toLowerCase().includes(q);
        const matchesIssue = c.reportInfo?.issue?.toLowerCase().includes(q);
        const matchesDevice = c.deviceId?.toLowerCase().includes(q);
        const matchesMessage = c.messages.some((m) => m.message?.toLowerCase().includes(q));

        if (!matchesTitle && !matchesSong && !matchesIssue && !matchesDevice && !matchesMessage) {
          return false;
        }
      }

      return true;
    });
  }, [conversations, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: conversations.length,
      needs_reply: conversations.filter((c) => c.requiresAction).length,
      reports: conversations.filter((c) => c.hasReport).length,
    };
  }, [conversations]);

  return (
    <div className="admin-page" style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* Header Toolbar */}
      <div className="admin-page-header">
        <div>
          <h1>Feedback & Chat</h1>
          <p className="page-subtitle">
            Real-time feedback, user support chats, and reported song issues
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {notifPermission === 'granted' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '20px',
              fontSize: '11px',
              color: '#22c55e',
              fontWeight: '500',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              Notifications Active
            </div>
          ) : notifPermission === 'denied' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '20px',
              fontSize: '11px',
              color: '#f87171',
            }}>
              <BellOff size={13} />
              Blocked
            </div>
          ) : (
            <button
              onClick={requestNotificationPermission}
              className="btn-admin-primary"
              style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '20px' }}
            >
              <Bell size={13} />
              Enable Alerts
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute sound chime' : 'Enable sound chime'}
            className="btn-icon-admin"
            style={{ width: '32px', height: '32px', color: soundEnabled ? '#a78bfa' : undefined }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Mark All Read */}
          <button
            onClick={handleMarkAllRead}
            title="Mark all conversations as read"
            className="btn-icon-admin"
            style={{ width: '32px', height: '32px' }}
          >
            <CheckCheck size={15} />
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchConversations()}
            title="Refresh list"
            className="btn-icon-admin"
            style={{ width: '32px', height: '32px' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="feedback-layout">
        {/* Left Pane: Conversation List */}
        <div className={`feedback-sidebar ${selectedConvo ? 'hidden-mobile' : ''}`}>
          {/* Search Box & Filters */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #27272a' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '0 10px',
              gap: '6px',
              marginBottom: '10px',
            }}>
              <Search size={14} color="#8b5cf6" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px 0',
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 0 }}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Tabs matching Screen 4 in Reference */}
            <div className="admin-filter-bar">
              {[
                { key: 'all', label: `All (${counts.all})` },
                { key: 'needs_reply', label: `Needs Reply (${counts.needs_reply})` },
                { key: 'reports', label: `Song Reports (${counts.reports})` },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`admin-chip ${activeFilter === f.key ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List Scroll */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div className="admin-empty">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="admin-empty">
                {searchQuery ? 'No matching conversations' : 'No conversations in this section'}
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedConvoId === c.id;
                const lastMsg = c.lastMsg;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #1c1c1f',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #8b5cf6' : '3px solid transparent',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: c.hasReport ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      color: c.hasReport ? '#ef4444' : '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {c.hasReport ? <Flag size={16} /> : <User size={16} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '10px', color: '#71717a', flexShrink: 0 }}>
                          {new Date(c.latest).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      {/* Tag pill */}
                      {c.hasReport && c.reportInfo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '600',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                          }}>
                            {c.reportInfo.issue}
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                          {lastMsg ? (lastMsg.is_admin_reply ? 'You: ' + lastMsg.message : lastMsg.message) : 'No message'}
                        </div>
                      )}
                    </div>

                    {/* Unread / Needs Reply Indicator */}
                    {c.isUnread ? (
                      <span
                        title="Unread message"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#ec4899',
                          flexShrink: 0,
                          marginTop: '4px',
                          boxShadow: '0 0 6px rgba(236, 72, 153, 0.6)',
                        }}
                      />
                    ) : c.requiresAction ? (
                      <span
                        title="Awaiting your reply"
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: '#8b5cf6',
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Selected Conversation Thread */}
        <div className={`feedback-chat-panel ${!selectedConvo ? 'hidden-mobile' : 'visible-mobile'}`}>
          {selectedConvo ? (
            <>
              {/* Conversation Header with Back button on mobile */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #27272a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#111113',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  {/* Mobile Back Button */}
                  <button
                    onClick={handleBackToList}
                    className="btn-icon-admin"
                    style={{ width: '30px', height: '30px' }}
                    title="Back to conversations"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: selectedConvo.hasReport ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                    color: selectedConvo.hasReport ? '#ef4444' : '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {selectedConvo.hasReport ? <Flag size={15} /> : <User size={15} />}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedConvo.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {selectedConvo.deviceId ? (
                        <span>Device: {selectedConvo.deviceId.slice(-6)}</span>
                      ) : (
                        <span>Anonymous</span>
                      )}
                      {selectedConvo.deviceMeta?.os && (
                        <span>· {selectedConvo.deviceMeta.os.toUpperCase()}</span>
                      )}
                      {selectedDeviceHasPush && (
                        <span style={{
                          color: '#22c55e',
                          background: 'rgba(34, 197, 94, 0.12)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <Smartphone size={10} />
                          Push Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedConvo.requiresAction ? (
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', fontWeight: '600' }}>
                      Needs Reply
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontWeight: '600' }}>
                      Responded
                    </span>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {messages.map((m, idx) => {
                  const report = parseSongReport(m);
                  const isAdmin = m.is_admin_reply;

                  if (report) {
                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          background: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '12px',
                          padding: '14px',
                          maxWidth: '92%',
                          marginRight: 'auto',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <AlertCircle size={12} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#f87171' }}>
                              Song Issue Report
                            </span>
                          </div>
                          <span style={{ fontSize: '10px', color: '#71717a' }}>
                            {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Song Details */}
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Music size={14} color="#8b5cf6" />
                            {report.songTitle}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {report.songId && (
                              <>
                                <span style={{ fontSize: '11px', color: '#71717a' }}>ID:</span>
                                <code style={{ fontSize: '11px', color: '#a78bfa', background: '#09090b', padding: '1px 5px', borderRadius: '4px' }}>
                                  {report.songId.slice(0, 12)}...
                                </code>
                                <button
                                  onClick={() => copySongId(report.songId)}
                                  title="Copy Song ID"
                                  style={{ background: 'none', border: 'none', color: copiedId === report.songId ? '#22c55e' : '#71717a', cursor: 'pointer', padding: '2px' }}
                                >
                                  {copiedId === report.songId ? <Check size={12} /> : <Copy size={12} />}
                                </button>

                                <button
                                  onClick={() => navigate(`/admin?tab=songs&editSongId=${report.songId}`)}
                                  className="btn-admin-primary"
                                  style={{ padding: '3px 8px', fontSize: '11px' }}
                                >
                                  <Edit2 size={11} /> Edit Song
                                </button>
                              </>
                            )}
                          </div>

                          <div style={{ marginTop: '8px' }}>
                            <span style={{ fontSize: '11px', background: '#27272a', color: '#fafafa', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>
                              Issue: {report.issue}
                            </span>
                          </div>

                          {report.note && (
                            <div style={{ marginTop: '8px', padding: '8px 10px', background: '#09090b', borderLeft: '3px solid #ef4444', borderRadius: '4px', fontSize: '12px', color: '#a1a1aa' }}>
                              {report.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id || idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAdmin ? 'flex-end' : 'flex-start',
                        width: '100%',
                      }}
                    >
                      <div style={{
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        borderBottomRightRadius: isAdmin ? '3px' : '14px',
                        borderBottomLeftRadius: isAdmin ? '14px' : '3px',
                        background: isAdmin ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#18181b',
                        border: isAdmin ? '1px solid #8b5cf6' : '1px solid #27272a',
                        color: '#fff',
                      }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: isAdmin ? '#ddd6fe' : '#a78bfa',
                          marginBottom: '2px',
                        }}>
                          {isAdmin ? 'Admin Reply' : 'User'}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', fontSize: '13px' }}>
                          {m.message}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: isAdmin ? 'rgba(255,255,255,0.7)' : '#71717a',
                          marginTop: '4px',
                          textAlign: 'right',
                        }}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Reply Suggestions */}
              <div style={{
                padding: '6px 14px',
                background: '#09090b',
                borderTop: '1px solid #27272a',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '10px', color: '#71717a', alignSelf: 'center', whiteSpace: 'nowrap', fontWeight: '600' }}>
                  Quick reply:
                </span>
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setReplyText(qr);
                      inputRef.current?.focus();
                    }}
                    className="admin-template-btn"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Push delivery indicator note */}
              {selectedDeviceHasPush && (
                <div style={{
                  padding: '5px 14px',
                  background: 'rgba(34, 197, 94, 0.08)',
                  borderTop: '1px solid rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#4ade80',
                }}>
                  <Smartphone size={12} />
                  <span>Reply will trigger a Google FCM push notification popup on this user's phone.</span>
                </div>
              )}

              {/* Reply Form */}
              <form onSubmit={handleSend} style={{
                padding: '10px 14px',
                borderTop: '1px solid #27272a',
                display: 'flex',
                gap: '8px',
                background: '#111113',
                alignItems: 'center',
                flexShrink: 0,
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={selectedConvo.deviceId ? `Reply to User ${selectedConvo.deviceId.slice(-4)}...` : 'Type admin resolution or response...'}
                  className="admin-input"
                  style={{ borderRadius: '20px', padding: '8px 14px' }}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="btn-admin-primary"
                  style={{
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  title="Send reply"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            <div className="admin-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
                color: '#8b5cf6',
              }}>
                <MessageSquare size={22} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                Select a conversation
              </div>
              <p style={{ fontSize: '12px', color: '#71717a', maxWidth: '280px', margin: 0 }}>
                Choose a support chat or song issue report from the list to view the thread and respond.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating In-Dashboard Live Alert Toast */}
      {liveToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 150,
            maxWidth: '380px',
            width: 'calc(100% - 40px)',
            background: '#18181b',
            border: '1px solid #8b5cf6',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'adminSlideDown 0.25s ease',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={16} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>
              {liveToast.title}
            </div>
            <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 8px 0', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {liveToast.body}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const convo = conversations.find((c) => c.id === liveToast.convoId);
                  if (convo) {
                    handleSelect(convo);
                  } else {
                    setSelectedConvoId(liveToast.convoId);
                  }
                  setLiveToast(null);
                }}
                className="btn-admin-primary"
                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
              >
                View Message
              </button>
              <button
                onClick={() => setLiveToast(null)}
                className="btn-admin-secondary"
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            onClick={() => setLiveToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: '2px' }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Browser Notification Guidance Modal */}
      {notifHelpModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setNotifHelpModalOpen(false)}
        >
          <div
            className="admin-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              background: '#121215',
              border: '1px solid #27272a',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} color="#8b5cf6" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>
                  {notifHelpType === 'ios_pwa'
                    ? 'Enable Alerts on iPhone or iPad'
                    : notifHelpType === 'in_app_browser'
                    ? 'Open in External Browser'
                    : notifHelpType === 'denied'
                    ? 'Notifications Are Blocked'
                    : 'Device Notification Support'}
                </h3>
              </div>
              <button
                onClick={() => setNotifHelpModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {notifHelpType === 'ios_pwa' ? (
              <div>
                <p style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                  Apple iOS restricts browser push notifications when visiting via Safari tabs. To enable full alerts on your phone:
                </p>
                <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#fafafa', marginBottom: '8px' }}>
                    <strong>1.</strong> Tap the <strong>Share</strong> button at the bottom of Safari (square with arrow).
                  </div>
                  <div style={{ fontSize: '12px', color: '#fafafa', marginBottom: '8px' }}>
                    <strong>2.</strong> Scroll down and tap <strong>Add to Home Screen</strong>.
                  </div>
                  <div style={{ fontSize: '12px', color: '#fafafa' }}>
                    <strong>3.</strong> Open <strong>JW Songs Admin</strong> from your Home Screen. Push alerts will then work smoothly!
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '8px 10px', borderRadius: '6px' }}>
                  Live audio chime and in-dashboard banner alerts are currently active in this window.
                </div>
              </div>
            ) : notifHelpType === 'in_app_browser' ? (
              <div>
                <p style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                  You are currently viewing this page inside an in-app browser (such as Telegram or WhatsApp), which disables system notification permissions.
                </p>
                <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#fafafa', marginBottom: '6px' }}>
                    <strong>1.</strong> Tap the three dots menu at the top or bottom right.
                  </div>
                  <div style={{ fontSize: '12px', color: '#fafafa' }}>
                    <strong>2.</strong> Choose <strong>Open in Chrome</strong> or <strong>Open in Safari</strong>.
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: '#71717a', margin: 0 }}>
                  Once opened in your main browser, you will be able to enable alerts directly.
                </p>
              </div>
            ) : notifHelpType === 'denied' ? (
              <div>
                <p style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                  Notifications were previously denied or blocked for this site.
                </p>
                <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#fafafa', marginBottom: '6px' }}>
                    <strong>1.</strong> Tap the settings / tune icon beside the URL in your browser bar.
                  </div>
                  <div style={{ fontSize: '12px', color: '#fafafa', marginBottom: '6px' }}>
                    <strong>2.</strong> Tap <strong>Permissions</strong> or <strong>Notifications</strong>.
                  </div>
                  <div style={{ fontSize: '12px', color: '#fafafa' }}>
                    <strong>3.</strong> Change the setting to <strong>Allow</strong>.
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                  System push notifications are not exposed by this browser. However:
                </p>
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginBottom: '4px' }}>
                    Live In-App Alerts Are Active
                  </div>
                  <div style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: '1.4' }}>
                    Whenever a user sends a message or submits a song report, an audible chime plays and a notification toast appears at the top of your dashboard.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #27272a' }}>
              <button
                onClick={() => setNotifHelpModalOpen(false)}
                className="btn-admin-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
