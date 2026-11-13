import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Send,
  Trash2,
  Megaphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Copy,
  Smartphone,
  Music,
  Users,
  Filter,
} from 'lucide-react';

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [songs, setSongs] = useState([]);
  const [latestAppVersion, setLatestAppVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaningTokens, setCleaningTokens] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [deviceCount, setDeviceCount] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    message: '',
    link_url: '',
    target_audience: 'all',
    song_id: '',
  });

  useEffect(() => {
    fetchNotifications();
    fetchDeviceCount();
    fetchSongs();
    fetchLatestVersion();
  }, []);

  const fetchSongs = async () => {
    try {
      const { data } = await supabase
        .from('songs')
        .select('id, title, song_number')
        .order('song_number', { ascending: true });
      if (data) setSongs(data);
    } catch (_) {}
  };

  const fetchLatestVersion = async () => {
    try {
      const { data } = await supabase
        .from('app_version_config')
        .select('latest_version')
        .eq('platform', 'android')
        .limit(1)
        .maybeSingle();
      if (data?.latest_version) setLatestAppVersion(data.latest_version);
    } catch (_) {}
  };

  const fetchDeviceCount = async () => {
    try {
      const { count, error } = await supabase
        .from('device_push_tokens')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) {
        setDeviceCount(count);
      }
    } catch (_) {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanInactive = async () => {
    if (!confirm('Remove device tokens that have been inactive for over 90 days?')) return;
    setCleaningTokens(true);
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('device_push_tokens')
        .delete()
        .lt('last_active_at', ninetyDaysAgo);

      if (error && error.code === '42703') {
        await supabase
          .from('device_push_tokens')
          .delete()
          .lt('updated_at', ninetyDaysAgo);
      }
      setSuccessMsg('Inactive tokens cleaned successfully.');
      fetchDeviceCount();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to clean inactive tokens');
    } finally {
      setCleaningTokens(false);
    }
  };

  const dispatchExpoPush = async (title, message, linkUrl, songId, audience = 'all') => {
    try {
      let query = supabase
        .from('device_push_tokens')
        .select('push_token, app_version, last_active_at');

      if (audience === 'active_30d') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_active_at', thirtyDaysAgo);
      } else if (audience === 'outdated' && latestAppVersion) {
        query = query.neq('app_version', latestAppVersion);
      }

      const { data: tokens, error } = await query;

      if (error || !tokens || tokens.length === 0) return 0;

      const pushMessages = tokens
        .filter((t) => t.push_token && t.push_token.startsWith('ExponentPushToken['))
        .map((t) => ({
          to: t.push_token,
          sound: 'default',
          title,
          body: message,
          channelId: 'announcements',
          priority: 'high',
          data: {
            link_url: linkUrl || null,
            song_id: songId || null,
          },
        }));

      if (pushMessages.length === 0) return 0;

      const invalidTokens = [];

      for (let i = 0; i < pushMessages.length; i += 100) {
        const chunk = pushMessages.slice(i, i + 100);
        try {
          const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chunk),
          });
          const result = await res.json();
          if (result?.data && Array.isArray(result.data)) {
            result.data.forEach((ticket, idx) => {
              if (
                ticket.status === 'error' &&
                (ticket.details?.error === 'DeviceNotRegistered' ||
                  ticket.message?.includes('DeviceNotRegistered'))
              ) {
                invalidTokens.push(chunk[idx].to);
              }
            });
          }
        } catch (postErr) {
          console.warn('[ExpoPush] Chunk send error:', postErr);
        }
      }

      // Automatically purge unregistered/uninstalled tokens
      if (invalidTokens.length > 0) {
        try {
          await supabase
            .from('device_push_tokens')
            .delete()
            .in('push_token', invalidTokens);
          fetchDeviceCount();
        } catch (_) {}
      }

      return pushMessages.length;
    } catch (err) {
      console.warn('[ExpoPush] Broadcast error:', err);
      return 0;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      setErrorMsg('Title and Message are required');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const record = {
        title: form.title.trim(),
        message: form.message.trim(),
        link_url: form.link_url ? form.link_url.trim() : null,
        target_audience: form.target_audience || 'all',
        song_id: form.song_id || null,
      };

      const { error } = await supabase
        .from('app_notifications')
        .insert([record]);

      // Fallback if target_audience or song_id columns do not exist yet
      if (error && error.code === '42703') {
        const { error: fallbackErr } = await supabase
          .from('app_notifications')
          .insert([{
            title: form.title.trim(),
            message: form.message.trim(),
            link_url: form.link_url ? form.link_url.trim() : null,
          }]);
        if (fallbackErr) throw fallbackErr;
      } else if (error) {
        throw error;
      }

      // Broadcast directly to registered Google FCM / Expo Push devices
      const pushedCount = await dispatchExpoPush(
        form.title.trim(),
        form.message.trim(),
        form.link_url?.trim(),
        form.song_id || null,
        form.target_audience || 'all'
      );
      const pushNote = pushedCount > 0 ? ` (Delivered to ${pushedCount} mobile device(s))` : '';

      setSuccessMsg(`Notification sent successfully!${pushNote}`);
      setForm({
        title: '',
        message: '',
        link_url: '',
        target_audience: 'all',
        song_id: '',
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send notification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notification? It will be removed from users immediately.')) return;

    try {
      const { error } = await supabase
        .from('app_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      console.error(err);
      alert('Failed to delete notification');
    }
  };

  const handleResend = async (notif) => {
    if (!confirm(`Resend notification "${notif.title}" now?`)) return;

    setResendingId(notif.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const record = {
        title: notif.title.trim(),
        message: notif.message.trim(),
        link_url: notif.link_url ? notif.link_url.trim() : null,
        target_audience: notif.target_audience || 'all',
        song_id: notif.song_id || null,
      };

      const { error } = await supabase
        .from('app_notifications')
        .insert([record]);

      if (error && error.code === '42703') {
        await supabase
          .from('app_notifications')
          .insert([{
            title: notif.title.trim(),
            message: notif.message.trim(),
            link_url: notif.link_url ? notif.link_url.trim() : null,
          }]);
      } else if (error) {
        throw error;
      }

      // Broadcast directly to registered Google FCM / Expo Push devices
      const pushedCount = await dispatchExpoPush(
        notif.title.trim(),
        notif.message.trim(),
        notif.link_url?.trim(),
        notif.song_id || null,
        notif.target_audience || 'all'
      );
      const pushNote = pushedCount > 0 ? ` (Delivered to ${pushedCount} mobile device(s))` : '';

      setSuccessMsg(`Notification "${notif.title}" resent successfully!${pushNote}`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to resend notification');
    } finally {
      setResendingId(null);
    }
  };

  const handleReuse = (notif) => {
    setForm({
      title: notif.title || '',
      message: notif.message || '',
      link_url: notif.link_url || '',
      target_audience: notif.target_audience || 'all',
      song_id: notif.song_id || '',
    });
    setSuccessMsg(`Loaded "${notif.title}" into composer. You can edit and send.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Push Notifications</h1>
          <p className="page-subtitle">Send in-app announcements and updates to all users</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '6px 14px',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#a78bfa',
            fontWeight: '600',
          }}>
            <Smartphone size={14} color="#8b5cf6" />
            <span>
              {deviceCount !== null
                ? `${deviceCount} Registered Device${deviceCount === 1 ? '' : 's'}`
                : 'Checking devices...'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCleanInactive}
            disabled={cleaningTokens}
            className="btn-admin-secondary"
            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '20px', gap: '5px' }}
            title="Clean up tokens inactive for >90 days to keep your device count accurate"
          >
            <Trash2 size={12} />
            <span>{cleaningTokens ? 'Cleaning...' : 'Clean Inactive'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="admin-alert error">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="admin-alert success">
          <CheckCircle2 size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Side-by-side on desktop, stacked on mobile */}
      <div className="notifications-grid">
        {/* Composer Card */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Megaphone size={16} color="#8b5cf6" />
            <h2 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', margin: 0 }}>
              Compose Message
            </h2>
          </div>

          {/* Quick Templates */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', color: '#71717a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Quick Templates
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setForm({
                  title: 'Thinking of you',
                  message: 'Hope your week is going well. Whenever you need a peaceful moment, your favorite Kingdom songs are here to encourage you.',
                  link_url: '',
                })}
                className="admin-template-btn"
              >
                7-Day Warm Check-in
              </button>
              <button
                type="button"
                onClick={() => setForm({
                  title: 'A gentle melody for your heart',
                  message: 'Take a peaceful moment today. An uplifting song can bring comfort and strength during a busy week.',
                  link_url: '',
                })}
                className="admin-template-btn"
              >
                14-Day Warm Check-in
              </button>
              <button
                type="button"
                onClick={() => setForm({
                  title: 'How was the meeting today?',
                  message: 'Hope you had an encouraging meeting! Relax this evening with an uplifting song.',
                  link_url: '',
                })}
                className="admin-template-btn pink"
              >
                Sunday Reflection
              </button>
            </div>
          </div>

          <form onSubmit={handleSend}>
            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New Songs Added"
                className="admin-input"
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Message *</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe the update or announcement..."
                className="admin-textarea"
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Link URL (Optional)</label>
              <input
                type="url"
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://..."
                className="admin-input"
              />
              <p style={{ fontSize: '11px', color: '#71717a', margin: '4px 0 0 0' }}>
                Makes the notification clickable to open an external website.
              </p>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={12} color="#8b5cf6" />
                <span>Target Audience</span>
              </label>
              <select
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                className="admin-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="all">All Registered Devices</option>
                <option value="active_30d">Active Devices (Last 30 Days)</option>
                <option value="outdated">
                  Outdated App Versions {latestAppVersion ? `(< v${latestAppVersion})` : ''}
                </option>
              </select>
              <p style={{ fontSize: '11px', color: '#71717a', margin: '4px 0 0 0' }}>
                Filter push recipients by activity or installed version.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Music size={12} color="#8b5cf6" />
                <span>Attach Song (Deep-Link)</span>
              </label>
              <select
                value={form.song_id}
                onChange={(e) => setForm({ ...form, song_id: e.target.value })}
                className="admin-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="">None (General Notification)</option>
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.song_number || '?'} - {s.title}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '11px', color: '#71717a', margin: '4px 0 0 0' }}>
                When tapped on mobile, the app opens directly to this song and plays it.
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#09090b',
              border: '1px solid #27272a',
              fontSize: '12px',
              color: '#a1a1aa',
            }}>
              <Smartphone size={15} color="#8b5cf6" style={{ flexShrink: 0 }} />
              <span>
                {deviceCount !== null && deviceCount > 0
                  ? `Reaches registered devices (${form.target_audience === 'all' ? 'All' : form.target_audience === 'active_30d' ? 'Active in last 30d' : 'Outdated versions'}) via Google FCM push.`
                  : 'Delivers to all active devices via in-app broadcast and Google FCM once devices register.'}
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-admin-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              <Send size={15} />
              <span>{saving ? 'Sending...' : 'Send Notification'}</span>
            </button>
          </form>
        </div>

        {/* Sent History Card matching Screen 5 in Reference */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={16} color="#8b5cf6" />
            <h2 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', margin: 0 }}>
              Sent History
            </h2>
          </div>

          {loading ? (
            <div className="admin-empty">Loading history...</div>
          ) : notifications.length === 0 ? (
            <div className="admin-empty">No notifications sent yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                      {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.message}
                    </div>
                    {n.link_url && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <ExternalLink size={11} color="#8b5cf6" />
                        <span style={{ fontSize: '11px', color: '#a78bfa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.link_url}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {n.target_audience && n.target_audience !== 'all' && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: '#a78bfa',
                          background: 'rgba(139, 92, 246, 0.12)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <Users size={10} />
                          Audience: {n.target_audience === 'active_30d' ? 'Active (30d)' : 'Outdated Version'}
                        </span>
                      )}
                      {n.song_id && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: '#34d399',
                          background: 'rgba(52, 211, 153, 0.12)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Music size={10} />
                          Attached Song: {songs.find((s) => s.id === n.song_id)?.title || 'Song'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* One-click Resend button */}
                    <button
                      type="button"
                      onClick={() => handleResend(n)}
                      disabled={resendingId === n.id}
                      className="btn-admin-primary"
                      title="Resend this notification now to all users"
                      style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        cursor: resendingId === n.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <RotateCcw size={12} className={resendingId === n.id ? 'spin' : ''} />
                      <span>{resendingId === n.id ? 'Sending...' : 'Resend'}</span>
                    </button>

                    {/* Reuse in Composer */}
                    <button
                      type="button"
                      onClick={() => handleReuse(n)}
                      className="btn-icon-admin"
                      title="Load into Composer to edit"
                      style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                    >
                      <Copy size={12} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="btn-admin-danger"
                      title="Delete notification"
                      style={{ padding: '5px 8px', borderRadius: '6px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
