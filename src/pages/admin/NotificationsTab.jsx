import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Trash2 } from 'lucide-react';

const s = {
  page: { padding: '32px', maxWidth: '100%', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0 },
  subtitle: { fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0 0' },
  card: { background: '#17151f', border: '1px solid #2d293b', borderRadius: '12px', padding: '24px', marginBottom: '24px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#9CA3AF', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', background: '#0d0c11', border: '1px solid #2d293b', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', background: '#0d0c11', border: '1px solid #2d293b', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnDanger: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #2d293b' },
  td: { padding: '12px', borderBottom: '1px solid rgba(45,41,59,0.5)', fontSize: '14px', color: '#D1D5DB' },
  empty: { textAlign: 'center', padding: '40px', color: '#6B7280', fontSize: '14px' },
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' },
  success: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' },
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
      
      setSuccessMsg('Notification sent successfully!');
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
          <p style={s.subtitle}>Send in-app banners to all users</p>
        </div>
      </div>

      {errorMsg && <div style={s.error}>{errorMsg}</div>}
      {successMsg && <div style={s.success}>{successMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Composer */}
        <div style={s.card}>
          <h2 style={{ color: '#fff', fontSize: '16px', marginTop: 0, marginBottom: '20px' }}>Compose Message</h2>
          <form onSubmit={handleSend}>
            <div style={s.formGroup}>
              <label style={s.label}>Title *</label>
              <input
                type="text" required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New Feature!"
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
              <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Makes the notification clickable to open a web link.</p>
            </div>
            <button type="submit" disabled={saving} style={{ ...s.btnPrimary, width: '100%', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
              <Send size={16} /> {saving ? 'Sending...' : 'Send Push Notification'}
            </button>
          </form>
        </div>

        {/* History */}
        <div style={{ ...s.card, height: 'fit-content' }}>
          <h2 style={{ color: '#fff', fontSize: '16px', marginTop: 0, marginBottom: '20px' }}>Sent History</h2>
          
          {loading ? (
            <div style={s.empty}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={s.empty}>No notifications sent yet.</div>
          ) : (
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
                    <td style={{ ...s.td, fontSize: '12px' }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ ...s.td, color: '#fff', fontWeight: '500' }}>{n.title}</td>
                    <td style={{ ...s.td, fontSize: '13px' }}>
                      {n.message.length > 50 ? n.message.substring(0, 50) + '...' : n.message}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <button onClick={() => handleDelete(n.id)} style={s.btnDanger}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
