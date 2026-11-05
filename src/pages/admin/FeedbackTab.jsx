import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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
  Smartphone,
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
} from 'lucide-react';

// Play sound chime using Web Audio API (smooth 2-tone chime without external dependencies)
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
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

    // Tone 2: A5 (880.00 Hz)
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

// Helper to parse song report metadata out of message text or JSONB meta
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

// Quick reply templates
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
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'needs_reply' | 'reports' | 'chats'

  // Notification and Sound settings
  const [notifPermission, setNotifPermission] = useState('default');
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

  // Initialize notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('unsupported');
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('admin_feedback_sound', String(next));
    } catch (_) {}
    if (next) playChime();
  };

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === 'granted') {
        new Notification('Notifications Enabled', {
          body: 'You will receive browser alerts for new user messages and song reports.',
          icon: '/favicon.ico',
        });
        if (soundEnabledRef.current) playChime();
      }
    } catch (err) {
      console.error('Failed to request notification permission:', err);
    }
  };

  const triggerNotification = useCallback((msg) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const report = parseSongReport(msg);
    let title = 'New User Message';
    let body = msg.message || 'New message received';

    if (report) {
      title = `Song Report: ${report.songTitle}`;
      body = `Issue: ${report.issue}${report.note ? ` - "${report.note}"` : ''}`;
    } else if (msg.device_id) {
      title = `Feedback from User ${msg.device_id.slice(-4)}`;
    }

    try {
      const notif = new Notification(title, {
        body: body.length > 130 ? body.slice(0, 127) + '...' : body,
        icon: '/favicon.ico',
        tag: msg.id || 'feedback_' + Date.now(),
      });

      notif.onclick = () => {
        window.focus();
        const targetConvoId = msg.device_id || ('anon_' + msg.id);
        setSelectedConvoId(targetConvoId);
        notif.close();
      };
    } catch (e) {
      console.error('Browser notification error:', e);
    }
  }, []);

  // Fetch all feedback and group into clean conversations
  const fetchConversations = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by thread
      // If msg.device_id is set -> group by device_id
      // If msg.device_id is null -> each report/message is its own thread: 'anon_' + msg.id
      const map = {};

      (data || []).forEach((msg) => {
        const convoId = msg.device_id || ('anon_' + msg.id);

        if (!map[convoId]) {
          const report = parseSongReport(msg);
          const isAnon = !msg.device_id || msg.device_id.startsWith('anon_');
          let title = '';
          if (report) {
            title = `Report: "${report.songTitle}"`;
          } else if (isAnon) {
            title = 'Anonymous Message';
          } else {
            title = `User ${msg.device_id.slice(-4)}`;
          }

          map[convoId] = {
            id: convoId,
            deviceId: isAnon ? null : msg.device_id,
            isAnonymous: isAnon,
            title,
            latest: msg.created_at,
            messages: [],
            hasReport: Boolean(report),
            reportInfo: report,
            deviceMeta: msg.device_meta || null,
          };
        }

        // Add message
        map[convoId].messages.unshift(msg);

        // Keep report info updated if found in any message
        const thisReport = parseSongReport(msg);
        if (thisReport && !map[convoId].hasReport) {
          map[convoId].hasReport = true;
          map[convoId].reportInfo = thisReport;
        }
        if (msg.device_meta && !map[convoId].deviceMeta) {
          map[convoId].deviceMeta = msg.device_meta;
        }
      });

      const list = Object.values(map).map((c) => {
        const lastMsg = c.messages[c.messages.length - 1];
        const requiresAction = lastMsg ? !lastMsg.is_admin_reply : false;
        return {
          ...c,
          lastMsg,
          requiresAction,
        };
      });

      list.sort((a, b) => new Date(b.latest) - new Date(a.latest));

      setConversations(list);
      setLoading(false);

      // Refresh currently selected conversation messages if active
      if (selectedConvoIdRef.current) {
        const active = list.find((c) => c.id === selectedConvoIdRef.current);
        if (active) {
          setMessages(active.messages);
        }
      }
    } catch (err) {
      console.error('Error fetching feedback conversations:', err);
      setLoading(false);
    }
  }, []);

  // Initial load & Supabase Realtime channel
  useEffect(() => {
    fetchConversations(true);

    const channel = supabase
      .channel('admin_feedback_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
        const newMsg = payload.new;
        if (!newMsg) return;

        // If message is from a user (not an admin reply):
        if (!newMsg.is_admin_reply) {
          if (soundEnabledRef.current) {
            playChime();
          }
          triggerNotification(newMsg);
        }

        // Re-fetch conversation list
        fetchConversations();

        // If the user currently has this thread open, append message smoothly
        const targetConvoId = newMsg.device_id || ('anon_' + newMsg.id);
        if (selectedConvoIdRef.current && (selectedConvoIdRef.current === targetConvoId || selectedConvoIdRef.current === newMsg.device_id)) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, triggerNotification]);

  // Selected conversation object
  const selectedConvo = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvoId) || null;
  }, [conversations, selectedConvoId]);

  // When selection changes
  const handleSelect = (convo) => {
    setSelectedConvoId(convo.id);
    setMessages(convo.messages);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      inputRef.current?.focus();
    }, 60);
  };

  // Send reply
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedConvo || sending) return;

    const text = replyText.trim();
    setSending(true);

    try {
      // Determine device_id to store:
      // If user has a real deviceId, use that so the mobile app receives it.
      // If it's an anonymous report thread (anon_xxx), store 'anon_' + msgId so it groups cleanly into this thread.
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

      if (data && data[0]) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data[0].id)) return prev;
          return [...prev, data[0]];
        });
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }

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

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Filter tab
      if (activeFilter === 'needs_reply' && !c.requiresAction) return false;
      if (activeFilter === 'reports' && !c.hasReport) return false;
      if (activeFilter === 'chats' && c.hasReport) return false;

      // Search query
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

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: conversations.length,
      needs_reply: conversations.filter((c) => c.requiresAction).length,
      reports: conversations.filter((c) => c.hasReport).length,
      chats: conversations.filter((c) => !c.hasReport).length,
    };
  }, [conversations]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      padding: '24px 32px',
      boxSizing: 'border-box',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#fff',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
            User Feedback & Chat
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9CA3AF' }}>
            Real-time feedback, user support chats, and reported song issues
          </p>
        </div>

        {/* Action Controls: Notifications, Sound, Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Notification Button */}
          {notifPermission === 'granted' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#34D399',
              fontWeight: '500',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#10B981', display: 'inline-block' }} />
              Notifications Active
              <button
                onClick={() => {
                  new Notification('JW Original Songs Admin', {
                    body: 'Test notification working properly!',
                    icon: '/favicon.ico',
                  });
                  if (soundEnabled) playChime();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6EE7B7',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginLeft: '4px',
                  padding: 0,
                }}
              >
                Test
              </button>
            </div>
          ) : notifPermission === 'denied' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#F87171',
            }}>
              <BellOff size={14} />
              Notifications Blocked in Browser
            </div>
          ) : (
            <button
              onClick={requestNotificationPermission}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: '#8B5CF6',
                border: 'none',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#7C3AED')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#8B5CF6')}
            >
              <Bell size={14} />
              Enable Browser Notifications
            </button>
          )}

          {/* Sound Chime Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute chime' : 'Enable chime'}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: soundEnabled ? '#2d293b' : '#1f1d2b',
              border: '1px solid #3d3752',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: soundEnabled ? '#A78BFA' : '#6B7280',
              cursor: 'pointer',
            }}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchConversations()}
            title="Refresh conversations"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#2d293b',
              border: '1px solid #3d3752',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div style={{
        display: 'flex',
        flex: 1,
        gap: '20px',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left Pane: Conversation List & Filters */}
        <div style={{
          width: '360px',
          background: '#17151f',
          border: '1px solid #2d293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Search Box */}
          <div style={{ padding: '16px 16px 12px 16px', borderBottom: '1px solid #2d293b' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0d0c11',
              border: '1px solid #2d293b',
              borderRadius: '10px',
              padding: '0 12px',
              gap: '8px',
            }}>
              <Search size={15} color="#9CA3AF" />
              <input
                type="text"
                placeholder="Search conversations or songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  padding: '10px 0',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'needs_reply', label: 'Needs Reply', count: counts.needs_reply, highlight: true },
                { key: 'reports', label: 'Song Reports', count: counts.reports },
                { key: 'chats', label: 'User Chats', count: counts.chats },
              ].map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? '#8B5CF6' : '#221f2e',
                      color: isActive ? '#fff' : '#9CA3AF',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {f.label}
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#2d293b',
                      fontSize: '10px',
                      color: isActive ? '#fff' : f.highlight && f.count > 0 ? '#F87171' : '#9CA3AF',
                    }}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
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
                      padding: '14px 16px',
                      borderBottom: '1px solid #232030',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #8B5CF6' : '3px solid transparent',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#1e1c2b';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: c.hasReport
                        ? 'linear-gradient(135deg, #F43F5E, #FB923C)'
                        : 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '13px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}>
                      {c.hasReport ? <Flag size={18} /> : <User size={18} />}
                    </div>

                    {/* Meta & snippet */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '190px',
                        }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', flexShrink: 0 }}>
                          {new Date(c.latest).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      {/* Snippet / Issue badge */}
                      {c.hasReport && c.reportInfo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(244, 63, 94, 0.15)',
                            color: '#FB7185',
                            border: '1px solid rgba(244, 63, 94, 0.25)',
                          }}>
                            {c.reportInfo.issue}
                          </span>
                        </div>
                      ) : (
                        <div style={{
                          fontSize: '12px',
                          color: '#9CA3AF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '4px',
                        }}>
                          {lastMsg ? (lastMsg.is_admin_reply ? 'You: ' + lastMsg.message : lastMsg.message) : 'No message'}
                        </div>
                      )}

                      {/* Footer tags */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#6B7280' }}>
                        {c.deviceMeta?.os && (
                          <span style={{ textTransform: 'capitalize' }}>
                            {c.deviceMeta.os === 'android' ? 'Android' : c.deviceMeta.os === 'ios' ? 'iOS' : c.deviceMeta.os}
                          </span>
                        )}
                        <span>{c.messages.length} msg{c.messages.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>

                    {/* Unread / Needs Action Indicator */}
                    {c.requiresAction && (
                      <div
                        title="Needs reply"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '4px',
                          background: '#EC4899',
                          boxShadow: '0 0 8px #EC4899',
                          marginTop: '6px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Conversation & Messages */}
        <div style={{
          flex: 1,
          background: '#17151f',
          border: '1px solid #2d293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid #2d293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#13111b',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: selectedConvo.hasReport
                      ? 'linear-gradient(135deg, #F43F5E, #FB923C)'
                      : 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}>
                    {selectedConvo.hasReport ? <Flag size={18} /> : <MessageSquare size={18} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedConvo.title}
                      {selectedConvo.hasReport && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(244, 63, 94, 0.15)',
                          color: '#FDA4AF',
                          fontWeight: '600',
                        }}>
                          Song Report
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                      {selectedConvo.deviceId ? (
                        <span>Device ID: <code style={{ color: '#C4B5FD', background: '#252136', padding: '1px 5px', borderRadius: '4px' }}>{selectedConvo.deviceId}</code></span>
                      ) : (
                        <span>Anonymous User Report</span>
                      )}
                      {selectedConvo.deviceMeta?.os && (
                        <span>Platform: <strong style={{ color: '#E5E7EB' }}>{selectedConvo.deviceMeta.os.toUpperCase()}</strong> {selectedConvo.deviceMeta.version ? `(v${selectedConvo.deviceMeta.version})` : ''}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status chip */}
                <div>
                  {selectedConvo.requiresAction ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(236, 72, 153, 0.12)',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#F472B6',
                    }}>
                      <Clock size={13} />
                      Awaiting Response
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#34D399',
                    }}>
                      <CheckCircle2 size={13} />
                      Responded
                    </span>
                  )}
                </div>
              </div>

              {/* Chat Message Scrollable View */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                {messages.map((m, idx) => {
                  const report = parseSongReport(m);
                  const isAdmin = m.is_admin_reply;

                  // Render Song Report as a rich card
                  if (report) {
                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          background: 'linear-gradient(180deg, #221c2c 0%, #1a1624 100%)',
                          border: '1px solid #3d2f4d',
                          borderRadius: '14px',
                          padding: '18px 20px',
                          maxWidth: '85%',
                          marginRight: 'auto',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: '#F43F5E',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}>
                              <AlertCircle size={15} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#FDA4AF' }}>
                              Song Issue Report
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                            {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Song Details */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '17px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Music size={18} color="#A78BFA" />
                            {report.songTitle}
                          </div>
                          {report.songId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Song ID:</span>
                              <code style={{ fontSize: '11px', color: '#C4B5FD', background: '#0d0c11', padding: '2px 6px', borderRadius: '4px' }}>
                                {report.songId}
                              </code>
                              <button
                                onClick={() => copySongId(report.songId)}
                                title="Copy Song ID"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: copiedId === report.songId ? '#34D399' : '#9CA3AF',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '2px',
                                }}
                              >
                                {copiedId === report.songId ? <Check size={13} /> : <Copy size={13} />}
                              </button>

                              {/* Quick Action: Open Song Editor directly */}
                              <button
                                onClick={() => navigate(`/admin?tab=songs&editSongId=${report.songId}`)}
                                title="Open this song in editor to fix issues"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  background: '#8B5CF6',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  marginLeft: '4px',
                                  transition: 'background 0.15s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#7C3AED')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#8B5CF6')}
                              >
                                <Edit2 size={12} />
                                Edit Song in Dashboard
                              </button>
                            </div>
                          )}
                          {!report.songId && report.songTitle && (
                            <div style={{ marginTop: '6px' }}>
                              <button
                                onClick={() => navigate(`/admin?tab=songs&search=${encodeURIComponent(report.songTitle)}`)}
                                title="Find this song in songs tab"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  background: '#2d293b',
                                  border: '1px solid #3d3752',
                                  borderRadius: '6px',
                                  color: '#C4B5FD',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                <Search size={12} />
                                Search Song in Dashboard
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Issue Badge */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'rgba(251, 146, 60, 0.15)',
                          border: '1px solid rgba(251, 146, 60, 0.3)',
                          color: '#FDBA74',
                          fontSize: '13px',
                          fontWeight: '600',
                          marginBottom: report.note ? '12px' : '4px',
                        }}>
                          Issue: {report.issue}
                        </div>

                        {/* User Note if present */}
                        {report.note && (
                          <div style={{
                            background: '#120f1a',
                            borderLeft: '3px solid #F43F5E',
                            padding: '10px 14px',
                            borderRadius: '0 8px 8px 0',
                            fontSize: '13px',
                            color: '#E5E7EB',
                            lineHeight: '1.5',
                            marginTop: '8px',
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', marginBottom: '2px' }}>
                              User Note:
                            </div>
                            {report.note}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Render normal messages
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
                        maxWidth: '75%',
                        padding: '12px 18px',
                        borderRadius: '18px',
                        borderBottomRightRadius: isAdmin ? '4px' : '18px',
                        borderBottomLeftRadius: isAdmin ? '18px' : '4px',
                        background: isAdmin ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#262235',
                        border: isAdmin ? '1px solid #8B5CF6' : '1px solid #37314d',
                        color: '#fff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: isAdmin ? '#DDD6FE' : '#A78BFA',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          {isAdmin ? (
                            <>
                              <Sparkles size={12} />
                              Admin Reply
                            </>
                          ) : (
                            <>
                              <User size={12} />
                              {selectedConvo.deviceId ? `User ${selectedConvo.deviceId.slice(-4)}` : 'User'}
                            </>
                          )}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '14px' }}>
                          {m.message}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: isAdmin ? 'rgba(255,255,255,0.65)' : '#9CA3AF',
                          marginTop: '6px',
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
                padding: '8px 20px',
                background: '#13111b',
                borderTop: '1px solid #232030',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '11px', color: '#6B7280', alignSelf: 'center', whiteSpace: 'nowrap', fontWeight: '500' }}>
                  Quick reply:
                </span>
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setReplyText(qr);
                      inputRef.current?.focus();
                    }}
                    style={{
                      background: '#1e1c2b',
                      border: '1px solid #322d42',
                      borderRadius: '16px',
                      color: '#C4B5FD',
                      fontSize: '11px',
                      padding: '4px 12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2a263c')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#1e1c2b')}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input Form — Never disabled */}
              <form onSubmit={handleSend} style={{
                padding: '16px 20px',
                borderTop: '1px solid #2d293b',
                display: 'flex',
                gap: '12px',
                background: '#0d0c11',
                alignItems: 'center',
                flexShrink: 0,
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={selectedConvo.deviceId ? `Reply to User ${selectedConvo.deviceId.slice(-4)}...` : 'Type admin resolution or response...'}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    background: '#17151f',
                    border: '1px solid #2d293b',
                    borderRadius: '24px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border 0.2s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#8B5CF6')}
                  onBlur={(e) => (e.target.style.borderColor = '#2d293b')}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  style={{
                    background: replyText.trim() && !sending ? '#8B5CF6' : '#2d293b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '24px',
                    width: '46px',
                    height: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: replyText.trim() && !sending ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    boxShadow: replyText.trim() ? '0 2px 10px rgba(139, 92, 246, 0.4)' : 'none',
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              padding: '40px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: '#1f1d2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: '#8B5CF6',
              }}>
                <MessageSquare size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: '0 0 8px 0' }}>
                Select a conversation
              </h3>
              <p style={{ fontSize: '13px', maxWidth: '320px', margin: 0 }}>
                Choose a user chat or song report from the sidebar to inspect details, send replies, or mark resolved.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
