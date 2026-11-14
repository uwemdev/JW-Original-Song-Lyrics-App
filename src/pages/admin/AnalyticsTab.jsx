import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  BarChart3,
  Search,
  AlertCircle,
  Play,
  Eye,
  Share2,
  Download,
  Heart,
  RefreshCw,
  FileDown,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Filter,
  CheckCircle2,
  Music,
} from 'lucide-react';

export default function AnalyticsTab() {
  const navigate = useNavigate();

  // Filters & State
  const [timeRange, setTimeRange] = useState('7d'); // '24h', '7d', '30d', 'all'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Raw data from Supabase
  const [searchLogs, setSearchLogs] = useState([]);
  const [songEvents, setSongEvents] = useState([]);
  const [songsMap, setSongsMap] = useState({});

  // Sub-filters for tables
  const [zeroResultFilter, setZeroResultFilter] = useState('');
  const [engagementFilter, setEngagementFilter] = useState('');
  const [engagementSortKey, setEngagementSortKey] = useState('plays'); // 'plays', 'views', 'downloads', 'shares', 'total'

  // Calculate startDate based on timeRange
  const startDate = useMemo(() => {
    const now = new Date();
    if (timeRange === '24h') {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
    if (timeRange === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (timeRange === '30d') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    return null; // 'all'
  }, [timeRange]);

  // Fetch all analytics data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setErrorMsg('');

    try {
      // 1. Fetch search logs
      let searchLogsQuery = supabase
        .from('app_search_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3000);

      if (startDate) {
        searchLogsQuery = searchLogsQuery.gte('created_at', startDate);
      }

      // 2. Fetch song events
      let songEventsQuery = supabase
        .from('app_song_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (startDate) {
        songEventsQuery = songEventsQuery.gte('created_at', startDate);
      }

      // 3. Fetch songs metadata for titles, categories, and images
      const songsQuery = supabase
        .from('songs')
        .select('id, title, category_id, feature_image_url, categories(name)');

      const [searchRes, eventsRes, songsRes] = await Promise.all([
        searchLogsQuery,
        songEventsQuery,
        songsQuery,
      ]);

      if (searchRes.error) throw searchRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (songsRes.error) throw songsRes.error;

      setSearchLogs(searchRes.data || []);
      setSongEvents(eventsRes.data || []);

      const map = {};
      (songsRes.data || []).forEach((s) => {
        map[s.id] = s;
      });
      setSongsMap(map);
    } catch (err) {
      console.error('Analytics load error:', err);
      setErrorMsg('Failed to load analytics: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Calculated KPIs ──
  const kpis = useMemo(() => {
    const totalSearches = searchLogs.length;
    const zeroResultSearches = searchLogs.filter((s) => s.results_count === 0).length;
    const zeroResultRate = totalSearches > 0 ? ((zeroResultSearches / totalSearches) * 100).toFixed(1) : 0;

    let views = 0;
    let plays = 0;
    let downloads = 0;
    let shares = 0;
    let favorites = 0;

    songEvents.forEach((ev) => {
      if (ev.event_type === 'view') views += 1;
      else if (ev.event_type === 'play') plays += 1;
      else if (ev.event_type === 'download') downloads += 1;
      else if (ev.event_type === 'share_status') shares += 1;
      else if (ev.event_type === 'favorite') favorites += 1;
    });

    return {
      totalSearches,
      zeroResultSearches,
      zeroResultRate,
      views,
      plays,
      downloads,
      shares,
      favorites,
    };
  }, [searchLogs, songEvents]);

  // ── Zero-Result Queries Grouping ──
  const zeroResultList = useMemo(() => {
    const zeroLogs = searchLogs.filter((s) => s.results_count === 0 && s.query);
    const groups = {};

    zeroLogs.forEach((log) => {
      const q = log.query.trim().toLowerCase();
      if (!groups[q]) {
        groups[q] = {
          query: q,
          count: 0,
          devices: new Set(),
          lastSearched: log.created_at,
        };
      }
      groups[q].count += 1;
      if (log.device_id) groups[q].devices.add(log.device_id);
      if (new Date(log.created_at) > new Date(groups[q].lastSearched)) {
        groups[q].lastSearched = log.created_at;
      }
    });

    const list = Object.values(groups).map((g) => ({
      ...g,
      uniqueDevices: g.devices.size,
    }));

    list.sort((a, b) => b.count - a.count || new Date(b.lastSearched) - new Date(a.lastSearched));

    if (zeroResultFilter.trim()) {
      const term = zeroResultFilter.trim().toLowerCase();
      return list.filter((item) => item.query.includes(term));
    }

    return list;
  }, [searchLogs, zeroResultFilter]);

  // ── Top Search Queries (Leaderboard) ──
  const topQueries = useMemo(() => {
    const groups = {};

    searchLogs.forEach((log) => {
      const q = (log.query || '').trim().toLowerCase();
      if (!q) return;
      if (!groups[q]) {
        groups[q] = {
          query: q,
          count: 0,
          totalResults: 0,
          zeroCount: 0,
          lastSearched: log.created_at,
        };
      }
      groups[q].count += 1;
      groups[q].totalResults += log.results_count || 0;
      if (log.results_count === 0) groups[q].zeroCount += 1;
      if (new Date(log.created_at) > new Date(groups[q].lastSearched)) {
        groups[q].lastSearched = log.created_at;
      }
    });

    const list = Object.values(groups).map((g) => ({
      ...g,
      avgResults: (g.totalResults / g.count).toFixed(1),
    }));

    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 15);
  }, [searchLogs]);

  // ── Song Engagement Grouping ──
  const songEngagementList = useMemo(() => {
    const counts = {};

    songEvents.forEach((ev) => {
      const sid = ev.song_id;
      if (!counts[sid]) {
        counts[sid] = {
          song_id: sid,
          views: 0,
          plays: 0,
          downloads: 0,
          shares: 0,
          favorites: 0,
          total: 0,
        };
      }
      if (ev.event_type === 'view') counts[sid].views += 1;
      else if (ev.event_type === 'play') counts[sid].plays += 1;
      else if (ev.event_type === 'download') counts[sid].downloads += 1;
      else if (ev.event_type === 'share_status') counts[sid].shares += 1;
      else if (ev.event_type === 'favorite') counts[sid].favorites += 1;
      counts[sid].total += 1;
    });

    let list = Object.values(counts).map((c) => {
      const song = songsMap[c.song_id] || { title: 'Unknown Song', id: c.song_id };
      return {
        ...c,
        title: song.title || 'Untitled',
        categoryName: song.categories?.name || 'Uncategorized',
        feature_image_url: song.feature_image_url || '',
      };
    });

    if (engagementFilter.trim()) {
      const term = engagementFilter.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(term) ||
          s.categoryName.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => (b[engagementSortKey] || 0) - (a[engagementSortKey] || 0));
    return list;
  }, [songEvents, songsMap, engagementFilter, engagementSortKey]);

  // ── CSV Export Helpers ──
  const exportSearchesCsv = () => {
    if (searchLogs.length === 0) return;
    const header = ['Query', 'Results Count', 'Device ID', 'Timestamp'];
    const rows = searchLogs.map((s) => [
      `"${(s.query || '').replace(/"/g, '""')}"`,
      s.results_count ?? 0,
      `"${(s.device_id || '').replace(/"/g, '""')}"`,
      `"${s.created_at || ''}"`,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsvBlob(csvContent, `search_analytics_${timeRange}.csv`);
  };

  const exportEngagementCsv = () => {
    if (songEngagementList.length === 0) return;
    const header = [
      'Song Title',
      'Category',
      'Song ID',
      'Plays',
      'Views',
      'Downloads',
      'Status Shares',
      'Favorites',
      'Total Engagement',
    ];
    const rows = songEngagementList.map((s) => [
      `"${(s.title || '').replace(/"/g, '""')}"`,
      `"${(s.categoryName || '').replace(/"/g, '""')}"`,
      `"${s.song_id}"`,
      s.plays,
      s.views,
      s.downloads,
      s.shares,
      s.favorites,
      s.total,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsvBlob(csvContent, `song_engagement_${timeRange}.csv`);
  };

  function downloadCsvBlob(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Deep link to Add Song modal with prefilled title
  const handleCreateSongWithTitle = (title) => {
    navigate(`/admin?tab=songs&newSong=true&title=${encodeURIComponent(title)}`);
  };

  // Format relative date
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '-';
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="admin-page">
      {/* ── Page Header ── */}
      <div className="admin-page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>Analytics & Search Insights</h1>
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
              Telemetry Active
            </span>
          </div>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Live mobile search intelligence, zero-result demand tracking, and song engagement telemetry.
          </p>
        </div>

        {/* Header Controls: Time Range, Refresh & CSV Exports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Time range selector */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--admin-surface-2)',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid var(--admin-border)',
            }}
          >
            {[
              { id: '24h', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                style={{
                  border: 'none',
                  background: timeRange === t.id ? 'var(--admin-primary)' : 'transparent',
                  color: timeRange === t.id ? '#ffffff' : 'var(--admin-text-muted)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: timeRange === t.id ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            className="btn-admin-secondary"
            disabled={refreshing}
            title="Refresh analytics data"
            style={{ padding: '7px 12px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <button
            onClick={exportSearchesCsv}
            className="btn-admin-secondary"
            title="Export search queries to CSV"
            style={{ padding: '7px 12px' }}
          >
            <FileDown size={14} />
            <span>Searches CSV</span>
          </button>

          <button
            onClick={exportEngagementCsv}
            className="btn-admin-secondary"
            title="Export song engagement metrics to CSV"
            style={{ padding: '7px 12px' }}
          >
            <FileDown size={14} />
            <span>Engagement CSV</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
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
        {/* Total Searches */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <Search size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : kpis.totalSearches.toLocaleString()}</div>
            <div className="stat-label">Total Searches</div>
          </div>
        </div>

        {/* Zero-Result Searches */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <AlertCircle size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: kpis.zeroResultSearches > 0 ? '#ef4444' : undefined }}>
              {loading ? '...' : kpis.zeroResultSearches.toLocaleString()}
            </div>
            <div className="stat-label">Zero-Result Searches</div>
          </div>
        </div>

        {/* Zero-Result Rate */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : `${kpis.zeroResultRate}%`}</div>
            <div className="stat-label">Missed Search Rate</div>
          </div>
        </div>

        {/* Song Plays */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <Play size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : kpis.plays.toLocaleString()}</div>
            <div className="stat-label">Audio Plays</div>
          </div>
        </div>

        {/* Song Views */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Eye size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : kpis.views.toLocaleString()}</div>
            <div className="stat-label">Lyrics Views</div>
          </div>
        </div>

        {/* Downloads & Shares */}
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
            <Share2 size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {loading ? '...' : (kpis.downloads + kpis.shares).toLocaleString()}
            </div>
            <div className="stat-label">Downloads & Status Shares</div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Zero-Result Search Intelligence (Content Gap Analysis) ── */}
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
            background: 'rgba(239, 68, 68, 0.03)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                }}
              />
              <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--admin-text)' }}>
                Zero-Result Search Intelligence (Content Opportunities)
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  fontWeight: '700',
                }}
              >
                {zeroResultList.length} Missing Terms
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              These queries returned 0 results. Use this data to discover and add new songs users are requesting.
            </p>
          </div>

          {/* Quick filter input */}
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
              placeholder="Filter missing terms..."
              value={zeroResultFilter}
              onChange={(e) => setZeroResultFilter(e.target.value)}
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

        {/* Zero-Result Table */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            Loading search intelligence...
          </div>
        ) : zeroResultList.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={32} color="#22c55e" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)' }}>
              No zero-result searches found
            </div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
              All mobile searches within this time range matched published songs in your catalog.
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Requested Query</th>
                  <th style={{ width: '130px' }}>Times Searched</th>
                  <th style={{ width: '130px' }}>Unique Devices</th>
                  <th style={{ width: '140px' }}>Last Searched</th>
                  <th style={{ width: '170px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {zeroResultList.slice(0, 25).map((item) => (
                  <tr key={item.query}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontWeight: '600',
                            fontSize: '13px',
                            color: 'var(--admin-text)',
                            background: 'var(--admin-surface-2)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--admin-border)',
                          }}
                        >
                          {item.query}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: '#ef4444' }}>
                        {item.count} {item.count === 1 ? 'time' : 'times'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>
                        {item.uniqueDevices} {item.uniqueDevices === 1 ? 'device' : 'devices'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>
                        {formatTimeAgo(item.lastSearched)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleCreateSongWithTitle(item.query)}
                        className="btn-admin-primary"
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          gap: '4px',
                        }}
                        title={`Create a new song with title "${item.query}"`}
                      >
                        <Plus size={12} />
                        <span>Create Song</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Top Search Queries Leaderboard & Recent Stream ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* Top Search Terms */}
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--admin-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Top Search Terms</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                Most popular terms entered by users
              </p>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
              Top {topQueries.length}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              Loading leaderboard...
            </div>
          ) : topQueries.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
              No search logs available yet.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Query</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Count</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Avg Hits</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.map((t, idx) => (
                    <tr key={t.query}>
                      <td style={{ color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: '700' }}>
                        {idx + 1}
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--admin-text)' }}>
                          {t.query}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>
                        {t.count}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background:
                              Number(t.avgResults) === 0
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(34, 197, 94, 0.15)',
                            color: Number(t.avgResults) === 0 ? '#f87171' : '#4ade80',
                            fontWeight: '600',
                          }}
                        >
                          {t.avgResults}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Search Stream (Recent 15 Searches) */}
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--admin-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Recent Search Activity</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                Latest searches from mobile devices
              </p>
            </div>
            <Clock size={15} color="var(--admin-text-muted)" />
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              Loading recent searches...
            </div>
          ) : searchLogs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
              No recent searches recorded.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Results</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {searchLogs.slice(0, 15).map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--admin-text)' }}>
                          {log.query}
                        </div>
                        {log.device_id && (
                          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
                            {log.device_id.substring(0, 14)}...
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: log.results_count === 0 ? '#ef4444' : '#22c55e',
                          }}
                        >
                          {log.results_count}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                        {formatTimeAgo(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Song Engagement Leaderboard ── */}
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
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--admin-text)' }}>
              Song Engagement Leaderboard
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              Breakdown of audio plays, lyric views, offline downloads, and WhatsApp status shares per song.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search song filter */}
            <div style={{ position: 'relative', width: '200px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50)',
                  color: 'var(--admin-text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Filter songs..."
                value={engagementFilter}
                onChange={(e) => setEngagementFilter(e.target.value)}
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

            {/* Sort Dropdown */}
            <select
              value={engagementSortKey}
              onChange={(e) => setEngagementSortKey(e.target.value)}
              className="admin-input"
              style={{ fontSize: '12px', padding: '6px 10px', width: 'auto' }}
            >
              <option value="plays">Sort by Plays</option>
              <option value="views">Sort by Views</option>
              <option value="downloads">Sort by Downloads</option>
              <option value="shares">Sort by Status Shares</option>
              <option value="total">Sort by Total Interactions</option>
            </select>
          </div>
        </div>

        {/* Engagement Table */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            Loading song engagement metrics...
          </div>
        ) : songEngagementList.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <Music size={32} color="var(--admin-text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)' }}>
              No song interactions recorded
            </div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
              Engagement events will appear here as mobile users play, view, download, or share songs.
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Song</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Audio Plays</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Views</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Downloads</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Status Shares</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Favorites</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Total Events</th>
                </tr>
              </thead>
              <tbody>
                {songEngagementList.slice(0, 30).map((item) => (
                  <tr key={item.song_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.feature_image_url ? (
                          <img
                            src={item.feature_image_url}
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
                          <div
                            style={{
                              fontWeight: '600',
                              fontSize: '13px',
                              color: 'var(--admin-text)',
                              lineHeight: '1.2',
                            }}
                          >
                            {item.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                            {item.categoryName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#22c55e' }}>
                      {item.plays.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>
                      {item.views.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#a78bfa' }}>
                      {item.downloads.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#ec4899' }}>
                      {item.shares.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#f59e0b' }}>
                      {item.favorites.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>
                      {item.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
