import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import FeedbackTab from './FeedbackTab';
import NotificationsTab from './NotificationsTab';
import AppUpdatesTab from './AppUpdatesTab';

// ReactQuill toolbar config
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean'],
  ],
};

// ─── Shared inline style helpers ───
const s = {
  page: { padding: '32px', maxWidth: '100%', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0 },
  subtitle: { fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0 0' },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '10px 18px', background: '#8B5CF6', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '10px 18px', background: '#2d293b', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  btnDanger: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '6px 10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  btnEdit: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '6px 10px', background: 'rgba(139,92,246,0.1)', color: '#A78BFA',
    border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  card: {
    background: '#17151f', border: '1px solid #2d293b', borderRadius: '12px', padding: '24px',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '12px', fontSize: '11px', fontWeight: '600',
    color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '1px solid #2d293b',
  },
  td: {
    padding: '12px', borderBottom: '1px solid rgba(45,41,59,0.5)', fontSize: '14px', color: '#D1D5DB',
  },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#9CA3AF', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 12px', background: '#0d0c11', border: '1px solid #2d293b',
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 12px', background: '#0d0c11', border: '1px solid #2d293b',
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    resize: 'vertical', fontFamily: 'inherit',
  },
  select: {
    width: '100%', padding: '10px 12px', background: '#0d0c11', border: '1px solid #2d293b',
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  },
  error: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#EF4444', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
  },
  success: {
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
    color: '#22C55E', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
  },
  badge: (published) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
    background: published ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
    color: published ? '#34D399' : '#F87171',
    border: published ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
    cursor: 'pointer', userSelect: 'none',
  }),
  formGroup: { marginBottom: '16px' },
  actions: { display: 'flex', gap: '6px', alignItems: 'center' },
  empty: { textAlign: 'center', padding: '40px', color: '#6B7280', fontSize: '14px' },
  imgThumb: { width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' },
};

