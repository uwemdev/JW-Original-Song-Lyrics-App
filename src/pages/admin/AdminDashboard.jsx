import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, X, Save, ArrowLeft } from 'lucide-react';

export default function AdminDashboard() {
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // View state: 'list', 'song-form', 'category-form'
  const [view, setView] = useState('list');
  const [editingSong, setEditingSong] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    writeup: '',
    lyrics: '',
    mp3_url: '',
    is_published: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [catsRes, songsRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('songs').select('*, categories(name)').order('created_at', { ascending: false })
    ]);
    
    if (catsRes.data) setCategories(catsRes.data);
    if (songsRes.data) setSongs(songsRes.data);
    setLoading(false);
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      await supabase.from('songs').delete().eq('id', id);
      setSongs(songs.filter(s => s.id !== id));
    }
  };

  const handleEdit = (song) => {
    setEditingSong(song);
    setFormData({
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

  const handleAddNew = () => {
    setEditingSong(null);
    setFormData({
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
    try {
      let feature_image_url = editingSong?.feature_image_url || '';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
          
        feature_image_url = publicUrlData.publicUrl;
      }

      const songData = {
        ...formData,
        feature_image_url
      };

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
      alert('Error saving song: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && view === 'list') return <div className="p-4 text-center">Loading dashboard...</div>;

  if (view === 'song-form') {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="btn-icon">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold">{editingSong ? 'Edit Song' : 'Add New Song'}</h2>
        </div>

        <form onSubmit={handleSaveSong} className="card">
          <div className="mb-4">
            <label>Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="mb-4">
            <label>Category</label>
            <select 
              required
              value={formData.category_id}
              onChange={e => setFormData({...formData, category_id: e.target.value})}
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
              value={formData.writeup}
              onChange={e => setFormData({...formData, writeup: e.target.value})}
            ></textarea>
          </div>

          <div className="mb-4">
            <label>Lyrics (preserve formatting)</label>
            <textarea 
              rows="10"
              required
              value={formData.lyrics}
              onChange={e => setFormData({...formData, lyrics: e.target.value})}
              style={{ fontFamily: 'monospace' }}
            ></textarea>
          </div>

          <div className="mb-4">
            <label>Feature Image</label>
            {editingSong?.feature_image_url && !imageFile && (
              <img src={editingSong.feature_image_url} alt="Current feature" className="w-32 h-32 object-cover rounded mb-2" />
            )}
            <input 
              type="file" 
              accept="image/*"
              onChange={e => setImageFile(e.target.files[0])}
              style={{ border: 'none', padding: 0 }}
            />
            <p className="text-xs text-secondary mt-1">Make sure you have created the "images" bucket in Supabase Storage.</p>
          </div>

          <div className="mb-6">
            <label>MP3 URL (Online link)</label>
            <input 
              type="url" 
              value={formData.mp3_url}
              onChange={e => setFormData({...formData, mp3_url: e.target.value})}
              placeholder="https://example.com/song.mp3"
            />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="is_published"
              checked={formData.is_published}
              onChange={e => setFormData({...formData, is_published: e.target.checked})}
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

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Manage Songs</h2>
        <button onClick={handleAddNew} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Song
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-4 font-bold text-secondary text-sm">Title</th>
              <th className="p-4 font-bold text-secondary text-sm">Category</th>
              <th className="p-4 font-bold text-secondary text-sm">Status</th>
              <th className="p-4 font-bold text-secondary text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {songs.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-secondary">
                  No songs found. Add one to get started.
                </td>
              </tr>
            ) : (
              songs.map(song => (
                <tr key={song.id} className="border-b border-gray-800 last:border-0 hover:bg-bg-hover">
                  <td className="p-4">
                    <div className="font-medium text-primary">{song.title}</div>
                  </td>
                  <td className="p-4 text-sm text-secondary">
                    {song.categories?.name || 'Unknown'}
                  </td>
                  <td className="p-4 text-sm">
                    {song.is_published ? (
                      <span className="text-success bg-success/10 px-2 py-1 rounded text-xs">Published</span>
                    ) : (
                      <span className="text-secondary bg-gray-700 px-2 py-1 rounded text-xs">Draft</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleEdit(song)} className="btn-icon text-secondary hover:text-primary mx-1">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(song.id)} className="btn-icon text-secondary hover:text-danger mx-1">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
