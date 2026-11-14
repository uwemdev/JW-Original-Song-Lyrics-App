import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Music,
  FolderTree,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function AnnouncementsTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Catalog songs and categories for action link pickers
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);

  // Announcements list
  const [announcements, setAnnouncements] = useState([]);

  // Form / Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    message: '',
    banner_type: 'info', // 'info', 'success', 'warning', 'alert'
    action_type: 'none', // 'none', 'song', 'category', 'url'
    action_id: '',
    action_label: '',
    is_active: true,
    is_dismissible: true,
    starts_at: new Date().toISOString().slice(0, 16),
    expires_at: '',
  });

  const fetchAnnouncements = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setErrorMsg('');

    try {
      const [annRes, songsRes, catsRes] = await Promise.all([
        supabase
          .from('app_announcements')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('songs')
          .select('id, title, categories(name)')
          .eq('is_published', true)
          .order('title', { ascending: true }),
        supabase.from('categories').select('id, name').order('name', { ascending: true }),
      ]);

      if (annRes.error && annRes.error.code !== '42P01') {
        throw annRes.error;
      }

      setAnnouncements(annRes.data || []);
      setSongs(songsRes.data || []);
      setCategories(catsRes.data || []);
    } catch (err) {
      console.error('Announcements load error:', err);
      if (err.message && err.message.includes('does not exist')) {
        setErrorMsg('The app_announcements table has not been created in Supabase yet. Please run migration 12 in the Supabase SQL Editor.');
      } else {
        setErrorMsg('Failed to load announcements: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({
      title: '',
      message: '',
      banner_type: 'info',
      action_type: 'none',
      action_id: '',
      action_label: '',
      is_active: true,
      is_dismissible: true,
      starts_at: new Date().toISOString().slice(0, 16),
      expires_at: '',
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      message: item.message,
      banner_type: item.banner_type || 'info',
      action_type: item.action_type || 'none',
      action_id: item.action_id || '',
      action_label: item.action_label || '',
      is_active: item.is_active,
      is_dismissible: item.is_dismissible,
      starts_at: item.starts_at ? new Date(item.starts_at).toISOString().slice(0, 16) : '',
      expires_at: item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      showToast('Please enter both a title and a message.', true);
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        banner_type: form.banner_type,
        action_type: form.action_type,
        action_id: form.action_id || null,
        action_label: form.action_label.trim() || null,
        is_active: form.is_active,
        is_dismissible: form.is_dismissible,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('app_announcements')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        showToast('Announcement updated successfully.');
      } else {
        const { error } = await supabase
          .from('app_announcements')
          .insert([payload]);
        if (error) throw error;
        showToast('Announcement created and published.');
      }

      setShowModal(false);
      fetchAnnouncements(true);
    } catch (err) {
      showToast('Failed to save announcement: ' + err.message, true);
    }
  };

  const toggleActive = async (item) => {
    try {
      const nextActive = !item.is_active;
      const { error } = await supabase
        .from('app_announcements')
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      showToast(nextActive ? 'Announcement activated' : 'Announcement deactivated');
      fetchAnnouncements(true);
    } catch (err) {
      showToast('Failed to update: ' + err.message, true);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this in-app announcement?')) return;
    try {
      const { error } = await supabase.from('app_announcements').delete().eq('id', id);
      if (error) throw error;
      showToast('Announcement deleted');
      fetchAnnouncements(true);
    } catch (err) {
      showToast('Failed to delete: ' + err.message, true);
    }
  };

  // Status helper
  const getAnnouncementStatus = (item) => {
    const now = new Date();
    if (!item.is_active) return { label: 'Inactive', color: '#71717a', bg: 'rgba(113, 113, 122, 0.15)' };
    if (item.starts_at && new Date(item.starts_at) > now) {
      return { label: 'Scheduled', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
    }
    if (item.expires_at && new Date(item.expires_at) < now) {
      return { label: 'Expired', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' };
    }
    return { label: 'Live on Mobile', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)' };
  };

  // Theme styling helper
  const getBannerThemeStyles = (type) => {
    switch (type) {
      case 'success':
        return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e', icon: CheckCircle2 };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', icon: AlertTriangle };
      case 'alert':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', icon: AlertCircle };
      default: // 'info'
        return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6', icon: Info };
    }
  };

  const previewStyles = getBannerThemeStyles(form.banner_type);
  const PreviewIcon = previewStyles.icon;

  return (
    <div className="admin-page">
      {/* ── Page Header ── */}
      <div className="admin-page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>In-App Announcements</h1>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#a78bfa',
                fontWeight: '600',
              }}
            >
              Notice Banners
            </span>
          </div>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Broadcast top-of-screen banner announcements, release alerts, and deep-link callouts directly to all mobile app users.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={openAdd} className="btn-admin-primary" style={{ padding: '7px 14px' }}>
            <Plus size={14} />
            <span>New Announcement</span>
          </button>

          <button
            onClick={() => fetchAnnouncements(true)}
            className="btn-admin-secondary"
            disabled={refreshing}
            style={{ padding: '7px 12px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div
          className="admin-alert danger"
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'var(--admin-danger-bg)',
            border: '1px solid var(--admin-danger-border)',
            color: 'var(--admin-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="admin-alert success"
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'var(--admin-success-bg)',
            border: '1px solid var(--admin-success-border)',
            color: 'var(--admin-success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Announcements Table */}
      <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--admin-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
            Announcements & Notice Banners ({announcements.length})
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
            Rendered at the top of the mobile home screen
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <Megaphone size={32} color="var(--admin-text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)' }}>
              No in-app announcements created yet
            </div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
              Create an announcement to show a notification banner to all app users when they open the app.
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Status</th>
                  <th>Announcement Title & Message</th>
                  <th style={{ width: '120px' }}>Theme</th>
                  <th style={{ width: '150px' }}>Action Link</th>
                  <th style={{ width: '140px' }}>Schedule</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((item) => {
                  const status = getAnnouncementStatus(item);
                  return (
                    <tr key={item.id}>
                      {/* Status */}
                      <td>
                        <button
                          onClick={() => toggleActive(item)}
                          style={{
                            border: 'none',
                            background: status.bg,
                            color: status.color,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Click to toggle active/inactive"
                        >
                          {item.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                          <span>{status.label}</span>
                        </button>
                      </td>

                      {/* Content */}
                      <td>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--admin-text)' }}>
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--admin-text-muted)',
                            marginTop: '2px',
                            maxWidth: '400px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.message}
                        </div>
                      </td>

                      {/* Theme */}
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            background:
                              item.banner_type === 'alert'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : item.banner_type === 'warning'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : item.banner_type === 'success'
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(139, 92, 246, 0.15)',
                            color:
                              item.banner_type === 'alert'
                                ? '#f87171'
                                : item.banner_type === 'warning'
                                ? '#fbbf24'
                                : item.banner_type === 'success'
                                ? '#4ade80'
                                : '#a78bfa',
                          }}
                        >
                          {item.banner_type}
                        </span>
                      </td>

                      {/* Action Link */}
                      <td>
                        {item.action_type === 'song' ? (
                          <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Music size={12} color="#8b5cf6" />
                            <span>Opens Song</span>
                          </span>
                        ) : item.action_type === 'category' ? (
                          <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FolderTree size={12} color="#ec4899" />
                            <span>Opens Category</span>
                          </span>
                        ) : item.action_type === 'url' ? (
                          <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={12} color="#3b82f6" />
                            <span>Opens URL</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>None</span>
                        )}
                      </td>

                      {/* Dates */}
                      <td>
                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                          <div>Starts: {new Date(item.starts_at).toLocaleDateString()}</div>
                          {item.expires_at && <div>Ends: {new Date(item.expires_at).toLocaleDateString()}</div>}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => openEdit(item)}
                            className="btn-admin-edit"
                            style={{ padding: '4px 8px' }}
                            title="Edit announcement"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn-admin-danger"
                            style={{ padding: '4px 8px' }}
                            title="Delete announcement"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Add / Edit Announcement ── */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="admin-modal-header">
              <h3>{editingId ? 'Edit Announcement' : 'Create In-App Announcement'}</h3>
              <button onClick={() => setShowModal(false)} className="btn-icon-admin">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              {/* Title */}
              <div style={{ marginBottom: '14px' }}>
                <label className="admin-label">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. New Convention Songs Added"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="admin-input"
                  required
                />
              </div>

              {/* Message */}
              <div style={{ marginBottom: '14px' }}>
                <label className="admin-label">Message Text</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Listen and read the lyrics for the newest releases from the 2026 convention."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="admin-input"
                  required
                />
              </div>

              {/* Banner Type & Action Type (Row) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="admin-label">Banner Style / Tone</label>
                  <select
                    value={form.banner_type}
                    onChange={(e) => setForm({ ...form, banner_type: e.target.value })}
                    className="admin-input"
                  >
                    <option value="info">Purple (Standard Info)</option>
                    <option value="success">Green (New Release / Success)</option>
                    <option value="warning">Amber (Notice / Reminder)</option>
                    <option value="alert">Red (Important Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="admin-label">Action Link Type</label>
                  <select
                    value={form.action_type}
                    onChange={(e) => setForm({ ...form, action_type: e.target.value, action_id: '' })}
                    className="admin-input"
                  >
                    <option value="none">None (Notice only)</option>
                    <option value="song">Link to Specific Song</option>
                    <option value="category">Link to Category</option>
                    <option value="url">External Web Link</option>
                  </select>
                </div>
              </div>

              {/* Conditional Action Picker */}
              {form.action_type !== 'none' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="admin-label">Destination</label>
                    {form.action_type === 'song' ? (
                      <select
                        value={form.action_id}
                        onChange={(e) => setForm({ ...form, action_id: e.target.value })}
                        className="admin-input"
                        required
                      >
                        <option value="">-- Choose a Song --</option>
                        {songs.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({s.categories?.name || 'Uncategorized'})
                          </option>
                        ))}
                      </select>
                    ) : form.action_type === 'category' ? (
                      <select
                        value={form.action_id}
                        onChange={(e) => setForm({ ...form, action_id: e.target.value })}
                        className="admin-input"
                        required
                      >
                        <option value="">-- Choose a Category --</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="url"
                        placeholder="https://..."
                        value={form.action_id}
                        onChange={(e) => setForm({ ...form, action_id: e.target.value })}
                        className="admin-input"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="admin-label">Button Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Listen Now"
                      value={form.action_label}
                      onChange={(e) => setForm({ ...form, action_label: e.target.value })}
                      className="admin-input"
                    />
                  </div>
                </div>
              )}

              {/* Scheduling Dates (Row) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="admin-label">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="admin-input"
                  />
                </div>

                <div>
                  <label className="admin-label">Expiration Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <span>Active immediately</span>
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_dismissible}
                    onChange={(e) => setForm({ ...form, is_dismissible: e.target.checked })}
                  />
                  <span>Users can dismiss banner</span>
                </label>
              </div>

              {/* ── Live Mobile Preview Box ── */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--admin-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Mobile App Banner Preview
                </div>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: previewStyles.bg,
                    border: `1px solid ${previewStyles.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <PreviewIcon size={18} color={previewStyles.text} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: previewStyles.text }}>
                      {form.title || 'Announcement Title'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text)', marginTop: '2px' }}>
                      {form.message || 'Announcement message text will appear here.'}
                    </div>
                  </div>
                  {form.action_type !== 'none' && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: previewStyles.text,
                        color: '#fff',
                        fontWeight: '700',
                        flexShrink: 0,
                      }}
                    >
                      {form.action_label || 'View'}
                    </span>
                  )}
                  {form.is_dismissible && (
                    <X size={14} color="var(--admin-text-muted)" style={{ flexShrink: 0 }} />
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-admin-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary">
                  {editingId ? 'Save Changes' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
