import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      await supabase.from('songs').delete().eq('id', id);
      setSongs(songs.filter(s => s.id !== id));
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Manage Songs</h2>
        <button className="btn btn-primary flex items-center gap-2">
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
                    <button className="btn-icon text-secondary hover:text-primary mx-1">
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
