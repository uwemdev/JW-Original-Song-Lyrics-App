import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Save, ArrowLeft, X } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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
    textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '600',
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
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
    background: published ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
    color: published ? '#22C55E' : '#EF4444',
  }),
  formGroup: { marginBottom: '16px' },
  actions: { display: 'flex', gap: '8px' },
  empty: { textAlign: 'center', padding: '40px', color: '#6B7280', fontSize: '14px' },
  imgThumb: { width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' },
};

export default function AdminDashboard() {
  const context = useOutletContext();
  const currentTab = context?.currentTab || 'songs';

  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  // Reset to list when tab changes
  useEffect(() => {
    setView('list');
    setErrorMsg('');
    setSuccessMsg('');
  }, [currentTab]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const [catsRes, songsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('songs').select('*, categories(name)').order('created_at', { ascending: false }),
      ]);

      if (catsRes.error) throw catsRes.error;
      if (songsRes.error) throw songsRes.error;

      setCategories(catsRes.data || []);
      setSongs(songsRes.data || []);
    } catch (err) {
      setErrorMsg('Failed to load data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

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
      setView('list');
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
    setErrorMsg('');
    setSuccessMsg('');
    setView('category-form');
  }

  function openEditCategory(cat) {
    setEditingCategory(cat);
    setCatForm({ name: cat.name || '', slug: cat.slug || '', sort_order: cat.sort_order || 0 });
    setErrorMsg('');
    setSuccessMsg('');
    setView('category-form');
  }

  async function saveCategory(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      if (editingCategory) {
        const { error } = await supabase.from('categories').update(catForm).eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert([catForm]);
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
  //  RENDER: LOADING
  // ═══════════════════════════════════════
  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#9CA3AF' }}>Loading data...</p>
      </div>
    );
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
          <button onClick={() => setView('list')} style={s.btnSecondary}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}

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

                <div style={s.formGroup}>
                  <label style={s.label}>MP3 URL</label>
                  <input
                    type="url"
                    value={songForm.mp3_url}
                    onChange={(e) => setSongForm({ ...songForm, mp3_url: e.target.value })}
                    placeholder="https://example.com/song.mp3"
                    style={s.input}
                  />
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
                    Published (visible to users)
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
              <button type="button" onClick={() => setView('list')} style={s.btnSecondary}>Cancel</button>
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
  //  RENDER: SONGS LIST
  // ═══════════════════════════════════════
  if (currentTab === 'songs') {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Songs</h1>
            <p style={s.subtitle}>{songs.length} total songs</p>
          </div>
          <button onClick={openAddSong} style={s.btnPrimary}>
            <Plus size={14} /> Add Song
          </button>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}
        {successMsg && <div style={s.success}>{successMsg}</div>}

        <div style={s.card}>
          {songs.length === 0 ? (
            <div style={s.empty}>
              <p>No songs yet. Click "Add Song" to create your first one.</p>
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}></th>
                  <th style={s.th}>Title</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Created</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song) => (
                  <tr key={song.id}>
                    <td style={s.td}>
                      {song.feature_image_url ? (
                        <img src={song.feature_image_url} alt="" style={s.imgThumb} />
                      ) : (
                        <div style={{ ...s.imgThumb, background: '#2d293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px', color: '#6B7280' }}>N/A</span>
                        </div>
                      )}
                    </td>
                    <td style={{ ...s.td, color: '#fff', fontWeight: '500' }}>{song.title}</td>
                    <td style={s.td}>{song.categories?.name || '—'}</td>
                    <td style={s.td}>
                      <span style={s.badge(song.is_published)}>
                        {song.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={s.td}>
                      {song.created_at ? new Date(song.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <div style={s.actions}>
                        <button onClick={() => openEditSong(song)} style={s.btnEdit}>
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => deleteSong(song.id)} style={s.btnDanger}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

  // ═══════════════════════════════════════
  //  FALLBACK — This was the bug! Old code
  //  had no fallback, returning undefined.
  // ═══════════════════════════════════════
  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Dashboard</h1>
      </div>
      <div style={s.card}>
        <p style={{ color: '#9CA3AF' }}>Select "Songs" or "Categories" from the sidebar to get started.</p>
      </div>
    </div>
  );
}
