import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import { ChevronLeft, Play } from 'lucide-react';

export default function CategoryView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { setCurrentSong, setIsPlaying } = useContext(AppContext);
  
  const [category, setCategory] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSongs() {
      setLoading(true);
      
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
        
      if (catData) {
        setCategory(catData);
        
        const { data: songsData } = await supabase
          .from('songs')
          .select('*')
          .eq('category_id', catData.id)
          .eq('is_published', true)
          .order('sort_order', { ascending: true });
          
        setSongs(songsData || []);
      } else {
        // Mock data for demo
        setCategory({ name: 'Original Songs' });
        setSongs([
          {
            id: '1',
            title: 'Just Around the Corner',
            writeup: 'A song about keeping our eyes on the future.',
            feature_image_url: 'https://images.unsplash.com/photo-1493225457124-a1a2a2954024?auto=format&fit=crop&w=400&q=80'
          },
          {
            id: '2',
            title: 'Follow the Course of Hospitality',
            writeup: 'Encouragement to be hospitable to one another.',
            feature_image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80'
          }
        ]);
      }
      setLoading(false);
    }
    
    fetchSongs();
  }, [slug]);

  return (
    <div className="main-content animate-slide-up">
      <div className="topbar mb-6" style={{ margin: '-1rem -1rem 1.5rem -1rem', padding: '1rem' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold m-0">{category ? category.name : 'Loading...'}</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-lg"></div>)}
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center mt-12 text-secondary">
          <p>No songs found in this category yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {songs.map(song => (
            <Link to={`/song/${song.id}`} key={song.id} className="card flex gap-4 overflow-hidden" style={{ padding: 0 }}>
              {song.feature_image_url ? (
                <img 
                  src={song.feature_image_url} 
                  alt={song.title} 
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100px', height: '100px', backgroundColor: 'var(--bg-hover)' }} className="flex items-center justify-center">
                  <Play className="text-muted" />
                </div>
              )}
              
              <div className="p-3 flex flex-col justify-center flex-1">
                <h3 className="text-md font-bold text-primary" style={{ margin: 0, lineHeight: 1.2 }}>{song.title}</h3>
                <p className="text-xs text-secondary mt-1 line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {song.writeup}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
