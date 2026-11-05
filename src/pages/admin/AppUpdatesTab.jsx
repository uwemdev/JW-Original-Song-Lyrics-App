import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, RefreshCw, Smartphone, AlertTriangle, Sparkles, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

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
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#8B5CF6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  card: {
    background: '#12101a',
    border: '1px solid #231f30',
    borderRadius: '12px',
    padding: '22px',
    boxSizing: 'border-box',
  },
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
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  },
  formGroup: { marginBottom: '16px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
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
    message: 'A new version of JW Original Song Lyrics is available on Google Play. Update now for the latest features and improvements.',
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
      setSuccessMsg('App version settings updated successfully! Mobile users will receive the update prompt immediately.');
    } catch (err) {
      setErrorMsg('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>App Version & Google Play Updates</h1>
          <p style={s.subtitle}>
            Manage release versions, release notes, and toggle forced updates for Android users on Google Play.
          </p>
        </div>
        <button
          onClick={fetchConfig}
          disabled={loading}
          style={{
            ...s.btnPrimary,
            background: '#1a1626',
            color: '#A78BFA',
            border: '1px solid #2d263e',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
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
        {/* Settings Form Card */}
        <div style={s.card}>
          <form onSubmit={handleSubmit}>
            <div style={s.grid}>
              <div style={s.formGroup}>
                <label style={s.label}>Latest Play Store Version *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0.3"
                  value={form.latest_version}
                  onChange={(e) => setForm({ ...form, latest_version: e.target.value })}
                  style={s.input}
                />
                <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                  Users below this version will see the update banner or dialog.
                </span>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Minimum Required Version *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0.0"
                  value={form.min_required_version}
                  onChange={(e) => setForm({ ...form, min_required_version: e.target.value })}
                  style={s.input}
                />
                <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                  Users below this version are <strong>forced</strong> to update.
                </span>
              </div>
            </div>

            {/* Force Update Toggle */}
            <div
              style={{
                marginBottom: '20px',
                padding: '14px 16px',
                background: form.force_update ? 'rgba(239, 68, 68, 0.08)' : '#0e0c16',
                border: form.force_update ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #231f30',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => setForm({ ...form, force_update: !form.force_update })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={18} color={form.force_update ? '#EF4444' : '#9CA3AF'} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: form.force_update ? '#EF4444' : '#fff' }}>
                    Force Immediate Update (Lock App)
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    Prevent all users on older versions from closing the modal until they update.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.force_update}
                onChange={(e) => setForm({ ...form, force_update: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {/* Title */}
            <div style={s.formGroup}>
              <label style={s.label}>Modal Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={s.input}
              />
            </div>

            {/* Message */}
            <div style={s.formGroup}>
              <label style={s.label}>Announcement Message</label>
              <textarea
                rows={2}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                style={s.textarea}
              />
            </div>

            {/* Release notes */}
            <div style={s.formGroup}>
              <label style={s.label}>What's New / Release Notes</label>
              <textarea
                rows={4}
                value={form.release_notes}
                onChange={(e) => setForm({ ...form, release_notes: e.target.value })}
                style={s.textarea}
                placeholder="Feature 1&#10;Bug fixes..."
              />
            </div>

            {/* Store URL */}
            <div style={s.formGroup}>
              <label style={s.label}>Play Store URL</label>
              <input
                type="text"
                value={form.store_url}
                onChange={(e) => setForm({ ...form, store_url: e.target.value })}
                style={s.input}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{ ...s.btnPrimary, width: '100%', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save & Publish Version'}</span>
            </button>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Smartphone size={16} color="#A78BFA" />
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>
              Live In-App Preview
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '18px' }}>
            Preview of the update modal displayed to users upon opening the mobile app:
          </p>

          {/* Simulated Phone Card */}
          <div
            style={{
              background: '#0d0b14',
              borderRadius: '16px',
              border: form.force_update ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(139, 92, 246, 0.25)',
              padding: '22px 18px',
              textAlign: 'center',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '16px',
                background: form.force_update ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                border: form.force_update ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
                marginBottom: '14px',
              }}
            >
              {form.force_update ? (
                <AlertTriangle size={12} color="#EF4444" />
              ) : (
                <Sparkles size={12} color="#A78BFA" />
              )}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: form.force_update ? '#EF4444' : '#A78BFA',
                  letterSpacing: '0.5px',
                }}
              >
                {form.force_update ? 'REQUIRED UPDATE' : 'GOOGLE PLAY UPDATE'}
              </span>
            </div>

            {/* Version pills */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '12px',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#9CA3AF' }}>Installed: v1.0.2</span>
              <span style={{ color: '#6B7280' }}>→</span>
              <span
                style={{
                  background: '#6D28D9',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: '700',
                }}
              >
                v{form.latest_version || '1.0.3'}
              </span>
            </div>

            {/* Title & Message */}
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: '0 0 8px 0' }}>
              {form.title}
            </h3>
            <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: '18px', margin: '0 0 16px 0' }}>
              {form.message}
            </p>

            {/* Notes box */}
            {form.release_notes && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'left',
                  marginBottom: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    letterSpacing: '0.5px',
                  }}
                >
                  What's New:
                </div>
                <pre
                  style={{
                    fontSize: '11px',
                    color: '#E5E7EB',
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

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  background: form.force_update ? '#EF4444' : '#6D28D9',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>{form.force_update ? 'Update on Google Play' : 'Update Now'}</span>
                <ExternalLink size={13} />
              </div>

              {!form.force_update && (
                <div
                  style={{
                    color: '#9CA3AF',
                    fontSize: '11px',
                    fontWeight: '600',
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
