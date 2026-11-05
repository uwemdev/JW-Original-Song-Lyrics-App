import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, RefreshCw, Smartphone, AlertTriangle, Sparkles, ExternalLink, CheckCircle2, AlertCircle, Music2 } from 'lucide-react';

export default function AppUpdatesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    latest_version: '1.0.2',
    min_required_version: '1.0.0',
    force_update: false,
    title: 'New Update Available',
    message: 'A new version of JW Original Songs Lyrics is available on Google Play. Update now for the latest features and improvements.',
    release_notes: '• Improved audio player performance\n• Skip 10s forward/backward controls\n• Bug fixes and stability enhancements',
    store_url: 'market://details?id=com.jworiginalsongslyrics.app',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('app_version_config')
        .select('*')
        .eq('platform', 'android')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setForm({
          latest_version: data.latest_version || '1.0.2',
          min_required_version: data.min_required_version || '1.0.0',
          force_update: Boolean(data.force_update),
          title: (data.title || 'New Update Available').replace(/[^\x00-\x7F]/g, '').trim(),
          message: data.message || '',
          release_notes: data.release_notes || '',
          store_url: data.store_url || 'market://details?id=com.jworiginalsongslyrics.app',
        });
      }
    } catch (err) {
      setErrorMsg('Failed to load version configuration: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('app_version_config')
        .upsert(
          {
            id: 1,
            platform: 'android',
            latest_version: form.latest_version.trim(),
            min_required_version: form.min_required_version.trim(),
            force_update: form.force_update,
            title: form.title.trim(),
            message: form.message.trim(),
            release_notes: form.release_notes.trim(),
            store_url: form.store_url.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) throw error;
      setSuccessMsg('App version settings updated successfully! Mobile users will see the update prompt.');
    } catch (err) {
      setErrorMsg('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>App Version & Google Play Updates</h1>
          <p className="page-subtitle">
            Control app updates, release notes, and toggle forced updates for Android users on Google Play
          </p>
        </div>
        <button
          onClick={fetchConfig}
          disabled={loading}
          className="btn-admin-secondary"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
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
      <div className="app-updates-grid">
        {/* Settings Form Card */}
        <div className="admin-card">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label className="admin-label">Latest Play Store Version *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0.3"
                  value={form.latest_version}
                  onChange={(e) => setForm({ ...form, latest_version: e.target.value })}
                  className="admin-input"
                />
                <span style={{ fontSize: '11px', color: '#71717a', marginTop: '3px', display: 'block' }}>
                  Users below this see the update modal.
                </span>
              </div>

              <div>
                <label className="admin-label">Minimum Required Version *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0.0"
                  value={form.min_required_version}
                  onChange={(e) => setForm({ ...form, min_required_version: e.target.value })}
                  className="admin-input"
                />
                <span style={{ fontSize: '11px', color: '#71717a', marginTop: '3px', display: 'block' }}>
                  Users below this are forced to update.
                </span>
              </div>
            </div>

            {/* Force Update Toggle Switch */}
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                background: form.force_update ? 'rgba(239, 68, 68, 0.08)' : '#09090b',
                border: form.force_update ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #27272a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => setForm({ ...form, force_update: !form.force_update })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={17} color={form.force_update ? '#ef4444' : '#a1a1aa'} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: form.force_update ? '#ef4444' : '#fff' }}>
                    Force Immediate Update (Lock App)
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>
                    Prevent users on older versions from closing the modal until they update.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.force_update}
                onChange={(e) => setForm({ ...form, force_update: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
            </div>

            {/* Modal Title */}
            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Modal Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="admin-input"
              />
            </div>

            {/* Announcement Message */}
            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Announcement Message</label>
              <textarea
                rows={2}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="admin-textarea"
              />
            </div>

            {/* Release Notes */}
            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">What's New / Release Notes</label>
              <textarea
                rows={4}
                value={form.release_notes}
                onChange={(e) => setForm({ ...form, release_notes: e.target.value })}
                className="admin-textarea"
                placeholder="• Feature 1&#10;• Bug fixes..."
              />
            </div>

            {/* Play Store URL */}
            <div style={{ marginBottom: '16px' }}>
              <label className="admin-label">Play Store URL</label>
              <input
                type="text"
                value={form.store_url}
                onChange={(e) => setForm({ ...form, store_url: e.target.value })}
                className="admin-input"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-admin-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save & Publish Version'}</span>
            </button>
          </form>
        </div>

        {/* Live In-App Preview Phone Card matching Screen 6 in Reference */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Smartphone size={16} color="#a78bfa" />
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>
              Live In-App Preview
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: '#71717a', margin: '0 0 16px 0' }}>
            This is how the update modal looks to users in the app.
          </p>

          {/* Simulated Phone Card */}
          <div
            style={{
              background: '#09090b',
              borderRadius: '16px',
              border: form.force_update ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(139, 92, 246, 0.25)',
              padding: '24px 20px',
              textAlign: 'center',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              maxWidth: '360px',
              margin: '0 auto',
            }}
          >
            {/* Gradient Icon Badge */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: form.force_update
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                color: '#fff',
              }}
            >
              <Music2 size={22} />
            </div>

            {/* Title & Announcement */}
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
              {form.title}
            </h3>
            <p style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '18px', margin: '0 0 14px 0' }}>
              {form.message}
            </p>

            {/* What's New Box */}
            {form.release_notes && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  textAlign: 'left',
                  marginBottom: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#a1a1aa',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    letterSpacing: '0.5px',
                  }}
                >
                  WHAT'S NEW:
                </div>
                <pre
                  style={{
                    fontSize: '11px',
                    color: '#e4e4e7',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    lineHeight: '16px',
                  }}
                >
                  {form.release_notes}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  background: form.force_update
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <span>{form.force_update ? 'Update on Google Play' : 'Update Now'}</span>
                <ExternalLink size={13} />
              </div>

              {!form.force_update && (
                <div
                  style={{
                    color: '#71717a',
                    fontSize: '12px',
                    fontWeight: '500',
                    padding: '4px',
                  }}
                >
                  Maybe Later
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
