import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, X, Save, ArrowLeft, Users, Music as MusicIcon, PlayCircle, DollarSign, Clock, CheckCircle, Flag, Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function AdminDashboard() {
  const { currentTab } = useOutletContext() || { currentTab: 'dashboard' };
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // ==== DASHBOARD VIEW ====
  if (currentTab === 'dashboard' && view === 'list') {
    return (
      <div className="animate-slide-up">
        {/* Banner */}
        <div className="mb-8 p-8 rounded-xl border border-[#2d293b] bg-gradient-to-r from-[#170c26] to-[#0d0c11] relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#2d1b4e 1px, transparent 1px), linear-gradient(90deg, #2d1b4e 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-[#F472B6] opacity-10 filter blur-[80px] rounded-full"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-[#F472B6]"></div>
              <span className="text-xs font-bold tracking-wider text-[#A78BFA] uppercase">Overview</span>
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Dashboard</h2>
            <p className="text-[#9CA3AF] mb-6">Welcome back. Platform health at a glance.</p>
            
            <div className="flex gap-4">
              <span className="px-3 py-1.5 rounded bg-[#17151f] border border-[#2d293b] text-xs font-bold text-white shadow-sm">
                {songs.length} SONGS
              </span>
              <span className="px-3 py-1.5 rounded bg-[#17151f] border border-[#2d293b] text-xs font-bold text-white shadow-sm">
                {categories.length} CATEGORIES
              </span>
            </div>
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* Card 1 */}
          <div className="p-6 rounded-xl bg-[#0d0c11] border border-[#2d293b] flex flex-col hover:border-[#8B5CF6] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded bg-[#8B5CF6]/10 flex items-center justify-center">
                <MusicIcon size={20} className="text-[#8B5CF6]" />
              </div>
              <div className="flex items-center gap-1 text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded text-xs font-bold">
                <TrendingUp size={12} /> 12%
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">{songs.length}</h3>
            <p className="text-[#6B7280] text-sm">Total Songs</p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-xl bg-[#0d0c11] border border-[#2d293b] flex flex-col hover:border-[#F472B6] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F472B6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded bg-[#F472B6]/10 flex items-center justify-center">
                <FolderTree size={20} className="text-[#F472B6]" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">{categories.length}</h3>
            <p className="text-[#6B7280] text-sm">Total Categories</p>
          </div>

          {/* Card 3 (Placeholder) */}
          <div className="p-6 rounded-xl bg-[#0d0c11] border border-[#2d293b] flex flex-col hover:border-[#10B981] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#10B981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded bg-[#10B981]/10 flex items-center justify-center">
                <PlayCircle size={20} className="text-[#10B981]" />
              </div>
              <div className="flex items-center gap-1 text-[#EF4444] bg-[#EF4444]/10 px-2 py-1 rounded text-xs font-bold">
                <TrendingDown size={12} /> 2.4%
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">2,405</h3>
            <p className="text-[#6B7280] text-sm">Total Streams (30d)</p>
          </div>

          {/* Card 4 (Placeholder) */}
          <div className="p-6 rounded-xl bg-[#0d0c11] border border-[#2d293b] flex flex-col hover:border-[#F59E0B] transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F59E0B]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded bg-[#F59E0B]/10 flex items-center justify-center">
                <Users size={20} className="text-[#F59E0B]" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">842</h3>
            <p className="text-[#6B7280] text-sm">Active Users</p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-xl bg-[#0d0c11] border border-[#2d293b] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded bg-[#EF4444]/10 flex items-center justify-center">
                <Clock size={20} className="text-[#EF4444]" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">{songs.filter(s => !s.is_published).length}</h3>
            <p className="text-[#6B7280] text-sm">Draft Songs</p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-xl bg-[#0d0c11] border border-[#2d293b] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded bg-[#3B82F6]/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-[#3B82F6]" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">{songs.filter(s => s.is_published).length}</h3>
            <p className="text-[#6B7280] text-sm">Published Songs</p>
          </div>

          {/* Card 7 (Placeholder) */}
          <div className="p-6 rounded-xl bg-[#0d0c11] border border-[#2d293b] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded bg-[#F43F5E]/10 flex items-center justify-center">
                <Flag size={20} className="text-[#F43F5E]" />
              </div>
              <div className="flex items-center gap-1 text-[#F43F5E] bg-[#F43F5E]/10 px-2 py-1 rounded text-xs font-bold">
                Review
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">0</h3>
            <p className="text-[#6B7280] text-sm">Flagged Reports</p>
          </div>

          {/* Card 8 (Placeholder) */}
          <div className="p-6 rounded-xl bg-[#0d0c11] border border-[#2d293b] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded bg-[#10B981]/10 flex items-center justify-center">
                <Wallet size={20} className="text-[#10B981]" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-1">0</h3>
            <p className="text-[#6B7280] text-sm">Payout Requests</p>
          </div>

        </div>
      </div>
    );
  }

  // ==== SETTINGS PLACEHOLDER ====
  if (currentTab === 'settings' && view === 'list') {
    return (
      <div className="animate-slide-up flex flex-col items-center justify-center h-full text-center">
        <Settings size={48} className="text-[#2d293b] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">System Settings</h2>
        <p className="text-[#9CA3AF]">Configuration options will appear here.</p>
      </div>
    );
  }

  // ==== LIST VIEW ====
  return (
    <div className="animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white mb-1">
            {currentTab === 'songs' ? 'All Songs' : 'Categories'}
          </h2>
          <p className="text-[#9CA3AF] text-sm">
            {currentTab === 'songs' ? 'Manage your lyric catalog' : 'Organize your songs'}
          </p>
        </div>
        <div className="flex gap-4">
          {currentTab === 'songs' ? (
            <button onClick={handleAddNewSong} className="px-4 py-2 font-bold text-white rounded bg-gradient-to-r from-[#A78BFA] to-[#F472B6] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,114,182,0.2)]">
              <Plus size={18} /> New Song
            </button>
          ) : (
            <button onClick={handleAddNewCategory} className="px-4 py-2 font-bold text-white rounded bg-[#17151f] border border-[#2d293b] hover:bg-[#2d293b] transition-colors flex items-center justify-center gap-2">
              <Plus size={18} /> New Category
            </button>
          )}
        </div>
      </div>

      <div className="table-container rounded-xl border border-[#2d293b] bg-[#17151f] overflow-hidden">
        {currentTab === 'songs' ? (
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
