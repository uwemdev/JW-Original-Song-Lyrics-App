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
} from 'lucide-react';

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({ title: '', message: '', link_url: '' });

  useEffect(() => {
    fetchNotifications();
  }, []);

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

  const dispatchExpoPush = async (title, message, linkUrl) => {
    try {
      const { data: tokens, error } = await supabase
        .from('device_push_tokens')
        .select('push_token');

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
          data: { link_url: linkUrl },
        }));

      if (pushMessages.length === 0) return 0;

      for (let i = 0; i < pushMessages.length; i += 100) {
        const chunk = pushMessages.slice(i, i + 100);
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
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
      const { error } = await supabase
        .from('app_notifications')
        .insert([{
          title: form.title.trim(),
          message: form.message.trim(),
          link_url: form.link_url ? form.link_url.trim() : null,
        }]);

      if (error) throw error;

      // Broadcast directly to registered Google FCM / Expo Push devices
      const pushedCount = await dispatchExpoPush(form.title.trim(), form.message.trim(), form.link_url?.trim());
      const pushNote = pushedCount > 0 ? ` (Delivered to ${pushedCount} mobile device(s))` : '';

      setSuccessMsg(`Notification sent successfully!${pushNote}`);
      setForm({ title: '', message: '', link_url: '' });
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
    if (!confirm(`Resend notification "${notif.title}" now to all users?`)) return;

    setResendingId(notif.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('app_notifications')
        .insert([{
          title: notif.title.trim(),
          message: notif.message.trim(),
          link_url: notif.link_url ? notif.link_url.trim() : null,
        }]);

      if (error) throw error;

      // Broadcast directly to registered Google FCM / Expo Push devices
      const pushedCount = await dispatchExpoPush(notif.title.trim(), notif.message.trim(), notif.link_url?.trim());
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

            <div style={{ marginBottom: '16px' }}>
              <label className="admin-label">Link URL (Optional)</label>
              <input
                type="url"
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://..."
                className="admin-input"
              />
              <p style={{ fontSize: '11px', color: '#71717a', margin: '4px 0 0 0' }}>
                Makes the notification clickable to open a web link.
              </p>
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