export default function AdminDashboard() {
  const context = useOutletContext();
  const currentTab = context?.currentTab || 'songs';
  const [searchParams, setSearchParams] = useSearchParams();

  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [songPage, setSongPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);

  // Search & Filter state for Songs tab
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

  // Cleanup audio preview on unmount or view change
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

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
      openAddSong();
    }
  }, [searchParams]);

  // Reset to list when tab changes
  useEffect(() => {
    setView('list');
    setErrorMsg('');
    setSuccessMsg('');
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAudioId(null);
    }
  }, [currentTab]);

  // Fetch data with filters and pagination
  const fetchData = useCallback(async (page = songPage, search = songSearch, catId = categoryFilter, status = statusFilter) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const pageSize = 15;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      // Build songs query with search and filters
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

  // Trigger search when search/filter inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(songPage, songSearch, categoryFilter, statusFilter);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchData, songPage, songSearch, categoryFilter, statusFilter]);

  // ═══════════════════════════════════════
  //  QUICK ACTIONS
  // ═══════════════════════════════════════

  // 1. Audio Preview Player (inline test)
  const toggleAudioPreview = (song, e) => {
    if (e) e.stopPropagation();
    if (!song.mp3_url) {
      setErrorMsg(`No MP3 URL set for "${song.title}"`);
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
        setErrorMsg('Playback error: Audio URL is invalid or unreachable.');
        setPlayingAudioId(null);
      };
    }
  };

  // 2. 1-Click Toggle Published/Draft status
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

  // 3. Quick Copy Song ID
  const copySongId = (id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Close form and clear deep link params
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

  // ═══════════════════════════════════════
  //  SONG CRUD
  // ═══════════════════════════════════════
  function openAddSong() {
    setEditingSong(null);
    setSongForm({
      title: '', category_id: categories.length > 0 ? categories[0].id : '',
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
      setErrorMsg('Please select a category. Create one first in the Categories tab if none exist.');
      setSaving(false);
      return;
    }

    try {
      let feature_image_url = editingSong?.feature_image_url || '';

      // Upload image if provided
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
      setSuccessMsg('Song deleted.');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // ═══════════════════════════════════════
  //  CATEGORY CRUD
  // ═══════════════════════════════════════
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
      setSuccessMsg('Category deleted.');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // ═══════════════════════════════════════
  //  RENDER: FEEDBACK TAB
  // ═══════════════════════════════════════
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
      <div style={s.page}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>{editingSong ? 'Edit Song' : 'Add New Song'}</h1>
            <p style={s.subtitle}>Fill in the details below</p>
          </div>
          <button onClick={closeForm} style={s.btnSecondary}>
            <ArrowLeft size={14} /> Back to Songs
          </button>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}
        {successMsg && <div style={s.success}>{successMsg}</div>}

        <div style={s.card}>
          <form onSubmit={saveSong}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left column */}
              <div>
                <div style={s.formGroup}>
                  <label style={s.label}>Title *</label>
                  <input
                    type="text" required
                    value={songForm.title}
                    onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                    placeholder="e.g. Joyful Joyful"
                    style={s.input}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Category *</label>
                  <select
                    required
                    value={songForm.category_id}
                    onChange={(e) => setSongForm({ ...songForm, category_id: e.target.value })}
                    style={s.select}
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Short Write-up</label>
                  <textarea
                    rows={3}
                    value={songForm.writeup}
                    onChange={(e) => setSongForm({ ...songForm, writeup: e.target.value })}
                    placeholder="A brief description of the song..."
                    style={s.textarea}
                  />
                </div>

                {/* MP3 URL with quick test button */}
                <div style={s.formGroup}>
                  <label style={s.label}>MP3 URL</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      value={songForm.mp3_url}
                      onChange={(e) => setSongForm({ ...songForm, mp3_url: e.target.value })}
                      placeholder="https://example.com/song.mp3"
                      style={{ ...s.input, flex: 1 }}
                    />
                    {songForm.mp3_url && (
                      <button
                        type="button"
                        onClick={() => toggleAudioPreview({ id: 'form_test', mp3_url: songForm.mp3_url, title: songForm.title })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0 14px',
                          background: playingAudioId === 'form_test' ? '#8B5CF6' : '#2d293b',
                          border: '1px solid #3d3752',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {playingAudioId === 'form_test' ? <Pause size={14} /> : <Play size={14} />}
                        {playingAudioId === 'form_test' ? 'Stop' : 'Test Audio'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Feature Image</label>
                  {editingSong?.feature_image_url && !imageFile && (
                    <div style={{ marginBottom: '8px' }}>
                      <img src={editingSong.feature_image_url} alt="Current" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #2d293b' }} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    style={{ ...s.input, padding: '8px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#0d0c11', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={songForm.is_published}
                    onChange={(e) => setSongForm({ ...songForm, is_published: e.target.checked })}
                    style={{ accentColor: '#8B5CF6' }}
                  />
                  <label htmlFor="is_published" style={{ color: '#D1D5DB', fontSize: '13px', cursor: 'pointer', margin: 0 }}>
                    Published (visible to app users)
                  </label>
                </div>
              </div>

              {/* Right column — Lyrics */}
              <div>
                <label style={s.label}>Lyrics (Rich Text)</label>
                <style>{`
                  .admin-quill .ql-toolbar {
                    background: #0d0c11;
                    border: 1px solid #2d293b;
                    border-radius: 8px 8px 0 0;
                  }
                  .admin-quill .ql-toolbar .ql-stroke { stroke: #9CA3AF; }
                  .admin-quill .ql-toolbar .ql-fill { fill: #9CA3AF; }
                  .admin-quill .ql-toolbar .ql-picker-label { color: #9CA3AF; }
                  .admin-quill .ql-toolbar button:hover .ql-stroke,
                  .admin-quill .ql-toolbar .ql-active .ql-stroke { stroke: #A78BFA; }
                  .admin-quill .ql-toolbar button:hover .ql-fill,
                  .admin-quill .ql-toolbar .ql-active .ql-fill { fill: #A78BFA; }
                  .admin-quill .ql-container {
                    background: #0d0c11;
                    border: 1px solid #2d293b;
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    color: #fff;
                    font-size: 14px;
                    min-height: 450px;
                  }
                  .admin-quill .ql-editor { min-height: 450px; line-height: 1.8; }
                  .admin-quill .ql-editor.ql-blank::before { color: #6B7280; font-style: normal; }
                  .admin-quill .ql-picker-options { background: #17151f; border-color: #2d293b; }
                  .admin-quill .ql-picker-item { color: #D1D5DB; }
                  .admin-quill .ql-picker-item:hover { color: #A78BFA; }
                `}</style>
                <div className="admin-quill">
                  <ReactQuill
                    theme="snow"
                    value={songForm.lyrics}
                    onChange={(val) => setSongForm({ ...songForm, lyrics: val })}
                    modules={quillModules}
                    placeholder="Type or paste the song lyrics here..."
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #2d293b' }}>
              <button type="button" onClick={closeForm} style={s.btnSecondary}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...s.btnPrimary, opacity: saving ? 0.6 : 1 }}>
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
      <div style={s.page}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>{editingCategory ? 'Edit Category' : 'Add New Category'}</h1>
            <p style={s.subtitle}>Manage your song categories</p>
          </div>
          <button onClick={() => setView('list')} style={s.btnSecondary}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}

        <div style={{ ...s.card, maxWidth: '500px' }}>
          <form onSubmit={saveCategory}>
            <div style={s.formGroup}>
              <label style={s.label}>Category Name *</label>
              <input
                type="text" required
                value={catForm.name}
                placeholder="e.g. Orchestral"
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  setCatForm({ ...catForm, name, slug });
                }}
                style={s.input}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Slug</label>
              <input
                type="text" required
                value={catForm.slug}
                onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                placeholder="e.g. orchestral"
                style={s.input}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Sort Order</label>
              <input
                type="number"
                value={catForm.sort_order}
                onChange={(e) => setCatForm({ ...catForm, sort_order: parseInt(e.target.value) || 0 })}
                style={s.input}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Category Image</label>
              {editingCategory?.image_url && !catImageFile && (
                <div style={{ marginBottom: '8px' }}>
                  <img src={editingCategory.image_url} alt="Current" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #2d293b' }} />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCatImageFile(e.target.files[0])}
                style={{ ...s.input, padding: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #2d293b' }}>
              <button type="button" onClick={() => setView('list')} style={s.btnSecondary}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...s.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  RENDER: SONGS LIST (WITH SEARCH & QUICK ACTIONS)
  // ═══════════════════════════════════════
  if (currentTab === 'songs') {
    return (
      <div style={s.page}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Songs Library</h1>
            <p style={s.subtitle}>
              Showing {songs.length} of {totalSongsCount} songs · Page {songPage + 1}
            </p>
          </div>
          <button onClick={openAddSong} style={s.btnPrimary}>
            <Plus size={14} /> Add Song
          </button>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}
        {successMsg && <div style={s.success}>{successMsg}</div>}

        {/* Search, Category Filter, and Status Filter Toolbar */}
        <div style={{
          background: '#17151f',
          border: '1px solid #2d293b',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{
              flex: 1,
              minWidth: '240px',
              display: 'flex',
              alignItems: 'center',
              background: '#0d0c11',
              border: '1px solid #2d293b',
              borderRadius: '8px',
              padding: '0 12px',
              gap: '8px',
            }}>
              <Search size={16} color="#8B5CF6" />
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
                  padding: '10px 0',
                }}
              />
              {songSearch && (
                <button
                  onClick={() => {
                    setSongSearch('');
                    setSongPage(0);
                  }}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Selector */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSongPage(0);
              }}
              style={{
                width: '200px',
                padding: '10px 12px',
                background: '#0d0c11',
                border: '1px solid #2d293b',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Filter Status Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Filter:
            </span>
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
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: active ? '#8B5CF6' : '#221f2e',
                    color: active ? '#fff' : '#9CA3AF',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Songs Table with Quick Actions */}
        <div style={s.card}>
          {loading ? (
            <div style={s.empty}>Loading songs...</div>
          ) : songs.length === 0 ? (
            <div style={s.empty}>
              <p>No songs found matching your search or filters.</p>
              {(songSearch || categoryFilter || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSongSearch('');
                    setCategoryFilter('');
                    setStatusFilter('all');
                    setSongPage(0);
                  }}
                  style={{ ...s.btnSecondary, marginTop: '8px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={{ ...s.th, width: '48px' }}></th>
                    <th style={s.th}>Title</th>
                    <th style={s.th}>Category</th>
                    <th style={s.th}>Audio</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Created</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((song) => {
                    const isPlaying = playingAudioId === song.id;
                    return (
                      <tr key={song.id} style={{ transition: 'background 0.15s ease' }}>
                        {/* Cover Image Thumbnail */}
                        <td style={s.td}>
                          {song.feature_image_url ? (
                            <img src={song.feature_image_url} alt="" style={s.imgThumb} />
                          ) : (
                            <div style={{ ...s.imgThumb, background: '#252136', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Music size={16} color="#6B7280" />
                            </div>
                          )}
                        </td>

                        {/* Title & Short ID */}
                        <td style={{ ...s.td, color: '#fff', fontWeight: '500' }}>
                          <div>{song.title}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span>ID: {song.id.slice(0, 8)}...</span>
                            <button
                              onClick={(e) => copySongId(song.id, e)}
                              title="Copy full Song ID"
                              style={{ background: 'none', border: 'none', color: copiedId === song.id ? '#34D399' : '#6B7280', cursor: 'pointer', padding: 0 }}
                            >
                              {copiedId === song.id ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={s.td}>{song.categories?.name || '—'}</td>

                        {/* Audio Status & Inline Preview Player */}
                        <td style={s.td}>
                          {song.mp3_url ? (
                            <button
                              onClick={(e) => toggleAudioPreview(song, e)}
                              title={isPlaying ? 'Pause preview' : 'Play audio preview'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: isPlaying ? '#8B5CF6' : '#252136',
                                border: '1px solid #3c3552',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                              {isPlaying ? 'Playing' : 'Preview'}
                            </button>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#F87171',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}>
                              No Audio
                            </span>
                          )}
                        </td>

                        {/* Status (Clickable 1-Click Toggle Switch) */}
                        <td style={s.td}>
                          <span
                            onClick={(e) => togglePublishStatus(song, e)}
                            title="Click to toggle Published / Draft immediately"
                            style={s.badge(song.is_published)}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '3px', background: song.is_published ? '#34D399' : '#F87171' }} />
                            {song.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td style={{ ...s.td, fontSize: '12px', color: '#9CA3AF' }}>
                          {song.created_at ? new Date(song.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>

                        {/* Quick Actions */}
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          <div style={{ ...s.actions, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => openEditSong(song)}
                              style={s.btnEdit}
                              title="Edit song details and lyrics"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => deleteSong(song.id)}
                              style={s.btnDanger}
                              title="Delete song"
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

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #2d293b' }}>
                <button
                  onClick={() => setSongPage(p => Math.max(0, p - 1))}
                  disabled={songPage === 0}
                  style={{ ...s.btnSecondary, opacity: songPage === 0 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <span style={{ color: '#9CA3AF', fontSize: '13px' }}>
                  Page {songPage + 1} of {Math.ceil(totalSongsCount / 15) || 1}
                </span>
                <button
                  onClick={() => setSongPage(p => p + 1)}
                  disabled={!hasMoreSongs}
                  style={{ ...s.btnSecondary, opacity: !hasMoreSongs ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  RENDER: CATEGORIES LIST
  // ═══════════════════════════════════════
  if (currentTab === 'categories') {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Categories</h1>
            <p style={s.subtitle}>{categories.length} total categories</p>
          </div>
          <button onClick={openAddCategory} style={s.btnPrimary}>
            <Plus size={14} /> Add Category
          </button>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}
        {successMsg && <div style={s.success}>{successMsg}</div>}

        <div style={s.card}>
          {categories.length === 0 ? (
            <div style={s.empty}>
              <p>No categories yet. Click "Add Category" to create your first one.</p>
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}></th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Slug</th>
                  <th style={s.th}>Sort Order</th>
                  <th style={s.th}>Songs</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const songCount = songs.filter(s => s.category_id === cat.id).length;
                  return (
                    <tr key={cat.id}>
                      <td style={s.td}>
                        {cat.image_url ? (
                          <img src={cat.image_url} alt="" style={s.imgThumb} />
                        ) : (
                          <div style={{ ...s.imgThumb, background: '#2d293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#6B7280' }}>N/A</span>
                          </div>
                        )}
                      </td>
                      <td style={{ ...s.td, color: '#fff', fontWeight: '500' }}>{cat.name}</td>
                      <td style={s.td}>{cat.slug}</td>
                      <td style={s.td}>{cat.sort_order}</td>
                      <td style={s.td}>{songCount}</td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <div style={s.actions}>
                          <button onClick={() => openEditCategory(cat)} style={s.btnEdit}>
                            <Edit2 size={12} /> Edit
                          </button>
                          <button onClick={() => deleteCategory(cat.id)} style={s.btnDanger}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Dashboard</h1>
      </div>
      <div style={s.card}>
        <p style={{ color: '#9CA3AF' }}>Select a tab from the sidebar to manage your content.</p>
      </div>
    </div>
  );
}
