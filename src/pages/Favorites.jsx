import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import { Heart, Play, Pause, Trash2, Music, ArrowRight, Sparkles } from 'lucide-react';

export default function Favorites() {
  const { currentSong, setCurrentSong, isPlaying, setIsPlaying } = useContext(AppContext);
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jw_song_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavoriteSongs() {
      if (favorites.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('songs')
          .select('*, categories(name)')
          .in('id', favorites)
          .eq('is_published', true);

        if (!error && data) {
          // Sort according to order of favorites
          const map = new Map(data.map((s) => [s.id, s]));
          const ordered = favorites.map((id) => map.get(id)).filter(Boolean);
          setSongs(ordered);
        }
      } catch (err) {
        console.error('Error fetching favorites:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFavoriteSongs();
  }, [favorites]);

  const removeFavorite = (songId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = favorites.filter((id) => id !== songId);
    setFavorites(updated);
    try {
      localStorage.setItem('jw_song_favorites', JSON.stringify(updated));
    } catch (_) {}
  };

  const clearAllFavorites = () => {
    if (window.confirm('Clear all your saved favorite songs?')) {
      setFavorites([]);
      setSongs([]);
      try {
        localStorage.removeItem('jw_song_favorites');
      } catch (_) {}
    }
  };

  const handlePlaySong = (song, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  return (
    <div className="main-content animate-fade-in pb-24">
      {/* Top Header Bar */}
      <div className="topbar mb-4" style={{ margin: '-1rem -1rem 1rem -1rem', padding: '1.25rem 1rem' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Heart size={22} className="text-primary fill-primary" style={{ color: 'var(--primary-color)', fill: 'var(--primary-color)' }} />
              Saved Favorites
            </h1>
            <p className="text-xs text-secondary">
              {songs.length} song{songs.length === 1 ? '' : 's'} saved for quick access
            </p>
          </div>

          {songs.length > 0 && (
            <button
              onClick={clearAllFavorites}
              className="text-xs text-secondary hover:text-danger flex items-center gap-1 p-2 rounded-lg hover:bg-bg-hover transition-colors"
              title="Clear all favorites"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="card text-center p-8 mt-6">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary-color)' }}
          >
            <Heart size={28} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No Saved Songs Yet</h2>
          <p className="text-xs text-secondary mb-6 max-w-sm mx-auto leading-relaxed">
            Tap the heart icon on any song while browsing or searching to keep it handy here in your browser.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/" className="btn btn-primary text-xs py-2.5 px-5">
              Browse Songs
            </Link>
            <Link to="/search" className="btn btn-secondary text-xs py-2.5 px-5">
              Search Library
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {songs.map((song) => {
            const isCurrentPlaying = currentSong?.id === song.id && isPlaying;

            return (
              <Link
                key={song.id}
                to={`/song/${song.id}`}
                className="card flex items-center gap-3 p-3 rounded-xl hover:border-primary/50 transition-all"
                style={{ padding: '0.75rem 1rem' }}
              >
                {/* Thumbnail / Play Button */}
                <div
                  className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-bg-hover flex items-center justify-center cursor-pointer group"
                  onClick={(e) => handlePlaySong(song, e)}
                  title={isCurrentPlaying ? 'Pause audio' : 'Play audio'}
                >
                  {song.feature_image_url ? (
                    <img
                      src={song.feature_image_url}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music size={20} className="text-muted" />
                  )}
                  <div
                    className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                      isCurrentPlaying ? 'opacity-100 bg-primary/40' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isCurrentPlaying ? (
                      <Pause size={16} className="text-white" />
                    ) : (
                      <Play size={16} className="text-white ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate m-0">
                    {song.title}
                  </h3>
                  <span className="text-xs text-secondary truncate block mt-0.5">
                    {song.categories?.name || 'Original Song'}
                  </span>
                </div>

                {/* Actions: Remove Favorite */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => removeFavorite(song.id, e)}
                    className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
                    title="Remove from favorites"
                  >
                    <Heart
                      size={18}
                      className="text-primary fill-primary"
                      style={{ color: 'var(--primary-color)', fill: 'var(--primary-color)' }}
                    />
                  </button>
                  <ArrowRight size={15} className="text-muted" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
