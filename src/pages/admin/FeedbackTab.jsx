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
        new Notification('JW Original Songs Admin', {
          body: 'Notifications active for new user feedback and song reports.',
          icon: '/favicon.ico',
        });
        if (soundEnabledRef.current) playChime();
      }
    } catch (err) {
      console.error('Notification error:', err);
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

  // Fetch feedback and organize into clean ticket threads
  const fetchConversations = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
            title = 'Anonymous User Report';
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

        map[convoId].messages.unshift(msg);

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

      if (selectedConvoIdRef.current) {
        const active = list.find((c) => c.id === selectedConvoIdRef.current);
        if (active) {
          setMessages(active.messages);
        }
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setLoading(false);
    }
  }, []);

  // Supabase Realtime channel
  useEffect(() => {
    fetchConversations(true);

    const channel = supabase
      .channel('admin_feedback_panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
        const newMsg = payload.new;
        if (!newMsg) return;

        if (!newMsg.is_admin_reply) {
          if (soundEnabledRef.current) playChime();
          triggerNotification(newMsg);
        }

        fetchConversations();

        const targetConvoId = newMsg.device_id || ('anon_' + newMsg.id);
        if (selectedConvoIdRef.current && (selectedConvoIdRef.current === targetConvoId || selectedConvoIdRef.current === newMsg.device_id)) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, triggerNotification]);

  const selectedConvo = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvoId) || null;
  }, [conversations, selectedConvoId]);

  const handleSelect = (convo) => {
    setSelectedConvoId(convo.id);
    setMessages(convo.messages);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      inputRef.current?.focus();
    }, 60);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
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

      if (data && data[0]) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data[0].id)) return prev;
          return [...prev, data[0]];
        });
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
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

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeFilter === 'needs_reply' && !c.requiresAction) return false;
      if (activeFilter === 'reports' && !c.hasReport) return false;
      if (activeFilter === 'chats' && c.hasReport) return false;

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
      chats: conversations.filter((c) => !c.hasReport).length,
    };
  }, [conversations]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      minHeight: 0,
      padding: '20px 24px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      color: '#fff',
    }}>
      {/* Tab Header Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexShrink: 0,
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, letterSpacing: '-0.3px' }}>
            User Feedback & Reports
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>
            Two-way user support chats and reported song issue tickets
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
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              fontSize: '11px',
              color: '#34D399',
              fontWeight: '500',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '3px', background: '#10B981' }} />
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
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '20px',
              fontSize: '11px',
              color: '#F87171',
            }}>
              <BellOff size={13} />
              Notifications Blocked in Browser
            </div>
          ) : (
            <button
              onClick={requestNotificationPermission}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#8B5CF6',
                border: 'none',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <Bell size={13} />
              Enable Browser Notifications
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute sound chime' : 'Enable sound chime'}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: soundEnabled ? '#1e1a2c' : '#14121c',
              border: '1px solid #2d263e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: soundEnabled ? '#A78BFA' : '#6B7280',
              cursor: 'pointer',
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchConversations()}
            title="Refresh list"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#1a1626',
              border: '1px solid #2d263e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Responsive Split Workspace */}
      <div style={{
        display: 'flex',
        flex: 1,
        gap: '16px',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left Pane: Conversations & Filter */}
        <div style={{
          width: 'clamp(270px, 30%, 330px)',
          background: '#12101a',
          border: '1px solid #231f30',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Search Box */}
          <div style={{ padding: '12px 14px 10px 14px', borderBottom: '1px solid #231f30' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0a0910',
              border: '1px solid #231f30',
              borderRadius: '8px',
              padding: '0 10px',
              gap: '6px',
            }}>
              <Search size={14} color="#8B5CF6" />
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
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'needs_reply', label: 'Needs Reply', count: counts.needs_reply, highlight: true },
                { key: 'reports', label: 'Reports', count: counts.reports },
                { key: 'chats', label: 'Chats', count: counts.chats },
              ].map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? '#8B5CF6' : '#1a1626',
                      color: isActive ? '#fff' : '#9CA3AF',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {f.label}
                    <span style={{
                      padding: '1px 5px',
                      borderRadius: '8px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#262035',
                      fontSize: '9px',
                      color: isActive ? '#fff' : f.highlight && f.count > 0 ? '#F87171' : '#9CA3AF',
                    }}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation List Scroll */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#6B7280', fontSize: '12px' }}>
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
                      borderBottom: '1px solid #1c1827',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(139, 92, 246, 0.16)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #8B5CF6' : '3px solid transparent',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#171322';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: c.hasReport ? 'linear-gradient(135deg, #F43F5E, #FB923C)' : 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#fff',
                    }}>
                      {c.hasReport ? <Flag size={15} /> : <User size={15} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6B7280', flexShrink: 0 }}>
                          {new Date(c.latest).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      {c.hasReport && c.reportInfo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '600',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(244, 63, 94, 0.15)',
                            color: '#FB7185',
                          }}>
                            {c.reportInfo.issue}
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                          {lastMsg ? (lastMsg.is_admin_reply ? 'You: ' + lastMsg.message : lastMsg.message) : 'No message'}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#6B7280' }}>
                        {c.deviceMeta?.os && (
                          <span style={{ textTransform: 'capitalize' }}>
                            {c.deviceMeta.os === 'android' ? 'Android' : c.deviceMeta.os}
                          </span>
                        )}
                        <span>{c.messages.length} msg{c.messages.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>

                    {c.requiresAction && (
                      <div
                        title="Needs reply"
                        style={{ width: '7px', height: '7px', borderRadius: '4px', background: '#EC4899', marginTop: '4px', flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Selected Conversation & Ticket View */}
        <div style={{
          flex: 1,
          background: '#12101a',
          border: '1px solid #231f30',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {selectedConvo ? (
            <>
              {/* Header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid #231f30',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#0e0c16',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: selectedConvo.hasReport ? 'linear-gradient(135deg, #F43F5E, #FB923C)' : 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}>
                    {selectedConvo.hasReport ? <Flag size={16} /> : <MessageSquare size={16} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{selectedConvo.title}</span>
                      {selectedConvo.hasReport && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.15)', color: '#FDA4AF', fontWeight: '600' }}>
                          Song Report
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
                      {selectedConvo.deviceId ? (
                        <span>Device: <code style={{ color: '#C4B5FD', background: '#1e1a2c', padding: '1px 4px', borderRadius: '3px' }}>{selectedConvo.deviceId}</code></span>
                      ) : (
                        <span>Anonymous Report</span>
                      )}
                      {selectedConvo.deviceMeta?.os && (
                        <span>Platform: <strong style={{ color: '#E5E7EB' }}>{selectedConvo.deviceMeta.os.toUpperCase()}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {selectedConvo.requiresAction ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.3)', fontSize: '11px', fontWeight: '600', color: '#F472B6' }}>
                      <Clock size={12} /> Awaiting Reply
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '11px', fontWeight: '500', color: '#34D399' }}>
                      <CheckCircle2 size={12} /> Responded
                    </span>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                {messages.map((m, idx) => {
                  const report = parseSongReport(m);
                  const isAdmin = m.is_admin_reply;

                  if (report) {
                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          background: 'linear-gradient(180deg, #1b1626 0%, #15111f 100%)',
                          border: '1px solid #332845',
                          borderRadius: '12px',
                          padding: '16px',
                          maxWidth: '92%',
                          marginRight: 'auto',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: '#F43F5E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <AlertCircle size={13} />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#FDA4AF' }}>
                              Song Issue Report
                            </span>
                          </div>
                          <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                            {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Song Details */}
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Music size={16} color="#A78BFA" />
                            {report.songTitle}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {report.songId && (
                              <>
                                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Song ID:</span>
                                <code style={{ fontSize: '11px', color: '#C4B5FD', background: '#0a0910', padding: '1px 5px', borderRadius: '4px' }}>
                                  {report.songId}
                                </code>
                                <button
                                  onClick={() => copySongId(report.songId)}
                                  title="Copy Song ID"
                                  style={{ background: 'none', border: 'none', color: copiedId === report.songId ? '#34D399' : '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                                >
                                  {copiedId === report.songId ? <Check size={12} /> : <Copy size={12} />}
                                </button>

                                <button
                                  onClick={() => navigate(`/admin?tab=songs&editSongId=${report.songId}`)}
                                  title="Open song in editor to fix issue"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 8px',
                                    background: '#8B5CF6',
                                    border: 'none',
                                    borderRadius: '5px',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    marginLeft: '4px',
                                  }}
                                >
                                  <Edit2 size={11} />
                                  Edit Song in Dashboard
                                </button>
                              </>
                            )}

                            {!report.songId && report.songTitle && (
                              <button
                                onClick={() => navigate(`/admin?tab=songs&search=${encodeURIComponent(report.songTitle)}`)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  background: '#252033',
                                  border: '1px solid #3c3352',
                                  borderRadius: '5px',
                                  color: '#C4B5FD',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                <Search size={11} />
                                Find Song in Dashboard
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Issue Pill */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(251, 146, 60, 0.14)',
                          border: '1px solid rgba(251, 146, 60, 0.28)',
                          color: '#FDBA74',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: report.note ? '10px' : '0',
                        }}>
                          Issue: {report.issue}
                        </div>

                        {report.note && (
                          <div style={{
                            background: '#0d0b13',
                            borderLeft: '3px solid #F43F5E',
                            padding: '8px 12px',
                            borderRadius: '0 6px 6px 0',
                            fontSize: '12px',
                            color: '#E5E7EB',
                            lineHeight: '1.4',
                            marginTop: '8px',
                          }}>
                            <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', marginBottom: '2px' }}>
                              User Note:
                            </div>
                            {report.note}
                          </div>
                        )}
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
                        padding: '10px 16px',
                        borderRadius: '16px',
                        borderBottomRightRadius: isAdmin ? '4px' : '16px',
                        borderBottomLeftRadius: isAdmin ? '16px' : '4px',
                        background: isAdmin ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#211c2e',
                        border: isAdmin ? '1px solid #8B5CF6' : '1px solid #2d263e',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: isAdmin ? '#DDD6FE' : '#A78BFA',
                          marginBottom: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}>
                          {isAdmin ? (
                            <>
                              <Sparkles size={11} /> Admin Reply
                            </>
                          ) : (
                            <>
                              <User size={11} /> User
                            </>
                          )}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.45', fontSize: '13px' }}>
                          {m.message}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: isAdmin ? 'rgba(255,255,255,0.6)' : '#9CA3AF',
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
                padding: '6px 16px',
                background: '#0d0b13',
                borderTop: '1px solid #1c1827',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '10px', color: '#6B7280', alignSelf: 'center', whiteSpace: 'nowrap', fontWeight: '500' }}>
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
                      background: '#191524',
                      border: '1px solid #292238',
                      borderRadius: '12px',
                      color: '#C4B5FD',
                      fontSize: '11px',
                      padding: '3px 10px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input Form — Never disabled */}
              <form onSubmit={handleSend} style={{
                padding: '12px 16px',
                borderTop: '1px solid #231f30',
                display: 'flex',
                gap: '10px',
                background: '#0a0910',
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
                    padding: '10px 16px',
                    background: '#14111d',
                    border: '1px solid #282136',
                    borderRadius: '20px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#8B5CF6')}
                  onBlur={(e) => (e.target.style.borderColor = '#282136')}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  style={{
                    background: replyText.trim() && !sending ? '#8B5CF6' : '#231f30',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '20px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: replyText.trim() && !sending ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                  }}
                >
                  <Send size={16} />
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
              padding: '30px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#171322',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                color: '#8B5CF6',
              }}>
                <MessageSquare size={28} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', margin: '0 0 6px 0' }}>
                Select a conversation
              </h3>
              <p style={{ fontSize: '12px', maxWidth: '300px', margin: 0 }}>
                Choose a user chat or song issue report from the sidebar to inspect details and send responses.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
