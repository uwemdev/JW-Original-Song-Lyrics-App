import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Music,
  Image as ImageIcon,
  Clock,
  FileDown,
  RefreshCw,
  Search,
  Edit2,
  Play,
  Pause,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function CatalogHealthTab() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Audit state
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState({ current: 0, total: 0 });
  const [mediaCheckResults, setMediaCheckResults] = useState({}); // { [songId]: { audioOk: bool, imageOk: bool, audioChecked: bool, imageChecked: bool } }
  const cancelAuditRef = useRef(false);

  // Filters
  const [activeTab, setActiveTab] = useState('all_issues'); // 'all_issues', 'audio', 'image', 'lyrics', 'synced', 'drafts', 'healthy'
  const [searchQuery, setSearchQuery] = useState('');

  // Audio preview
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioPlayerRef = useRef(null);

  // Fetch all songs
  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [songsRes, catsRes] = await Promise.all([
        supabase
          .from('songs')
          .select('*, categories(name)')
          .order('title', { ascending: true }),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (songsRes.error) throw songsRes.error;
      if (catsRes.error) throw catsRes.error;

      setSongs(songsRes.data || []);
      setCategories(catsRes.data || []);
    } catch (err) {
      console.error('Error loading catalog songs:', err);
      setErrorMsg('Failed to load songs: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, [fetchSongs]);

  // Audio & Image Probe Functions
  const testAudioUrl = (url) => {
    return new Promise((resolve) => {
      if (!url || !url.trim()) return resolve(false);
      const audio = new Audio();
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          audio.src = '';
          resolve(false);
        }
      }, 7000);

      audio.oncanplay = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          audio.src = '';
          resolve(true);
        }
      };

      audio.onloadedmetadata = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          audio.src = '';
          resolve(true);
        }
      };

      audio.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          audio.src = '';
          resolve(false);
        }
      };

      audio.src = url;
    });
  };

  const testImageUrl = (url) => {
    return new Promise((resolve) => {
      if (!url || !url.trim()) return resolve(false);
      const img = new window.Image();
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          img.src = '';
          resolve(false);
        }
      }, 6000);

      img.onload = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(true);
        }
      };

      img.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(false);
        }
      };

      img.src = url;
    });
  };

  // Run Media Probe Audit in concurrency-controlled batches
  const runMediaAudit = async () => {
    if (auditing || songs.length === 0) return;
    setAuditing(true);
    cancelAuditRef.current = false;
    setAuditProgress({ current: 0, total: songs.length });

    const results = { ...mediaCheckResults };
    const batchSize = 4;

    for (let i = 0; i < songs.length; i += batchSize) {
      if (cancelAuditRef.current) break;

      const batch = songs.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (song) => {
          let audioOk = false;
          let imageOk = false;

          if (song.mp3_url) {
            audioOk = await testAudioUrl(song.mp3_url);
          }
          if (song.feature_image_url) {
            imageOk = await testImageUrl(song.feature_image_url);
          }

          results[song.id] = {
            audioOk,
            imageOk,
            audioChecked: Boolean(song.mp3_url),
            imageChecked: Boolean(song.feature_image_url),
          };
        })
      );

      setMediaCheckResults({ ...results });
      setAuditProgress({ current: Math.min(i + batchSize, songs.length), total: songs.length });
    }

    setAuditing(false);
  };

  const cancelAudit = () => {
    cancelAuditRef.current = true;
    setAuditing(false);
  };

  // Analyze each song for quality issues
  const auditedSongs = useMemo(() => {
    return songs.map((song) => {
      const issues = [];
      const media = mediaCheckResults[song.id] || null;

      // 1. Audio check
      if (!song.mp3_url || !song.mp3_url.trim()) {
        issues.push({ code: 'audio_missing', severity: 'critical', label: 'Missing Audio MP3' });
      } else if (media && media.audioChecked && !media.audioOk) {
        issues.push({ code: 'audio_broken', severity: 'critical', label: 'Broken Audio Link' });
      }

      // 2. Image check
      if (!song.feature_image_url || !song.feature_image_url.trim()) {
        issues.push({ code: 'image_missing', severity: 'warning', label: 'Missing Cover Image' });
      } else if (media && media.imageChecked && !media.imageOk) {
        issues.push({ code: 'image_broken', severity: 'warning', label: 'Broken Cover Image' });
      }

      // 3. Lyrics check
      const plainLyrics = (song.lyrics || '').replace(/<[^>]*>/g, '').trim();
      if (!plainLyrics || plainLyrics.length < 20) {
        issues.push({ code: 'lyrics_missing', severity: 'critical', label: 'Missing Lyrics' });
      } else {
        // 4. Synced timing check
        const hasSync = /\[\d{1,2}:\d{2}/.test(song.lyrics || '');
        if (!hasSync) {
          issues.push({ code: 'synced_missing', severity: 'optimization', label: 'No Synced Timestamps' });
        }
      }

      // 5. Writeup check
      const plainWriteup = (song.writeup || '').replace(/<[^>]*>/g, '').trim();
      if (!plainWriteup || plainWriteup.length < 10) {
        issues.push({ code: 'writeup_missing', severity: 'optimization', label: 'Missing Writeup' });
      }

      // 6. Category check
      if (!song.category_id) {
        issues.push({ code: 'category_missing', severity: 'warning', label: 'Uncategorized' });
      }

      // 7. Draft status
      if (!song.is_published) {
        issues.push({ code: 'draft', severity: 'info', label: 'Draft (Unpublished)' });
      }

      const hasCritical = issues.some((i) => i.severity === 'critical');
      const hasWarning = issues.some((i) => i.severity === 'warning');
      const isHealthy = issues.length === 0;

      return {
        ...song,
        issues,
        hasCritical,
        hasWarning,
        isHealthy,
      };
    });
  }, [songs, mediaCheckResults]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = auditedSongs.length;
    if (total === 0) {
      return {
        total: 0,
        healthyCount: 0,
        healthScore: 100,
        brokenOrMissingAudio: 0,
        brokenOrMissingImage: 0,
        missingLyrics: 0,
        missingSync: 0,
        missingWriteup: 0,
        drafts: 0,
      };
    }

    let healthyCount = 0;
    let brokenOrMissingAudio = 0;
    let brokenOrMissingImage = 0;
    let missingLyrics = 0;
    let missingSync = 0;
    let missingWriteup = 0;
    let drafts = 0;

    auditedSongs.forEach((s) => {
      if (s.isHealthy) healthyCount += 1;
      s.issues.forEach((iss) => {
        if (iss.code === 'audio_missing' || iss.code === 'audio_broken') brokenOrMissingAudio += 1;
        if (iss.code === 'image_missing' || iss.code === 'image_broken') brokenOrMissingImage += 1;
        if (iss.code === 'lyrics_missing') missingLyrics += 1;
        if (iss.code === 'synced_missing') missingSync += 1;
        if (iss.code === 'writeup_missing') missingWriteup += 1;
        if (iss.code === 'draft') drafts += 1;
      });
    });

    // Score computation: critical deducts 15%, warning deducts 5%, optimization deducts 2%
    let totalDeductions = 0;
    auditedSongs.forEach((s) => {
      s.issues.forEach((iss) => {
        if (iss.severity === 'critical') totalDeductions += 15;
        else if (iss.severity === 'warning') totalDeductions += 5;
        else if (iss.severity === 'optimization') totalDeductions += 2;
      });
    });

    const maxDeductions = total * 25;
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - (totalDeductions / maxDeductions) * 100)));

    return {
      total,
      healthyCount,
      healthScore,
      brokenOrMissingAudio,
      brokenOrMissingImage,
      missingLyrics,
      missingSync,
      missingWriteup,
      drafts,
    };
  }, [auditedSongs]);

  // Filtered List for Table
  const filteredSongs = useMemo(() => {
    let list = auditedSongs;

    if (activeTab === 'all_issues') {
      list = list.filter((s) => s.issues.length > 0);
    } else if (activeTab === 'audio') {
      list = list.filter((s) => s.issues.some((i) => i.code === 'audio_missing' || i.code === 'audio_broken'));
    } else if (activeTab === 'image') {
      list = list.filter((s) => s.issues.some((i) => i.code === 'image_missing' || i.code === 'image_broken'));
    } else if (activeTab === 'lyrics') {
      list = list.filter((s) => s.issues.some((i) => i.code === 'lyrics_missing'));
    } else if (activeTab === 'synced') {
      list = list.filter((s) => s.issues.some((i) => i.code === 'synced_missing'));
    } else if (activeTab === 'drafts') {
      list = list.filter((s) => !s.is_published);
    } else if (activeTab === 'healthy') {
      list = list.filter((s) => s.isHealthy);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.categories?.name || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [auditedSongs, activeTab, searchQuery]);

  // Toggle audio preview
  const toggleAudio = (song) => {
    if (!song.mp3_url) return;

    if (playingAudioId === song.id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(song.mp3_url);
      audioPlayerRef.current = audio;
      setPlayingAudioId(song.id);
      audio.play().catch(() => setPlayingAudioId(null));
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Deep link to edit song
  const handleEditSong = (songId) => {
    navigate(`/admin?tab=songs&editSongId=${songId}`);
  };

  // Export CSV
  const exportHealthReport = () => {
    if (auditedSongs.length === 0) return;
    const header = [
      'Song Title',
      'Category',
      'Published',
      'Has Audio',
      'Has Cover Image',
      'Has Lyrics',
      'Has Synced Timestamps',
      'Has Writeup',
      'Issues Count',
      'Issues List',
    ];

    const rows = auditedSongs.map((s) => [
      `"${s.title.replace(/"/g, '""')}"`,
      `"${(s.categories?.name || 'Uncategorized').replace(/"/g, '""')}"`,
      s.is_published ? 'Yes' : 'Draft',
      s.mp3_url ? 'Yes' : 'No',
      s.feature_image_url ? 'Yes' : 'No',
      (s.lyrics || '').trim().length > 20 ? 'Yes' : 'No',
      /\[\d{1,2}:\d{2}/.test(s.lyrics || '') ? 'Yes' : 'No',
      (s.writeup || '').trim().length > 10 ? 'Yes' : 'No',
      s.issues.length,
      `"${s.issues.map((i) => i.label).join('; ')}"`,
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `catalog_health_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page">
      {/* ── Page Header ── */}
      <div className="admin-page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>Catalog Health & Media Auditor</h1>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                fontWeight: '600',
              }}
            >
              Integrity Checker
            </span>
          </div>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Scan for broken MP3 links, missing cover art, empty lyrics, and unsynchronized karaoke timing.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {auditing ? (
            <button
              onClick={cancelAudit}
              className="btn-admin-danger"
              style={{ padding: '7px 12px' }}
            >
              <XCircle size={14} />
              <span>Cancel Scan</span>
            </button>
          ) : (
            <button
              onClick={runMediaAudit}
              className="btn-admin-primary"
              disabled={loading || songs.length === 0}
              style={{ padding: '7px 14px' }}
            >
              <Activity size={14} />
              <span>Probe Audio & Images</span>
            </button>
          )}

          <button
            onClick={fetchSongs}
            className="btn-admin-secondary"
            disabled={auditing || loading}
            style={{ padding: '7px 12px' }}
            title="Reload song catalog"
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Reload</span>
          </button>

          <button
            onClick={exportHealthReport}
            className="btn-admin-secondary"
            disabled={songs.length === 0}
            style={{ padding: '7px 12px' }}
            title="Export health audit report to CSV"
          >
            <FileDown size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Progress banner when auditing */}
      {auditing && (
        <div
          className="admin-card"
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            background: 'rgba(139, 92, 246, 0.05)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
              <RefreshCw size={14} className="spin-icon" color="#8b5cf6" />
              <span>Auditing remote MP3 and cover image links...</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: '600' }}>
              {auditProgress.current} / {auditProgress.total} (
              {Math.round((auditProgress.current / Math.max(1, auditProgress.total)) * 100)}%)
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '6px',
              background: 'var(--admin-surface-2)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(auditProgress.current / Math.max(1, auditProgress.total)) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Error alert */}
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

      {/* ── KPI Summary Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* Overall Health Score */}
        <div className="admin-stat-card">
          <div
            className="stat-icon"
            style={{
              background:
                metrics.healthScore >= 90
                  ? 'rgba(34, 197, 94, 0.12)'
                  : metrics.healthScore >= 75
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
              color:
                metrics.healthScore >= 90
                  ? '#22c55e'
                  : metrics.healthScore >= 75
                  ? '#f59e0b'
                  : '#ef4444',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : `${metrics.healthScore}%`}</div>
            <div className="stat-label">Catalog Health Score</div>
          </div>
        </div>

        {/* Audio Issues */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <Music size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: metrics.brokenOrMissingAudio > 0 ? '#ef4444' : undefined }}>
              {loading ? '...' : metrics.brokenOrMissingAudio}
            </div>
            <div className="stat-label">Missing or Broken Audio</div>
          </div>
        </div>

        {/* Image Issues */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <ImageIcon size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: metrics.brokenOrMissingImage > 0 ? '#f59e0b' : undefined }}>
              {loading ? '...' : metrics.brokenOrMissingImage}
            </div>
            <div className="stat-label">Missing or Broken Art</div>
          </div>
        </div>

        {/* Missing Lyrics */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: metrics.missingLyrics > 0 ? '#ec4899' : undefined }}>
              {loading ? '...' : metrics.missingLyrics}
            </div>
            <div className="stat-label">Empty or Short Lyrics</div>
          </div>
        </div>

        {/* Missing Synced Karaoke Timing */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : metrics.missingSync}</div>
            <div className="stat-label">No Synced Timestamps</div>
          </div>
        </div>

        {/* 100% Healthy Songs */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#22c55e' }}>
              {loading ? '...' : metrics.healthyCount}
            </div>
            <div className="stat-label">100% Healthy Songs</div>
          </div>
        </div>
      </div>

      {/* ── Issue Center Card ── */}
      <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Navigation Tabs and Search Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--admin-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Tab filter buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all_issues', label: 'All Issues', count: auditedSongs.filter((s) => s.issues.length > 0).length },
              { id: 'audio', label: 'Audio', count: metrics.brokenOrMissingAudio },
              { id: 'image', label: 'Cover Art', count: metrics.brokenOrMissingImage },
              { id: 'lyrics', label: 'Lyrics', count: metrics.missingLyrics },
              { id: 'synced', label: 'Synced Timing', count: metrics.missingSync },
              { id: 'drafts', label: 'Drafts', count: metrics.drafts },
              { id: 'healthy', label: 'Healthy', count: metrics.healthyCount },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  border: 'none',
                  background: activeTab === t.id ? 'var(--admin-primary)' : 'var(--admin-surface-2)',
                  color: activeTab === t.id ? '#ffffff' : 'var(--admin-text-muted)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: activeTab === t.id ? '600' : '500',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{t.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    background: activeTab === t.id ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                    color: activeTab === t.id ? '#ffffff' : 'inherit',
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search filter input */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--admin-text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search in results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input"
              style={{
                paddingLeft: '32px',
                fontSize: '12px',
                paddingTop: '6px',
                paddingBottom: '6px',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Results Table */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            Loading catalog songs...
          </div>
        ) : filteredSongs.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={36} color="#22c55e" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--admin-text)' }}>
              No songs found in this category
            </div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
              All songs match quality requirements or no issues are active for this filter.
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Song</th>
                  <th style={{ width: '130px' }}>Category</th>
                  <th style={{ width: '90px' }}>Status</th>
                  <th>Detected Issues & Suggestions</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSongs.slice(0, 50).map((song) => {
                  const isPlaying = playingAudioId === song.id;
                  return (
                    <tr key={song.id}>
                      {/* Song info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {song.feature_image_url ? (
                            <img
                              src={song.feature_image_url}
                              alt=""
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '6px',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
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
                            <div
                              style={{
                                fontWeight: '600',
                                fontSize: '13px',
                                color: 'var(--admin-text)',
                                lineHeight: '1.2',
                              }}
                            >
                              {song.title}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                              ID: {song.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                          {song.categories?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Publication Status */}
                      <td>
                        <span
                          className={`admin-badge ${song.is_published ? 'published' : 'draft'}`}
                          style={{ fontSize: '11px', padding: '2px 6px' }}
                        >
                          {song.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>

                      {/* Issues Badges */}
                      <td>
                        {song.issues.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#22c55e', fontSize: '12px', fontWeight: '500' }}>
                            <CheckCircle2 size={14} />
                            <span>100% Quality Pass</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {song.issues.map((iss, i) => {
                              let bg = 'rgba(139, 92, 246, 0.15)';
                              let color = '#a78bfa';
                              if (iss.severity === 'critical') {
                                bg = 'rgba(239, 68, 68, 0.15)';
                                color = '#f87171';
                              } else if (iss.severity === 'warning') {
                                bg = 'rgba(245, 158, 11, 0.15)';
                                color = '#fbbf24';
                              }

                              return (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    background: bg,
                                    color: color,
                                    fontWeight: '600',
                                  }}
                                >
                                  {iss.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {song.mp3_url && (
                            <button
                              onClick={() => toggleAudio(song)}
                              className="btn-icon-admin"
                              style={{ width: '28px', height: '28px' }}
                              title={isPlaying ? 'Pause audio' : 'Play audio test'}
                            >
                              {isPlaying ? <Pause size={12} color="#22c55e" /> : <Play size={12} />}
                            </button>
                          )}

                          <button
                            onClick={() => handleEditSong(song.id)}
                            className="btn-admin-edit"
                            style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                            title="Open song in editor to fix issues"
                          >
                            <Edit2 size={11} />
                            <span>Fix</span>
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
    </div>
  );
}
