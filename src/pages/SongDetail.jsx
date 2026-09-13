import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import { ChevronLeft, Share2, Copy, Check } from 'lucide-react';

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCurrentSong, setIsPlaying } = useContext(AppContext);
  
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(
    parseInt(localStorage.getItem('fontSize') || '16')
  );

  useEffect(() => {
    async function fetchSong() {
      setLoading(true);
      
      const { data } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data) {
        setSong(data);
        
        // Auto play logic
        if (data.mp3_url && navigator.onLine) {
          setCurrentSong(data);
          setIsPlaying(true);
        } else if (data.mp3_url && !navigator.onLine) {
          setCurrentSong(data); // Set it so offline indicator shows, but don't play
          setIsPlaying(false);
        }
      } else {
        // Mock data
        const mockSong = {
          id: '1',
          title: 'Just Around the Corner',
          writeup: 'A beautiful song about hope.',
          lyrics: 'Verse 1\nThis is the first verse\nIt has some lines\n\nChorus\nThis is the chorus\nWe sing it loud\n\nVerse 2\nAnother verse here\nWith more words',
          feature_image_url: 'https://images.unsplash.com/photo-1493225457124-a1a2a2954024?auto=format&fit=crop&w=800&q=80',
          mp3_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
        };
        setSong(mockSong);
        setCurrentSong(mockSong);
        if (navigator.onLine) setIsPlaying(true);
      }
      setLoading(false);
    }
    
    fetchSong();
    
    return () => {
      // Don't auto stop on unmount, let it play globally
    };
  }, [id, setCurrentSong, setIsPlaying]);

  const handleShare = async () => {
    if (navigator.share && song) {
      try {
        await navigator.share({
          title: song.title,
          text: `Check out the lyrics for ${song.title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const handleCopy = () => {
    if (song) {
      navigator.clipboard.writeText(`${song.title}\n\n${song.lyrics}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="skeleton h-64 w-full rounded-b-3xl"></div>
        <div className="p-4 flex flex-col gap-4 mt-4">
          <div className="skeleton h-8 w-3/4 rounded"></div>
          <div className="skeleton h-4 w-full rounded"></div>
          <div className="skeleton h-64 w-full rounded mt-8"></div>
        </div>
      </div>
    );
  }

  if (!song) {
    return <div className="p-4 text-center mt-12">Song not found.</div>;
  }

  return (
    <div className="animate-fade-in pb-20">
      <div 
        className="relative h-64 md:h-80 w-full bg-cover bg-center rounded-b-3xl shadow-lg"
        style={{ backgroundImage: `url(${song.feature_image_url || ''})`, backgroundColor: 'var(--bg-hover)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 rounded-b-3xl"></div>
        
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <button onClick={() => navigate(-1)} className="btn-icon bg-black/40 text-white backdrop-blur-md">
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-icon bg-black/40 text-white backdrop-blur-md">
              {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
            </button>
            {navigator.share && (
              <button onClick={handleShare} className="btn-icon bg-black/40 text-white backdrop-blur-md">
                <Share2 size={20} />
              </button>
            )}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {song.title}
          </h1>
          {song.writeup && (
            <p className="text-white/80 text-sm md:text-base line-clamp-2">
              {song.writeup}
            </p>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-primary">Lyrics</h2>
          <div className="flex items-center gap-2 bg-bg-card p-1 rounded-lg">
            <button 
              className="px-3 py-1 rounded text-sm hover:bg-bg-hover"
              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
            >
              A-
            </button>
            <span className="text-xs text-secondary">{fontSize}px</span>
            <button 
              className="px-3 py-1 rounded text-sm hover:bg-bg-hover"
              onClick={() => setFontSize(Math.min(32, fontSize + 2))}
            >
              A+
            </button>
          </div>
        </div>

        <div 
          className="whitespace-pre-wrap font-sans"
          style={{ 
            fontSize: `${fontSize}px`, 
            lineHeight: 1.8,
            color: 'var(--text-primary)'
          }}
        >
          {song.lyrics}
        </div>
      </div>
    </div>
  );
}
