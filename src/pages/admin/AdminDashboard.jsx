import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchUnreadCountFromDb } from './feedbackUtils';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  ArrowLeft,
  X,
  Search,
  Play,
  Pause,
  Copy,
  Check,
  Filter,
  Volume2,
  Sparkles,
  Music,
  CheckCircle2,
  FolderTree,
  MessageSquare,
  Smartphone,
  Layers,
  Send,
  MoreVertical,
  Activity,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import FeedbackTab from './FeedbackTab';
import NotificationsTab from './NotificationsTab';
import AppUpdatesTab from './AppUpdatesTab';
import AnalyticsTab from './AnalyticsTab';
import CatalogHealthTab from './CatalogHealthTab';
import CurationTab from './CurationTab';
import AnnouncementsTab from './AnnouncementsTab';
import CommunityTab from './CommunityTab';
import SongImportExportModal from './SongImportExportModal';

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean'],
  ],
};

export default function AdminDashboard() {
  const context = useOutletContext();
  const currentTab = context?.currentTab || 'dashboard';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [songPage, setSongPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);

  // Dashboard Overview Stats
  const [dashboardStats, setDashboardStats] = useState({
    totalSongs: 0,
    totalCategories: 0,
    newFeedback: 0,
    appVersion: 'v1.0.2',
  });
  const [categorySongCounts, setCategorySongCounts] = useState({});

  // Song Health Checker state
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [healthScanning, setHealthScanning] = useState(false);
  const [healthFilter, setHealthFilter] = useState('all');
  const [healthReport, setHealthReport] = useState({
    total: 0,
    healthy: 0,
    issues: [],
    missingAudioCount: 0,
    missingLyricsCount: 0,
    missingCategoryCount: 0,
    draftCount: 0,
  });

  // Search & Filter state
  const [songSearch, setSongSearch] = useState(() => searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [totalSongsCount, setTotalSongsCount] = useState(0);

  // Quick action states
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const audioPlayerRef = useRef(null);

  // View: 'list' | 'song-form' | 'category-form'
  const [view, setView] = useState('list');
  const [editingSong, setEditingSong] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Song form
  const [songForm, setSongForm] = useState({
    title: '', category_id: '', writeup: '', lyrics: '', mp3_url: '', is_published: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Category form
  const [catForm, setCatForm] = useState({ name: '', slug: '', sort_order: 0 });
  const [catImageFile, setCatImageFile] = useState(null);

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      const [songsCountRes, catsCountRes, unreadFeedbackCount, versionRes, allSongsRes] = await Promise.all([
        supabase.from('songs').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        fetchUnreadCountFromDb(supabase),
        supabase.from('app_version_config').select('latest_version').eq('platform', 'android').limit(1).maybeSingle(),
        supabase.from('songs').select('category_id'),
      ]);

      const counts = {};
      if (allSongsRes.data) {
        allSongsRes.data.forEach((s) => {
          if (s.category_id) {
            counts[s.category_id] = (counts[s.category_id] || 0) + 1;
          }
        });
        setCategorySongCounts(counts);
      }

      setDashboardStats({
        totalSongs: songsCountRes.count || 0,
        totalCategories: catsCountRes.count || 0,
        newFeedback: unreadFeedbackCount || 0,
        appVersion: versionRes.data?.latest_version ? `v${versionRes.data.latest_version}` : 'v1.0.2',
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();

    const handleLocalUpdate = () => {
      fetchDashboardStats();
    };

    window.addEventListener('admin_feedback_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      window.removeEventListener('admin_feedback_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, [fetchDashboardStats]);

  // Handle URL deep links: editSongId, newSong, search, status
  useEffect(() => {
    const editSongId = searchParams.get('editSongId');
    const isNew = searchParams.get('newSong') === 'true';
    const searchUrl = searchParams.get('search');
    const statusUrl = searchParams.get('status');

    if (searchUrl !== null && searchUrl !== songSearch) {
      setSongSearch(searchUrl);
    }
    if (statusUrl !== null && statusUrl !== statusFilter) {
      setStatusFilter(statusUrl);
    }

    if (editSongId) {
      supabase
        .from('songs')
        .select('*, categories(name)')
        .eq('id', editSongId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            openEditSong(data);
          }
        });
    } else if (isNew) {
      const titleParam = searchParams.get('title') || '';
      openAddSong(titleParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setView('list');
    setErrorMsg('');
    setSuccessMsg('');
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAudioId(null);
    }
  }, [currentTab]);

  // Fetch data with server-side filters and pagination
  const fetchData = useCallback(async (page = songPage, search = songSearch, catId = categoryFilter, status = statusFilter) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const pageSize = 15;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('songs')
        .select('*, categories(name)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search && search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      if (catId) {
        query = query.eq('category_id', catId);
      }

      if (status === 'published') {
        query = query.eq('is_published', true);
      } else if (status === 'draft') {
        query = query.eq('is_published', false);
      } else if (status === 'no_audio') {
        query = query.or('mp3_url.is.null,mp3_url.eq.""');
      } else if (status === 'no_image') {
        query = query.or('feature_image_url.is.null,feature_image_url.eq.""');
      }

      query = query.range(from, to);

      const [catsRes, songsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        query,
      ]);

      if (catsRes.error) throw catsRes.error;
      if (songsRes.error) throw songsRes.error;

      setCategories(catsRes.data || []);
      setSongs(songsRes.data || []);
      setTotalSongsCount(songsRes.count || 0);
      setHasMoreSongs((songsRes.count || 0) > to + 1);
    } catch (err) {
      setErrorMsg('Failed to load data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [songPage, songSearch, categoryFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(songPage, songSearch, categoryFilter, statusFilter);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchData, songPage, songSearch, categoryFilter, statusFilter]);

  // Audio preview toggle
  const toggleAudioPreview = (song, e) => {
    if (e) e.stopPropagation();
    if (!song.mp3_url) {
      setErrorMsg(`No MP3 audio URL found for "${song.title}"`);
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

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
      audio.play().catch((err) => {
        setErrorMsg('Audio playback failed: ' + err.message);
        setPlayingAudioId(null);
      });
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => {
        setErrorMsg('Audio URL cannot be reached.');
        setPlayingAudioId(null);
      };
    }
  };

  // 1-Click Publish toggle
  const togglePublishStatus = async (song, e) => {
    if (e) e.stopPropagation();
    const nextStatus = !song.is_published;
    try {
      const { error } = await supabase
        .from('songs')
        .update({ is_published: nextStatus })
        .eq('id', song.id);

      if (error) throw error;

      setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, is_published: nextStatus } : s)));
      setSuccessMsg(`"${song.title}" marked as ${nextStatus ? 'Published' : 'Draft'}`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setErrorMsg('Failed to update status: ' + err.message);
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const copySongId = (id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const closeForm = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAudioId(null);
    }
    const params = new URLSearchParams(searchParams);
    params.delete('editSongId');
    params.delete('newSong');
    setSearchParams(params);
    setView('list');
  };

  function openAddSong(initialTitle = '') {
    setEditingSong(null);
    setSongForm({
      title: initialTitle || '', category_id: categories.length > 0 ? categories[0].id : '',
      writeup: '', lyrics: '', mp3_url: '', is_published: true,
    });
    setImageFile(null);
    setErrorMsg('');
    setSuccessMsg('');
    setView('song-form');
  }

  function openEditSong(song) {
    setEditingSong(song);
    setSongForm({
      title: song.title || '',
      category_id: song.category_id || '',
      writeup: song.writeup || '',
      lyrics: song.lyrics || '',
      mp3_url: song.mp3_url || '',
      is_published: song.is_published !== false,
    });
    setImageFile(null);
    setErrorMsg('');
    setSuccessMsg('');
    setView('song-form');
  }

  async function saveSong(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    if (!songForm.category_id) {
      setErrorMsg('Please select a category.');
      setSaving(false);
      return;
    }

    try {
      let feature_image_url = editingSong?.feature_image_url || '';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        feature_image_url = publicUrlData.publicUrl;
      }

      const songData = { ...songForm, feature_image_url };

      if (editingSong) {
        const { error } = await supabase.from('songs').update(songData).eq('id', editingSong.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('songs').insert([songData]);
        if (error) throw error;
      }

      await fetchData();
      fetchDashboardStats();
      setSuccessMsg(editingSong ? 'Song updated!' : 'Song created!');
      closeForm();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save song');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSong(id) {
    if (!window.confirm('Delete this song? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (error) throw error;
      setSongs(songs.filter(s => s.id !== id));
      fetchDashboardStats();
      setSuccessMsg('Song deleted.');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  function openAddCategory() {
    setEditingCategory(null);
    setCatForm({ name: '', slug: '', sort_order: 0 });
    setCatImageFile(null);
    setErrorMsg('');
    setSuccessMsg('');
    setView('category-form');
  }

  function openEditCategory(cat) {
    setEditingCategory(cat);
    setCatForm({ name: cat.name || '', slug: cat.slug || '', sort_order: cat.sort_order || 0 });
    setCatImageFile(null);
    setErrorMsg('');
    setSuccessMsg('');
    setView('category-form');
  }

  async function saveCategory(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      let image_url = editingCategory?.image_url || '';

      if (catImageFile) {
        const fileExt = catImageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, catImageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        image_url = publicUrlData.publicUrl;
      }

      const payload = { ...catForm, image_url };

      if (editingCategory) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert([payload]);
        if (error) throw error;
      }
      await fetchData();
      fetchDashboardStats();
      setSuccessMsg(editingCategory ? 'Category updated!' : 'Category created!');
      setView('list');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id) {
    if (!window.confirm('Delete this category and all its songs? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
      fetchDashboardStats();
      setSuccessMsg('Category deleted.');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // ═══════════════════════════════════════
  //  SONG HEALTH CHECKER
  // ═══════════════════════════════════════
  const runHealthCheck = useCallback(async () => {
    setHealthScanning(true);
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*, categories(name)')
        .order('song_number', { ascending: true });

      if (error) throw error;
      const allSongs = data || [];

      let missingAudio = 0;
      let missingLyrics = 0;
      let missingCategory = 0;
      let draft = 0;
      const issues = [];

      for (const song of allSongs) {
        const hasAudio = Boolean(song.mp3_url && song.mp3_url.trim().length > 0);
        const strippedLyrics = (song.lyrics || '').replace(/<[^>]*>/g, '').trim();
        const hasLyrics = strippedLyrics.length >= 15;
        const hasCategory = Boolean(song.category_id);
        const isPublished = song.is_published !== false;

        const songIssues = [];
        if (!hasAudio) {
          songIssues.push({ type: 'audio', label: 'Missing Audio MP3' });
          missingAudio++;
        }
        if (!hasLyrics) {
          songIssues.push({ type: 'lyrics', label: 'Missing Lyrics' });
          missingLyrics++;
        }
        if (!hasCategory) {
          songIssues.push({ type: 'category', label: 'No Category' });
          missingCategory++;
        }
        if (!isPublished) {
          songIssues.push({ type: 'draft', label: 'Unpublished Draft' });
          draft++;
        }

        if (songIssues.length > 0) {
          issues.push({
            ...song,
            songIssues,
            hasAudio,
            hasLyrics,
            hasCategory,
            isPublished,
          });
        }
      }

      setHealthReport({
        total: allSongs.length,
        healthy: allSongs.length - issues.filter((i) => !i.hasAudio || !i.hasLyrics || !i.hasCategory).length,
        issues,
        missingAudioCount: missingAudio,
        missingLyricsCount: missingLyrics,
        missingCategoryCount: missingCategory,
        draftCount: draft,
      });
    } catch (err) {
      console.error('Failed to run song health check:', err);
    } finally {
      setHealthScanning(false);
    }
  }, []);

  const renderHealthModal = () => {
    if (!healthModalOpen) return null;

    const filteredIssues = healthReport.issues.filter((item) => {
      if (healthFilter === 'audio') return !item.hasAudio;
      if (healthFilter === 'lyrics') return !item.hasLyrics;
      if (healthFilter === 'category') return !item.hasCategory;
      if (healthFilter === 'draft') return !item.isPublished;
      return true;
    });

    return (
      <div
        className="health-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) setHealthModalOpen(false);
        }}
      >
        <div className="health-modal-card">
          <div className="health-modal-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#a78bfa" />
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 }}>
                  Audio & Lyric Health Checker
                </h2>
              </div>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '4px 0 0 0' }}>
                Diagnostic scan across all songs for missing audio URLs, blank lyrics, or unassigned categories.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={runHealthCheck}
                disabled={healthScanning}
                className="btn-admin-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                title="Re-run diagnostic scan"
              >
                <RefreshCw size={13} className={healthScanning ? 'spin' : ''} />
                <span>Re-scan</span>
              </button>
              <button
                onClick={() => setHealthModalOpen(false)}
                className="btn-icon-admin"
                style={{ width: '32px', height: '32px' }}
                title="Close modal"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="health-summary-row">
            <div className="health-summary-stat">
              <span className="health-stat-label">Total Songs</span>
              <span className="health-stat-num">{healthReport.total}</span>
            </div>
            <div className="health-summary-stat healthy">
              <span className="health-stat-label">Fully Healthy</span>
              <span className="health-stat-num healthy">
                {healthReport.healthy}
              </span>
            </div>
            <div className="health-summary-stat warning">
              <span className="health-stat-label">Issues Found</span>
              <span className="health-stat-num warning">
                {healthReport.issues.length}
              </span>
            </div>
            <div className="health-summary-stat">
              <span className="health-stat-label">Missing Audio</span>
              <span className="health-stat-num danger">
                {healthReport.missingAudioCount}
              </span>
            </div>
            <div className="health-summary-stat">
              <span className="health-stat-label">Missing Lyrics</span>
              <span className="health-stat-num amber">
                {healthReport.missingLyricsCount}
              </span>
            </div>
            <div className="health-summary-stat">
              <span className="health-stat-label">No Category</span>
              <span className="health-stat-num purple">
                {healthReport.missingCategoryCount}
              </span>
            </div>
          </div>

          <div className="health-filter-bar">
            {[
              { key: 'all', label: `All Issues (${healthReport.issues.length})` },
              { key: 'audio', label: `Missing Audio (${healthReport.missingAudioCount})` },
              { key: 'lyrics', label: `Missing Lyrics (${healthReport.missingLyricsCount})` },
              { key: 'category', label: `No Category (${healthReport.missingCategoryCount})` },
              { key: 'draft', label: `Drafts (${healthReport.draftCount})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setHealthFilter(f.key)}
                className={`admin-chip ${healthFilter === f.key ? 'active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="health-modal-body">
            {healthScanning ? (
              <div className="admin-empty" style={{ padding: '40px 0' }}>
                <RefreshCw size={24} color="#8b5cf6" className="spin" style={{ marginBottom: '10px' }} />
                <div>Scanning song library in database...</div>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="admin-empty" style={{ padding: '40px 0' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '10px' }} />
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
                  No issues found in this category
                </div>
                <p style={{ color: '#a1a1aa', fontSize: '12px', marginTop: '4px' }}>
                  All scanned songs meet the required audio, lyric, and category criteria.
                </p>
              </div>
            ) : (
              filteredIssues.map((song) => (
                <div key={song.id} className="health-issue-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="health-song-number">
                        #{song.song_number || '?'}
                      </span>
                      <span className="health-song-title">
                        {song.title}
                      </span>
                      {song.categories?.name && (
                        <span className="health-cat-badge">
                          {song.categories.name}
                        </span>
                      )}
                    </div>
                    <div className="health-pills-row">
                      {song.songIssues.map((iss, idx) => (
                        <span key={idx} className={`health-issue-pill ${iss.type}`}>
                          {iss.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setHealthModalOpen(false);
                      navigate('/admin?tab=songs');
                      openEditSong(song);
                    }}
                    className="btn-admin-primary"
                    style={{ padding: '6px 12px', fontSize: '11px', flexShrink: 0 }}
                  >
                    <Edit2 size={12} />
                    <span>Fix Song</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  //  TAB DISPATCH
  // ═══════════════════════════════════════
  if (currentTab === 'curation') {
    return <CurationTab />;
  }

  if (currentTab === 'announcements') {
    return <AnnouncementsTab />;
  }

  if (currentTab === 'community') {
    return <CommunityTab />;
  }

  if (currentTab === 'health') {
    return <CatalogHealthTab />;
  }

  if (currentTab === 'analytics') {
    return <AnalyticsTab />;
  }

  if (currentTab === 'feedback') {
    return <FeedbackTab />;
  }

  if (currentTab === 'notifications') {
    return <NotificationsTab />;
  }

  if (currentTab === 'updates') {
    return <AppUpdatesTab />;
  }

  // ═══════════════════════════════════════
  //  RENDER: SONG FORM
  // ═══════════════════════════════════════
  if (view === 'song-form') {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>{editingSong ? 'Edit Song' : 'Add New Song'}</h1>
            <p className="page-subtitle">Update song information, audio files, and lyrics</p>
          </div>
          <button onClick={closeForm} className="btn-admin-secondary">
            <ArrowLeft size={14} /> Back to Songs
          </button>
        </div>

        {errorMsg && <div className="admin-alert error">{errorMsg}</div>}
        {successMsg && <div className="admin-alert success">{successMsg}</div>}

        <div className="admin-card">
          <form onSubmit={saveSong}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Left Column: Metadata & Audio */}
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <label className="admin-label">Song Title *</label>
                  <input
                    type="text"
                    required
                    value={songForm.title}
                    onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                    placeholder="e.g. Rise Again"
                    className="admin-input"
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="admin-label">Category *</label>
                  <select
                    required
                    value={songForm.category_id}
                    onChange={(e) => setSongForm({ ...songForm, category_id: e.target.value })}
                    className="admin-select"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="admin-label">Short Write-up</label>
                  <textarea
                    rows={3}
                    value={songForm.writeup}
                    onChange={(e) => setSongForm({ ...songForm, writeup: e.target.value })}
                    placeholder="Brief description or background for this song..."
                    className="admin-textarea"
                  />
                </div>

                {/* MP3 URL + Inline Audio Test Button */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="admin-label">MP3 Audio URL</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      value={songForm.mp3_url}
                      onChange={(e) => setSongForm({ ...songForm, mp3_url: e.target.value })}
                      placeholder="https://example.com/song.mp3"
                      className="admin-input"
                      style={{ flex: 1 }}
                    />
                    {songForm.mp3_url && (
                      <button
                        type="button"
                        onClick={() => toggleAudioPreview({ id: 'form_test', mp3_url: songForm.mp3_url, title: songForm.title })}
                        className="btn-admin-secondary"
                        style={{
                          background: playingAudioId === 'form_test' ? '#8b5cf6' : undefined,
                          color: playingAudioId === 'form_test' ? '#fff' : undefined,
                        }}
                      >
                        {playingAudioId === 'form_test' ? <Pause size={13} /> : <Play size={13} />}
                        <span>{playingAudioId === 'form_test' ? 'Stop' : 'Test'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="admin-label">Feature Image</label>
                  {editingSong?.feature_image_url && !imageFile && (
                    <div style={{ marginBottom: '8px' }}>
                      <img src={editingSong.feature_image_url} alt="Current" style={{ width: '80px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #27272a' }} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="admin-input"
                    style={{ padding: '6px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={songForm.is_published}
                    onChange={(e) => setSongForm({ ...songForm, is_published: e.target.checked })}
                    style={{ accentColor: '#8b5cf6', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="is_published" style={{ color: '#fafafa', fontSize: '13px', cursor: 'pointer', margin: 0, fontWeight: '500' }}>
                    Published (visible to mobile app users)
                  </label>
                </div>
              </div>

              {/* Right Column: Lyrics Editor */}
              <div>
                <label className="admin-label">Lyrics (Rich Text)</label>
                <div className="admin-quill">
                  <ReactQuill
                    theme="snow"
                    value={songForm.lyrics}
                    onChange={(val) => setSongForm({ ...songForm, lyrics: val })}
                    modules={quillModules}
                    placeholder="Enter or paste song lyrics here..."
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #27272a' }}>
              <button type="button" onClick={closeForm} className="btn-admin-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-admin-primary">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Song'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  RENDER: CATEGORY FORM
  // ═══════════════════════════════════════
  if (view === 'category-form') {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>{editingCategory ? 'Edit Category' : 'Add New Category'}</h1>
            <p className="page-subtitle">Organize your catalog by genres and sections</p>
          </div>
          <button onClick={() => setView('list')} className="btn-admin-secondary">
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        {errorMsg && <div className="admin-alert error">{errorMsg}</div>}

        <div className="admin-card" style={{ maxWidth: '480px' }}>
          <form onSubmit={saveCategory}>
            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Category Name *</label>
              <input
                type="text"
                required
                value={catForm.name}
                placeholder="e.g. Original Songs"
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  setCatForm({ ...catForm, name, slug });
                }}
                className="admin-input"
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Slug</label>
              <input
                type="text"
                required
                value={catForm.slug}
                onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                placeholder="e.g. original-songs"
                className="admin-input"
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Sort Order</label>
              <input
                type="number"
                value={catForm.sort_order}
                onChange={(e) => setCatForm({ ...catForm, sort_order: parseInt(e.target.value, 10) || 0 })}
                className="admin-input"
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="admin-label">Category Image</label>
              {editingCategory?.image_url && !catImageFile && (
                <div style={{ marginBottom: '8px' }}>
                  <img src={editingCategory.image_url} alt="Current" style={{ width: '80px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #27272a' }} />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCatImageFile(e.target.files[0])}
                className="admin-input"
                style={{ padding: '6px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #27272a' }}>
              <button type="button" onClick={() => setView('list')} className="btn-admin-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-admin-primary">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  RENDER: DASHBOARD OVERVIEW (SCREEN 1)
  // ═══════════════════════════════════════
  if (currentTab === 'dashboard') {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>Dashboard</h1>
            <p className="page-subtitle">Manage songs, categories, user feedback, and app updates</p>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="admin-stats-grid">
          {/* Total Songs */}
          <div className="admin-stat-card" onClick={() => navigate('/admin?tab=songs')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Music size={20} />
            </div>
            <div>
              <div className="stat-value">{dashboardStats.totalSongs}</div>
              <div className="stat-label">Total Songs</div>
            </div>
          </div>

          {/* Categories */}
          <div className="admin-stat-card" onClick={() => navigate('/admin?tab=categories')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Layers size={20} />
            </div>
            <div>
              <div className="stat-value">{dashboardStats.totalCategories}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>

          {/* New Feedback */}
          <div className="admin-stat-card" onClick={() => navigate('/admin?tab=feedback')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="stat-value">{dashboardStats.newFeedback}</div>
              <div className="stat-label">New Feedback</div>
            </div>
          </div>

          {/* App Version */}
          <div className="admin-stat-card" onClick={() => navigate('/admin?tab=updates')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
              <Smartphone size={20} />
            </div>
            <div>
              <div className="stat-value">{dashboardStats.appVersion}</div>
              <div className="stat-label">App Version</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-card">
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Quick Actions
          </div>
          <div className="admin-quick-actions">
            <button
              onClick={openAddSong}
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', padding: '12px 14px' }}
            >
              <Plus size={15} color="#8b5cf6" />
              <span>Add Song</span>
            </button>

            <button
              onClick={openAddCategory}
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', padding: '12px 14px' }}
            >
              <Plus size={15} color="#3b82f6" />
              <span>Add Category</span>
            </button>

            <button
              onClick={() => navigate('/admin?tab=notifications')}
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', padding: '12px 14px' }}
            >
              <Send size={15} color="#f59e0b" />
              <span>Send Notification</span>
            </button>

            <button
              onClick={() => {
                setHealthModalOpen(true);
                runHealthCheck();
              }}
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', padding: '12px 14px' }}
            >
              <Activity size={15} color="#10b981" />
              <span>Song Health Check</span>
            </button>

            <button
              onClick={() => setImportExportModalOpen(true)}
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', padding: '12px 14px' }}
            >
              <FileSpreadsheet size={15} color="#a78bfa" />
              <span>Bulk Import / Export</span>
            </button>

            <button
              onClick={() => navigate('/admin?tab=updates')}
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', padding: '12px 14px' }}
            >
              <Smartphone size={15} color="#22c55e" />
              <span>Update App</span>
            </button>
          </div>
        </div>

        {renderHealthModal()}

        <SongImportExportModal
          isOpen={importExportModalOpen}
          onClose={() => setImportExportModalOpen(false)}
          categories={categories}
          existingSongs={songs}
          onImportComplete={() => {
            fetchData();
            fetchDashboardStats();
            setSuccessMsg('Bulk song import completed.');
            setTimeout(() => setSuccessMsg(''), 3000);
          }}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  RENDER: SONGS LIST (SCREEN 2)
  // ═══════════════════════════════════════
  if (currentTab === 'songs') {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>Songs Library</h1>
            <p className="page-subtitle">
              Showing {songs.length} of {totalSongsCount} songs
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setImportExportModalOpen(true)}
              className="btn-admin-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Bulk import songs from CSV/JSON or export catalog backup"
            >
              <FileSpreadsheet size={14} color="#a78bfa" />
              <span>Import / Export</span>
            </button>
            <button
              onClick={() => {
                setHealthModalOpen(true);
                runHealthCheck();
              }}
              className="btn-admin-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Audit songs for missing audio, empty lyrics, or unassigned categories"
            >
              <Activity size={14} color="#a78bfa" />
              <span>Health Check</span>
            </button>
            <button onClick={openAddSong} className="btn-admin-primary">
              <Plus size={14} /> Add Song
            </button>
          </div>
        </div>

        {errorMsg && <div className="admin-alert error">{errorMsg}</div>}
        {successMsg && <div className="admin-alert success">{successMsg}</div>}

        {/* Toolbar: Search, Category, Status */}
        <div className="admin-card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
            {/* Search Input */}
            <div style={{
              flex: 1,
              minWidth: '220px',
              display: 'flex',
              alignItems: 'center',
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '0 10px',
              gap: '6px',
            }}>
              <Search size={14} color="#8b5cf6" />
              <input
                type="text"
                placeholder="Search songs by title..."
                value={songSearch}
                onChange={(e) => {
                  setSongSearch(e.target.value);
                  setSongPage(0);
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  padding: '8px 0',
                }}
              />
              {songSearch && (
                <button
                  onClick={() => {
                    setSongSearch('');
                    setSongPage(0);
                  }}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSongPage(0);
              }}
              className="admin-select"
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Filter Status Chips */}
          <div className="admin-filter-bar">
            {[
              { key: 'all', label: 'All Songs' },
              { key: 'published', label: 'Published' },
              { key: 'draft', label: 'Drafts' },
              { key: 'no_audio', label: 'Missing Audio' },
              { key: 'no_image', label: 'Missing Image' },
            ].map((st) => {
              const active = statusFilter === st.key;
              return (
                <button
                  key={st.key}
                  onClick={() => {
                    setStatusFilter(st.key);
                    setSongPage(0);
                  }}
                  className={`admin-chip ${active ? 'active' : ''}`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content: Desktop Table + Mobile Cards */}
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div className="admin-empty">Loading songs...</div>
          ) : songs.length === 0 ? (
            <div className="admin-empty">
              <p>No songs found matching your search or filters.</p>
              {(songSearch || categoryFilter || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSongSearch('');
                    setCategoryFilter('');
                    setStatusFilter('all');
                    setSongPage(0);
                  }}
                  className="btn-admin-secondary"
                  style={{ marginTop: '8px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Song Title</th>
                      <th>Category</th>
                      <th>Audio</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song) => {
                      const isPlaying = playingAudioId === song.id;
                      return (
                        <tr key={song.id}>
                          <td>
                            {song.feature_image_url ? (
                              <img src={song.feature_image_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#1c1c1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Music size={15} color="#71717a" />
                              </div>
                            )}
                          </td>

                          <td>
                            <div style={{ color: '#fff', fontWeight: '500' }}>{song.title}</div>
                            <div style={{ fontSize: '10px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span>ID: {song.id.slice(0, 8)}...</span>
                              <button
                                onClick={(e) => copySongId(song.id, e)}
                                title="Copy Song ID"
                                style={{ background: 'none', border: 'none', color: copiedId === song.id ? '#22c55e' : '#71717a', cursor: 'pointer', padding: 0 }}
                              >
                                {copiedId === song.id ? <Check size={10} /> : <Copy size={10} />}
                              </button>
                            </div>
                          </td>

                          <td>{song.categories?.name || '—'}</td>

                          <td>
                            {song.mp3_url ? (
                              <button
                                onClick={(e) => toggleAudioPreview(song, e)}
                                title={isPlaying ? 'Pause' : 'Play audio preview'}
                                className="btn-admin-secondary"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  background: isPlaying ? '#8b5cf6' : undefined,
                                  color: isPlaying ? '#fff' : undefined,
                                }}
                              >
                                {isPlaying ? <Pause size={11} /> : <Play size={11} />}
                                <span>{isPlaying ? 'Playing' : 'Preview'}</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                                No Audio
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              onClick={(e) => togglePublishStatus(song, e)}
                              title="Click to toggle Published / Draft"
                              className={`admin-badge ${song.is_published ? 'published' : 'draft'}`}
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: song.is_published ? '#22c55e' : '#f87171' }} />
                              {song.is_published ? 'Published' : 'Draft'}
                            </span>
                          </td>

                          <td style={{ fontSize: '11px', color: '#a1a1aa' }}>
                            {song.created_at ? new Date(song.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button onClick={() => openEditSong(song)} className="btn-admin-edit" title="Edit song">
                                <Edit2 size={11} />
                              </button>
                              <button onClick={() => deleteSong(song.id)} className="btn-admin-danger" title="Delete song">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="admin-song-cards" style={{ padding: '12px' }}>
                {songs.map((song) => {
                  const isPlaying = playingAudioId === song.id;
                  return (
                    <div key={song.id} className="admin-song-card">
                      {song.feature_image_url ? (
                        <img src={song.feature_image_url} alt="" className="song-card-img" />
                      ) : (
                        <div className="song-card-img-placeholder">
                          <Music size={18} color="#71717a" />
                        </div>
                      )}

                      <div className="song-card-info">
                        <div className="song-card-title">{song.title}</div>
                        <div className="song-card-category">{song.categories?.name || 'Uncategorized'}</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span
                            onClick={(e) => togglePublishStatus(song, e)}
                            className={`admin-badge ${song.is_published ? 'published' : 'draft'}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: song.is_published ? '#22c55e' : '#f87171' }} />
                            {song.is_published ? 'Published' : 'Draft'}
                          </span>

                          {song.mp3_url && (
                            <button
                              onClick={(e) => toggleAudioPreview(song, e)}
                              className="btn-icon-admin"
                              style={{
                                width: '28px',
                                height: '28px',
                                background: isPlaying ? '#8b5cf6' : undefined,
                                color: isPlaying ? '#fff' : undefined,
                              }}
                              title={isPlaying ? 'Pause' : 'Play audio'}
                            >
                              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button onClick={() => openEditSong(song)} className="btn-admin-edit" style={{ padding: '6px' }} title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => deleteSong(song.id)} className="btn-admin-danger" style={{ padding: '6px' }} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="admin-pagination" style={{ padding: '12px 16px' }}>
                <button
                  onClick={() => setSongPage((p) => Math.max(0, p - 1))}
                  disabled={songPage === 0}
                  className="btn-admin-secondary"
                  style={{ opacity: songPage === 0 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <span style={{ color: '#a1a1aa', fontSize: '12px' }}>
                  Page {songPage + 1} of {Math.ceil(totalSongsCount / 15) || 1}
                </span>
                <button
                  onClick={() => setSongPage((p) => p + 1)}
                  disabled={!hasMoreSongs}
                  className="btn-admin-secondary"
                  style={{ opacity: !hasMoreSongs ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {renderHealthModal()}

        <SongImportExportModal
          isOpen={importExportModalOpen}
          onClose={() => setImportExportModalOpen(false)}
          categories={categories}
          existingSongs={songs}
          onImportComplete={() => {
            fetchData();
            fetchDashboardStats();
            setSuccessMsg('Bulk song import completed.');
            setTimeout(() => setSuccessMsg(''), 3000);
          }}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  RENDER: CATEGORIES LIST (SCREEN 3)
  // ═══════════════════════════════════════
  if (currentTab === 'categories') {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>Categories</h1>
            <p className="page-subtitle">{categories.length} total categories</p>
          </div>
          <button onClick={openAddCategory} className="btn-admin-primary">
            <Plus size={14} /> Add Category
          </button>
        </div>

        {errorMsg && <div className="admin-alert error">{errorMsg}</div>}
        {successMsg && <div className="admin-alert success">{successMsg}</div>}

        {categories.length === 0 ? (
          <div className="admin-card">
            <div className="admin-empty">
              <p>No categories yet. Click "Add Category" to create your first one.</p>
            </div>
          </div>
        ) : (
          /* Cards Grid Matching Screen 3 in Reference */
          <div className="admin-category-grid">
            {categories.map((cat) => {
              const count = categorySongCounts[cat.id] || 0;
              return (
                <div key={cat.id} className="admin-category-card">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt="" className="cat-img" />
                  ) : (
                    <div className="cat-img-placeholder">
                      <FolderTree size={20} color="#71717a" />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '3px' }}>
                      {count} songs · Order: {cat.sort_order}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="btn-admin-edit"
                      title="Edit Category"
                      style={{ padding: '6px 8px' }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="btn-admin-danger"
                      title="Delete Category"
                      style={{ padding: '6px 8px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Dashboard</h1>
      </div>
      <div className="admin-card">
        <p style={{ color: '#a1a1aa' }}>Select a tab from the sidebar to manage your content.</p>
      </div>
    </div>
  );
}
