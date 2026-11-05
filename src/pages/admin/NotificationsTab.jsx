import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Trash2, Megaphone, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const s = {
  page: {
    maxWidth: '1400px',
    width: '100%',
    padding: '24px 28px',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.3px' },
  subtitle: { fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0 0' },
  card: {
    background: '#12101a',
    border: '1px solid #231f30',
    borderRadius: '12px',
    padding: '22px',
    boxSizing: 'border-box',
  },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '6px' },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#0a0910',
    border: '1px solid #231f30',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: '#0a0910',
    border: '1px solid #231f30',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    background: '#8B5CF6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  btnDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #231f30',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #1c1827',
    fontSize: '13px',
    color: '#D1D5DB',
  },
  empty: { textAlign: 'center', padding: '40px', color: '#6B7280', fontSize: '13px' },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#EF4444',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  success: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22C55E',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          title: form.title,
          message: form.message,
          link_url: form.link_url || null,
        }]);

      if (error) throw error;

      setSuccessMsg('Notification broadcast sent successfully! Mobile users will receive this in real-time or upon opening the app.');
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
    if (!confirm('Are you sure you want to delete this notification? It will be removed from all users immediately.')) return;

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

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Push Notifications</h1>
          <p style={s.subtitle}>Send real-time broadcast banners and in-app alerts to mobile users</p>
        </div>
      </div>

      {errorMsg && (
        <div style={s.error}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div style={s.success}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Composer Card */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Megaphone size={16} color="#8B5CF6" />
            <h2 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', margin: 0 }}>Compose Message</h2>
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
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
                style={{ padding: '5px 9px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
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
                style={{ padding: '5px 9px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
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
                style={{ padding: '5px 9px', background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', color: '#F472B6', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
              >
                Sunday Reflection
              </button>
            </div>
          </div>

          <form onSubmit={handleSend}>
            <div style={s.formGroup}>
              <label style={s.label}>Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New Songs Added"
                style={s.input}
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Message *</label>
              <textarea
                required
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Describe the update..."
                style={s.textarea}
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Link URL (Optional)</label>
              <input
                type="url"
                value={form.link_url}
                onChange={e => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://..."
                style={s.input}
              />
              <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', margin: '4px 0 0 0' }}>Makes the notification clickable to open a web link.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{ ...s.btnPrimary, width: '100%', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
            >
              <Send size={15} />
              <span>{saving ? 'Sending...' : 'Send Push Notification'}</span>
            </button>
          </form>
        </div>

        {/* History Card with responsive horizontal scroll */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={16} color="#8B5CF6" />
            <h2 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', margin: 0 }}>Sent History</h2>
          </div>

          {loading ? (
            <div style={s.empty}>Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div style={s.empty}>No notifications sent yet.</div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Date</th>
                    <th style={s.th}>Title</th>
                    <th style={s.th}>Message</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map(n => (
                    <tr key={n.id}>
                      <td style={{ ...s.td, fontSize: '11px', whiteSpace: 'nowrap', color: '#9CA3AF' }}>
                        {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ ...s.td, color: '#fff', fontWeight: '600', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </td>
                      <td style={{ ...s.td, fontSize: '12px', color: '#9CA3AF', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.message}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleDelete(n.id)} style={s.btnDanger} title="Delete notification">
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
