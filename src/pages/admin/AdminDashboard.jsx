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

  if (loading && view === 'list') {
    return (
      <div className="flex flex-col gap-6 w-full h-full p-6">
        <div className="skeleton h-24 w-full"></div>
        <div className="skeleton h-64 w-full"></div>
      </div>
    );
  }

  // ==== SONG FORM ====
  if (view === 'song-form') {
    return (
      <div className="animate-slide-up max-w-5xl mx-auto">
        <header className="dashboard-topbar">
          <div>
            <h1 className="text-3xl font-extrabold mb-1">{editingSong ? 'Edit Song' : 'Add New Song'}</h1>
            <p className="text-secondary">Fill in the details below</p>
          </div>
          <button onClick={() => setView('list')} className="btn btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Songs
          </button>
        </header>
        
        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        <form onSubmit={handleSaveSong} className="card grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <div className="form-group mb-0">
              <label>Title</label>
              <input 
                type="text" 
                required
                value={songFormData.title}
                onChange={e => setSongFormData({...songFormData, title: e.target.value})}
                placeholder="e.g. Joyful Joyful"
              />
            </div>

            <div className="form-group mb-0">
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

            <div className="form-group mb-0">
              <label>Short Write-up</label>
              <textarea 
                rows="3"
                value={songFormData.writeup}
                onChange={e => setSongFormData({...songFormData, writeup: e.target.value})}
                placeholder="A brief description of the song..."
              ></textarea>
            </div>

            <div className="form-group mb-0">
              <label>MP3 URL (Online link)</label>
              <input 
                type="url" 
                value={songFormData.mp3_url}
                onChange={e => setSongFormData({...songFormData, mp3_url: e.target.value})}
                placeholder="https://example.com/song.mp3"
              />
            </div>

            <div className="form-group mb-0">
              <label>Feature Image (Upload)</label>
              {editingSong?.feature_image_url && !imageFile && (
                <div className="mb-3 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)] inline-block">
                  <img src={editingSong.feature_image_url} alt="Current" className="w-48 h-32 object-cover" />
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setImageFile(e.target.files[0])}
                className="w-full p-2 border border-dashed border-[rgba(255,255,255,0.2)] bg-transparent rounded-lg"
              />
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.05)] mt-2">
              <input 
                type="checkbox" 
                id="is_published"
                checked={songFormData.is_published}
                onChange={e => setSongFormData({...songFormData, is_published: e.target.checked})}
              />
              <label htmlFor="is_published" className="mb-0 text-white cursor-pointer">Published (visible to public)</label>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col h-full">
            <label>Lyrics (Rich Text)</label>
            <div className="flex-1 min-h-[400px]">
              <ReactQuill 
                theme="snow"
                value={songFormData.lyrics}
                onChange={(val) => setSongFormData({...songFormData, lyrics: val})}
                className="bg-transparent text-white h-[90%]"
              />
            </div>
          </div>
          
          <div className="md:col-span-2 flex justify-end gap-4 mt-4 pt-6 border-t border-[rgba(255,255,255,0.08)]">
            <button type="button" onClick={() => setView('list')} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
              <Save size={18} /> {saving ? 'Saving...' : 'Save Song'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==== CATEGORY FORM ====
  if (view === 'category-form') {
    return (
      <div className="animate-slide-up max-w-xl mx-auto">
        <header className="dashboard-topbar">
          <div>
            <h1 className="text-3xl font-extrabold mb-1">{editingCategory ? 'Edit Category' : 'Add New Category'}</h1>
            <p className="text-secondary">Manage your song categories</p>
          </div>
          <button onClick={() => setView('list')} className="btn btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        </header>
        
        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        <form onSubmit={handleSaveCategory} className="card flex flex-col gap-6">
          <div className="form-group mb-0">
            <label>Category Name</label>
            <input 
              type="text" 
              required
              value={categoryFormData.name}
              placeholder="e.g. Orchestral"
              onChange={e => {
                const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                setCategoryFormData({...categoryFormData, name: e.target.value, slug: newSlug});
              }}
            />
          </div>

          <div className="form-group mb-0">
            <label>Slug (URL friendly)</label>
            <input 
              type="text" 
              required
              value={categoryFormData.slug}
              placeholder="e.g. orchestral"
              onChange={e => setCategoryFormData({...categoryFormData, slug: e.target.value})}
            />
          </div>
          
          <div className="form-group mb-0">
            <label>Sort Order</label>
            <input 
              type="number" 
              value={categoryFormData.sort_order}
              onChange={e => setCategoryFormData({...categoryFormData, sort_order: parseInt(e.target.value) || 0})}
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-[rgba(255,255,255,0.08)]">
            <button type="button" onClick={() => setView('list')} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
              <Save size={18} /> {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==== LIST VIEW ====
  return (
    <div className="animate-slide-up">
      <header className="dashboard-topbar">
        <div>
          <h1 className="text-3xl font-extrabold mb-1">Welcome back!</h1>
          <p className="text-secondary">Manage your songs and categories</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleAddNewSong} className="btn btn-primary">
            <Plus size={18} className="mr-2" /> New Song
          </button>
          <button onClick={handleAddNewCategory} className="btn btn-secondary">
            <Plus size={18} className="mr-2" /> New Category
          </button>
        </div>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'songs' ? 'active' : ''}`}
          onClick={() => setActiveTab('songs')}
        >
          All Songs ({songs.length})
        </button>
        <button 
          className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories ({categories.length})
        </button>
      </div>

      <div className="table-container">
        {activeTab === 'songs' ? (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {songs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-secondary">No songs found. Create one!</td>
                </tr>
              ) : (
                songs.map(song => (
                  <tr key={song.id}>
                    <td className="font-semibold text-white">{song.title}</td>
                    <td>
                      <span className="bg-[rgba(139,92,246,0.15)] text-[#C4B5FD] px-3 py-1 rounded-full text-xs font-bold">
                        {song.categories?.name || '-'}
                      </span>
                    </td>
                    <td>
                      {song.is_published ? 
                        <span className="text-success text-sm flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success"></span> Published</span> : 
                        <span className="text-secondary text-sm flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary"></span> Draft</span>
                      }
                    </td>
                    <td className="text-right">
                      <button onClick={() => handleEditSong(song)} className="btn-icon text-secondary hover:text-white mx-1" title="Edit"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteSong(song.id)} className="btn-icon text-secondary hover:text-danger mx-1" title="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Slug</th>
                <th>Order</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-secondary">No categories found. Create one!</td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id}>
                    <td className="font-semibold text-white">{cat.name}</td>
                    <td className="text-secondary font-mono text-sm">{cat.slug}</td>
                    <td className="text-secondary">{cat.sort_order}</td>
                    <td className="text-right">
                      <button onClick={() => handleEditCategory(cat)} className="btn-icon text-secondary hover:text-white mx-1"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="btn-icon text-secondary hover:text-danger mx-1"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
