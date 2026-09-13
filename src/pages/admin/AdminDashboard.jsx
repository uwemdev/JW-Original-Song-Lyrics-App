import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, X, Save, ArrowLeft } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
export default function AdminDashboard() {
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('songs');
  
  // View state: 'list', 'song-form', 'category-form'
  const [view, setView] = useState('list');
  const [editingSong, setEditingSong] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form states
  const [songFormData, setSongFormData] = useState({
    title: '',
    category_id: '',
    writeup: '',
    lyrics: '',
    mp3_url: '',
    is_published: true,
  });
  
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    sort_order: 0
  });

  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [catsRes, songsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('songs').select('*, categories(name)').order('created_at', { ascending: false })
      ]);
      
      if (catsRes.error) throw catsRes.error;
      if (songsRes.error) throw songsRes.error;
      
      setCategories(catsRes.data || []);
      setSongs(songsRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setErrorMsg("Failed to load data. Make sure your database tables are created.");
    } finally {
      setLoading(false);
    }
  }

  // ---- SONGS LOGIC ----
  const handleDeleteSong = async (id) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      await supabase.from('songs').delete().eq('id', id);
      setSongs(songs.filter(s => s.id !== id));
    }
  };

  const handleEditSong = (song) => {
    setErrorMsg('');
    setEditingSong(song);
    setSongFormData({
      title: song.title || '',
      category_id: song.category_id || '',
      writeup: song.writeup || '',
      lyrics: song.lyrics || '',
      mp3_url: song.mp3_url || '',
      is_published: song.is_published,
    });
    setImageFile(null);
    setView('song-form');
  };

  const handleAddNewSong = () => {
    setErrorMsg('');
    setEditingSong(null);
    setSongFormData({
      title: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      writeup: '',
      lyrics: '',
      mp3_url: '',
      is_published: true,
    });
    setImageFile(null);
    setView('song-form');
  };

  const handleSaveSong = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    
    if (!songFormData.category_id) {
      setErrorMsg("Please select a category first. If there are none, create one in the Categories tab.");
      setSaving(false);
      return;
    }

    try {
      let feature_image_url = editingSong?.feature_image_url || '';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);
          
        feature_image_url = publicUrlData.publicUrl;
      }

      const songData = { ...songFormData, feature_image_url };

      if (editingSong) {
        const { error } = await supabase.from('songs').update(songData).eq('id', editingSong.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('songs').insert([songData]);
        if (error) throw error;
      }

      await fetchData();
      setView('list');
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- CATEGORY LOGIC ----
  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure? This will delete the category and all its songs.')) {
      await supabase.from('categories').delete().eq('id', id);
      await fetchData();
    }
  };

  const handleEditCategory = (cat) => {
    setErrorMsg('');
    setEditingCategory(cat);
    setCategoryFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      sort_order: cat.sort_order || 0
    });
    setView('category-form');
  };

  const handleAddNewCategory = () => {
    setErrorMsg('');
    setEditingCategory(null);
    setCategoryFormData({ name: '', slug: '', sort_order: 0 });
    setView('category-form');
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    
    try {
      if (editingCategory) {
        const { error } = await supabase.from('categories').update(categoryFormData).eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert([categoryFormData]);
        if (error) throw error;
      }
      await fetchData();
      setView('list');
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && view === 'list') return <div className="p-4 text-center">Loading dashboard...</div>;

  // ==== SONG FORM ====
  if (view === 'song-form') {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="btn-icon">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold">{editingSong ? 'Edit Song' : 'Add New Song'}</h2>
        </div>
        
        {errorMsg && <div className="bg-danger/20 text-danger p-3 rounded mb-4">{errorMsg}</div>}

        <form onSubmit={handleSaveSong} className="card">
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              required
              value={songFormData.title}
              onChange={e => setSongFormData({...songFormData, title: e.target.value})}
            />
          </div>

          <div className="mb-4">
            <label>Category</label>
            <select 
              required
              value={songFormData.category_id}
              onChange={e => setSongFormData({...songFormData, category_id: e.target.value})}
            >
              <option value="" disabled>Select a category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label>Short Write-up</label>
            <textarea 
              rows="2"
              value={songFormData.writeup}
              onChange={e => setSongFormData({...songFormData, writeup: e.target.value})}
            ></textarea>
          </div>

          <div className="mb-4">
            <label>Lyrics (preserve formatting)</label>
            <ReactQuill 
              theme="snow"
              value={songFormData.lyrics}
              onChange={(val) => setSongFormData({...songFormData, lyrics: val})}
              className="bg-white text-black rounded mt-1"
            />
          </div>

          <div className="mb-4">
            <label>Feature Image (Upload)</label>
            {editingSong?.feature_image_url && !imageFile && (
              <img src={editingSong.feature_image_url} alt="Current" className="w-32 h-32 object-cover rounded mb-2" />
            )}
            <input 
              type="file" 
              accept="image/*"
              onChange={e => setImageFile(e.target.files[0])}
              style={{ border: 'none', padding: 0 }}
            />
          </div>

          <div className="mb-6">
            <label>MP3 URL (Online link)</label>
            <input 
              type="url" 
              value={songFormData.mp3_url}
              onChange={e => setSongFormData({...songFormData, mp3_url: e.target.value})}
              placeholder="https://example.com/song.mp3"
            />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="is_published"
              checked={songFormData.is_published}
              onChange={e => setSongFormData({...songFormData, is_published: e.target.checked})}
              style={{ width: 'auto', marginBottom: 0 }}
            />
            <label htmlFor="is_published" style={{ marginBottom: 0 }}>Published (visible to public)</label>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => setView('list')} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Song'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==== CATEGORY FORM ====
  if (view === 'category-form') {
    return (
      <div className="animate-fade-in max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="btn-icon">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
        </div>
        
        {errorMsg && <div className="bg-danger/20 text-danger p-3 rounded mb-4">{errorMsg}</div>}

        <form onSubmit={handleSaveCategory} className="card">
          <div className="mb-4">
            <label>Name</label>
            <input 
              type="text" 
              required
              value={categoryFormData.name}
              onChange={e => {
                // Auto-generate slug from name
                const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                setCategoryFormData({...categoryFormData, name: e.target.value, slug: newSlug});
              }}
            />
          </div>

          <div className="mb-4">
            <label>Slug (URL friendly)</label>
            <input 
              type="text" 
              required
              value={categoryFormData.slug}
              onChange={e => setCategoryFormData({...categoryFormData, slug: e.target.value})}
            />
          </div>
          
          <div className="mb-6">
            <label>Sort Order (Number)</label>
            <input 
              type="number" 
              value={categoryFormData.sort_order}
              onChange={e => setCategoryFormData({...categoryFormData, sort_order: parseInt(e.target.value) || 0})}
            />
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => setView('list')} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==== LIST VIEW ====
  return (
    <div className="animate-fade-in">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'songs' ? 'active' : ''}`}
          onClick={() => setActiveTab('songs')}
        >
          Songs
        </button>
        <button 
          className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
      </div>

      {activeTab === 'songs' ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Songs</h2>
            <button onClick={handleAddNewSong} className="btn btn-primary flex items-center gap-2">
              <Plus size={18} /> Add Song
            </button>
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-4 font-bold text-secondary text-sm">Title</th>
                  <th className="p-4 font-bold text-secondary text-sm">Category</th>
                  <th className="p-4 font-bold text-secondary text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-secondary">
                      No songs found.
                    </td>
                  </tr>
                ) : (
                  songs.map(song => (
                    <tr key={song.id} className="border-b border-gray-800 hover:bg-bg-hover">
                      <td className="p-4 font-medium">{song.title}</td>
                      <td className="p-4 text-sm text-secondary">{song.categories?.name || '-'}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleEditSong(song)} className="btn-icon text-secondary hover:text-primary mx-1"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteSong(song.id)} className="btn-icon text-secondary hover:text-danger mx-1"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Categories</h2>
            <button onClick={handleAddNewCategory} className="btn btn-primary flex items-center gap-2">
              <Plus size={18} /> Add Category
            </button>
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-4 font-bold text-secondary text-sm">Name</th>
                  <th className="p-4 font-bold text-secondary text-sm">Slug</th>
                  <th className="p-4 font-bold text-secondary text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-secondary">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map(cat => (
                    <tr key={cat.id} className="border-b border-gray-800 hover:bg-bg-hover">
                      <td className="p-4 font-medium">{cat.name}</td>
                      <td className="p-4 text-sm text-secondary">{cat.slug}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleEditCategory(cat)} className="btn-icon text-secondary hover:text-primary mx-1"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="btn-icon text-secondary hover:text-danger mx-1"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
