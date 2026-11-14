import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Sparkles,
  Calendar,
  Star,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Music,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';

export default function CurationTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Catalog songs for dropdowns
  const [allSongs, setAllSongs] = useState([]);

  // Data states
  const [dailySongs, setDailySongs] = useState([]);
  const [featuredSongs, setFeaturedSongs] = useState([]);

  // Modal / Form state for Song of the Day
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyForm, setDailyForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    song_id: '',
    admin_note: '',
  });

  // Modal / Form state for Featured Song
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [editingFeatured, setEditingFeatured] = useState(null);
  const [featuredForm, setFeaturedForm] = useState({
    song_id: '',
    badge_text: 'Spotlight',
    sort_order: 0,
    is_active: true,
  });

  // Song search in modal selector
  const [songSearchQuery, setSongSearchQuery] = useState('');

  const fetchCurationData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setErrorMsg('');

    try {
      // 1. Fetch catalog songs
      const songsRes = await supabase
        .from('songs')
        .select('id, title, category_id, feature_image_url, categories(name)')
        .eq('is_published', true)
        .order('title', { ascending: true });

      if (songsRes.error) throw songsRes.error;
      setAllSongs(songsRes.data || []);

      // 2. Fetch scheduled daily songs
      const dailyRes = await supabase
        .from('app_daily_songs')
        .select('*, songs(id, title, feature_image_url, categories(name))')
        .order('date', { ascending: true });

      if (dailyRes.error && dailyRes.error.code !== '42P01') {
        throw dailyRes.error;
      }
      setDailySongs(dailyRes.data || []);

      // 3. Fetch featured songs
      const featRes = await supabase
        .from('app_featured_songs')
        .select('*, songs(id, title, feature_image_url, categories(name))')
        .order('sort_order', { ascending: true });

      if (featRes.error && featRes.error.code !== '42P01') {
        throw featRes.error;
      }
      setFeaturedSongs(featRes.data || []);
    } catch (err) {
      console.error('Curation load error:', err);
      if (err.message && err.message.includes('does not exist')) {
        setErrorMsg('The curation tables have not been created in Supabase yet. Please run migration 12 in the Supabase SQL Editor.');
      } else {
        setErrorMsg('Failed to load curation data: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCurationData();
  }, [fetchCurationData]);

  // Flash toast
  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // ── Handle Daily Song Submission ──
  const handleSaveDailySong = async (e) => {
    e.preventDefault();
    if (!dailyForm.date || !dailyForm.song_id) {
      showToast('Please select both a date and a song.', true);
      return;
    }

    try {
      const payload = {
        date: dailyForm.date,
        song_id: dailyForm.song_id,
        admin_note: dailyForm.admin_note.trim() || null,
      };

      const { error } = await supabase
        .from('app_daily_songs')
        .upsert(payload, { onConflict: 'date' });

      if (error) throw error;

      showToast(`Song of the Day scheduled for ${dailyForm.date}`);
      setShowDailyModal(false);
      setDailyForm({
        date: new Date().toISOString().slice(0, 10),
        song_id: '',
        admin_note: '',
      });
      fetchCurationData(true);
    } catch (err) {
      showToast('Failed to save daily song: ' + err.message, true);
    }
  };

  const handleDeleteDailySong = async (date) => {
    if (!window.confirm(`Remove curated Song of the Day override for ${date}?`)) return;
    try {
      const { error } = await supabase.from('app_daily_songs').delete().eq('date', date);
      if (error) throw error;
      showToast(`Removed override for ${date}`);
      fetchCurationData(true);
    } catch (err) {
      showToast('Failed to remove: ' + err.message, true);
    }
  };

  // ── Handle Featured Song Submission ──
  const handleSaveFeatured = async (e) => {
    e.preventDefault();
    if (!featuredForm.song_id) {
      showToast('Please select a song to feature.', true);
      return;
    }

    try {
      if (editingFeatured) {
        const { error } = await supabase
          .from('app_featured_songs')
          .update({
            song_id: featuredForm.song_id,
            badge_text: featuredForm.badge_text.trim() || 'Featured',
            sort_order: Number(featuredForm.sort_order) || 0,
            is_active: featuredForm.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingFeatured.id);

        if (error) throw error;
        showToast('Featured spotlight updated.');
      } else {
        const { error } = await supabase
          .from('app_featured_songs')
          .insert([
            {
              song_id: featuredForm.song_id,
              badge_text: featuredForm.badge_text.trim() || 'Featured',
              sort_order: Number(featuredForm.sort_order) || 0,
              is_active: featuredForm.is_active,
            },
          ]);

        if (error) throw error;
        showToast('Song added to home spotlight.');
      }

      setShowFeaturedModal(false);
      setEditingFeatured(null);
      setFeaturedForm({
        song_id: '',
        badge_text: 'Spotlight',
        sort_order: 0,
        is_active: true,
      });
      fetchCurationData(true);
    } catch (err) {
      showToast('Failed to save featured song: ' + err.message, true);
    }
  };

  const toggleFeaturedActive = async (item) => {
    try {
      const nextActive = !item.is_active;
      const { error } = await supabase
        .from('app_featured_songs')
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) throw error;
      showToast(nextActive ? 'Spotlight item activated' : 'Spotlight item hidden');
      fetchCurationData(true);
    } catch (err) {
      showToast('Failed to update: ' + err.message, true);
    }
  };

  const handleDeleteFeatured = async (id) => {
    if (!window.confirm('Remove this song from the home spotlight carousel?')) return;
    try {
      const { error } = await supabase.from('app_featured_songs').delete().eq('id', id);
      if (error) throw error;
      showToast('Removed from spotlight');
      fetchCurationData(true);
    } catch (err) {
      showToast('Failed to remove: ' + err.message, true);
    }
  };

  const openAddFeatured = () => {
    setEditingFeatured(null);
    setFeaturedForm({
      song_id: allSongs[0]?.id || '',
      badge_text: 'Spotlight',
      sort_order: featuredSongs.length,
      is_active: true,
    });
    setSongSearchQuery('');
    setShowFeaturedModal(true);
  };

  const openEditFeatured = (item) => {
    setEditingFeatured(item);
    setFeaturedForm({
      song_id: item.song_id,
      badge_text: item.badge_text || 'Spotlight',
      sort_order: item.sort_order || 0,
      is_active: item.is_active,
    });
    setSongSearchQuery('');
    setShowFeaturedModal(true);
  };

  // Filter songs for modal pickers
  const filteredCatalogSongs = useMemo(() => {
    if (!songSearchQuery.trim()) return allSongs;
    const q = songSearchQuery.trim().toLowerCase();
    return allSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.categories?.name || '').toLowerCase().includes(q)
    );
  }, [allSongs, songSearchQuery]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCurated = dailySongs.find((d) => d.date === todayStr);

  return (
    <div className="admin-page">
      {/* ── Page Header ── */}
      <div className="admin-page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>Home Screen Curation</h1>
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
              Spotlight Manager
            </span>
          </div>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Schedule "Song of the Day" dates with devotional notes and curate the mobile app featured spotlight banner.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setDailyForm({
                date: new Date().toISOString().slice(0, 10),
                song_id: allSongs[0]?.id || '',
                admin_note: '',
              });
              setSongSearchQuery('');
              setShowDailyModal(true);
            }}
            className="btn-admin-secondary"
            style={{ padding: '7px 12px' }}
          >
            <Calendar size={14} />
            <span>Schedule Daily Song</span>
          </button>

          <button
            onClick={openAddFeatured}
            className="btn-admin-primary"
            style={{ padding: '7px 14px' }}
          >
            <Plus size={14} />
            <span>Add to Spotlight</span>
          </button>

          <button
            onClick={() => fetchCurationData(true)}
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

      {/* ── SECTION 1: Featured / Spotlight Songs Carousel ── */}
      <div className="admin-card" style={{ marginBottom: '24px', padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--admin-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={16} color="#f59e0b" />
              <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--admin-text)' }}>
                Home Screen Featured Carousel ({featuredSongs.length})
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              These songs appear in the rotating hero banner on the mobile app home screen.
            </p>
          </div>

          <button
            onClick={openAddFeatured}
            className="btn-admin-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Plus size={13} />
            <span>Add Song</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            Loading spotlight items...
          </div>
        ) : featuredSongs.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <Star size={32} color="var(--admin-text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)' }}>
              No spotlight songs configured
            </div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
              Click "Add to Spotlight" above to feature songs on the mobile app home carousel.
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Order</th>
                  <th>Song</th>
                  <th style={{ width: '140px' }}>Badge Label</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {featuredSongs.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span
                        style={{
                          fontWeight: '700',
                          fontSize: '12px',
                          color: 'var(--admin-text-muted)',
                          padding: '2px 8px',
                          background: 'var(--admin-surface-2)',
                          borderRadius: '4px',
                        }}
                      >
                        #{item.sort_order}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.songs?.feature_image_url ? (
                          <img
                            src={item.songs.feature_image_url}
                            alt=""
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'var(--admin-surface-2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Music size={14} color="var(--admin-text-muted)" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--admin-text)' }}>
                            {item.songs?.title || 'Unknown Song'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                            {item.songs?.categories?.name || 'Uncategorized'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#a78bfa',
                          fontWeight: '600',
                        }}
                      >
                        {item.badge_text || 'Featured'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleFeaturedActive(item)}
                        style={{
                          border: 'none',
                          background: item.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(113, 113, 122, 0.15)',
                          color: item.is_active ? '#22c55e' : '#71717a',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {item.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{item.is_active ? 'Active' : 'Hidden'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => openEditFeatured(item)}
                          className="btn-admin-edit"
                          style={{ padding: '4px 8px' }}
                          title="Edit Spotlight Settings"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteFeatured(item.id)}
                          className="btn-admin-danger"
                          style={{ padding: '4px 8px' }}
                          title="Remove from Spotlight"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Song of the Day Curation Schedule ── */}
      <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--admin-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#8b5cf6" />
              <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--admin-text)' }}>
                Scheduled Song of the Day Calendar
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              Overrides the automatic rotation for specific dates with curated song selections and devotional notes.
            </p>
          </div>

          <button
            onClick={() => {
              setDailyForm({
                date: new Date().toISOString().slice(0, 10),
                song_id: allSongs[0]?.id || '',
                admin_note: '',
              });
              setSongSearchQuery('');
              setShowDailyModal(true);
            }}
            className="btn-admin-primary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Plus size={13} />
            <span>Schedule Date</span>
          </button>
        </div>

        {/* Current status pill for today */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--admin-surface-2)',
            borderBottom: '1px solid var(--admin-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
            Today's Date: <span style={{ fontWeight: '700', color: 'var(--admin-text)' }}>{todayStr}</span>
          </div>

          <div>
            {todayCurated ? (
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  fontWeight: '600',
                }}
              >
                Curated: {todayCurated.songs?.title}
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(113, 113, 122, 0.15)',
                  color: '#a1a1aa',
                  fontWeight: '500',
                }}
              >
                Using Automatic Algorithmic Rotation
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            Loading daily schedule...
          </div>
        ) : dailySongs.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <Calendar size={32} color="var(--admin-text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)' }}>
              No dates scheduled yet
            </div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
              The mobile app will automatically rotate through the catalog. You can schedule specific dates anytime.
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Scheduled Date</th>
                  <th>Curated Song</th>
                  <th>Admin Reflection Note</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dailySongs.map((d) => {
                  const isToday = d.date === todayStr;
                  const isPast = d.date < todayStr;
                  return (
                    <tr key={d.date} style={{ opacity: isPast ? 0.6 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--admin-text)' }}>
                            {d.date}
                          </span>
                          {isToday && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(34, 197, 94, 0.2)',
                                color: '#4ade80',
                                fontWeight: '700',
                              }}
                            >
                              TODAY
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--admin-text)' }}>
                          {d.songs?.title || 'Unknown Song'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                          {d.songs?.categories?.name || 'Uncategorized'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                          {d.admin_note || '-'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteDailySong(d.date)}
                          className="btn-admin-danger"
                          style={{ padding: '4px 8px' }}
                          title="Remove Date Override"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Schedule Song of the Day ── */}
      {showDailyModal && (
        <div className="admin-modal-overlay" onClick={() => setShowDailyModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <h3>Schedule Song of the Day</h3>
              <button onClick={() => setShowDailyModal(false)} className="btn-icon-admin">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDailySong} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="admin-label">Scheduled Date</label>
                <input
                  type="date"
                  value={dailyForm.date}
                  onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })}
                  className="admin-input"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="admin-label">Filter & Select Song</label>
                <input
                  type="text"
                  placeholder="Type to filter catalog..."
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  className="admin-input"
                  style={{ marginBottom: '8px', fontSize: '12px' }}
                />
                <select
                  value={dailyForm.song_id}
                  onChange={(e) => setDailyForm({ ...dailyForm, song_id: e.target.value })}
                  className="admin-input"
                  required
                >
                  <option value="">-- Choose a Song --</option>
                  {filteredCatalogSongs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.categories?.name || 'Uncategorized'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="admin-label">Optional Admin Note / Reflection</label>
                <input
                  type="text"
                  placeholder="e.g. Featured for Convention preparation"
                  value={dailyForm.admin_note}
                  onChange={(e) => setDailyForm({ ...dailyForm, admin_note: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowDailyModal(false)}
                  className="btn-admin-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary">
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Featured Song ── */}
      {showFeaturedModal && (
        <div className="admin-modal-overlay" onClick={() => setShowFeaturedModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <h3>{editingFeatured ? 'Edit Spotlight Item' : 'Add Song to Spotlight Carousel'}</h3>
              <button onClick={() => setShowFeaturedModal(false)} className="btn-icon-admin">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFeatured} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="admin-label">Filter & Select Song</label>
                <input
                  type="text"
                  placeholder="Type to filter catalog..."
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  className="admin-input"
                  style={{ marginBottom: '8px', fontSize: '12px' }}
                />
                <select
                  value={featuredForm.song_id}
                  onChange={(e) => setFeaturedForm({ ...featuredForm, song_id: e.target.value })}
                  className="admin-input"
                  required
                >
                  <option value="">-- Choose a Song --</option>
                  {filteredCatalogSongs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.categories?.name || 'Uncategorized'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="admin-label">Badge Tag (shown on card)</label>
                <input
                  type="text"
                  placeholder="e.g. Spotlight, New Release, Convention Special"
                  value={featuredForm.badge_text}
                  onChange={(e) => setFeaturedForm({ ...featuredForm, badge_text: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label className="admin-label">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={featuredForm.sort_order}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, sort_order: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label className="admin-label" style={{ marginBottom: '6px' }}>Visibility</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={featuredForm.is_active}
                      onChange={(e) => setFeaturedForm({ ...featuredForm, is_active: e.target.checked })}
                    />
                    <span>Active on mobile</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowFeaturedModal(false)}
                  className="btn-admin-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
