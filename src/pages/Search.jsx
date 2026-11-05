import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import { Search as SearchIcon, X, Play, Pause, Heart, Music, ChevronRight } from 'lucide-react';

export default function Search() {
  const { currentSong, setCurrentSong, isPlaying, setIsPlaying } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jw_song_favorites') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch categories and songs on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [catsRes, songsRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order', { ascending: true }),
          supabase.from('songs').select('*, categories(name)').eq('is_published', true).order('title', { ascending: true }),
        ]);

        if (catsRes.data) setCategories(catsRes.data);
        if (songsRes.data) setSongs(songsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleFavorite = (songId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId];
      try {
        localStorage.setItem('jw_song_favorites', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
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

  // Filter songs by search query and category
  const filteredSongs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((song) => {
      const matchesCategory =
        selectedCategory === 'all' || song.category_id === selectedCategory;

      if (!matchesCategory) return false;
      if (!q) return true;

      const titleMatch = song.title?.toLowerCase().includes(q);
      const writeupMatch = song.writeup?.toLowerCase().includes(q);
      const lyricsMatch = song.lyrics?.toLowerCase().includes(q);
      const catMatch = song.categories?.name?.toLowerCase().includes(q);

      return titleMatch || writeupMatch || lyricsMatch || catMatch;
    });
  }, [songs, query, selectedCategory]);

  return (
    <div className="main-content animate-fade-in pb-24">
      {/* Top Header Bar */}
      <div className="topbar mb-4" style={{ margin: '-1rem -1rem 1rem -1rem', padding: '1.25rem 1rem' }}>
        <h1 className="text-2xl font-bold mb-2">Search Songs</h1>
        <p className="text-xs text-secondary">
          Find songs by title, lyrics, or category
        </p>
      </div>

      {/* Search Input Box */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl mb-4"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <SearchIcon size={18} className="text-primary flex-shrink-0" />
        <input
          type="text"
          placeholder="Type song title or lyrics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm text-white"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-secondary hover:text-white p-1"
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-primary text-black font-bold'
              : 'bg-bg-card text-secondary hover:text-white border border-border-color'
          }`}
          style={selectedCategory === 'all' ? { backgroundColor: 'var(--primary-color)' } : {}}
        >
          All ({songs.length})
        </button>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-primary text-black font-bold'
                  : 'bg-bg-card text-secondary hover:text-white border border-border-color'
              }`}
              style={isSelected ? { backgroundColor: 'var(--primary-color)' } : {}}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Songs List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="card text-center p-8 mt-4">
          <Music size={40} className="text-secondary mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-white mb-1">No songs found</h3>
          <p className="text-xs text-secondary mb-4">
            {query
              ? `No matches found for "${query}". Try different words or check your spelling.`
              : 'No songs available in this category.'}
          </p>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="btn btn-secondary text-xs py-2 px-4"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-xs text-secondary">
              Showing {filteredSongs.length} song{filteredSongs.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredSongs.map((song) => {
            const isCurrentPlaying = currentSong?.id === song.id && isPlaying;
            const isFav = favorites.includes(song.id);

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

                {/* Actions: Favorite & Details */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => toggleFavorite(song.id, e)}
                    className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart
                      size={18}
                      className={isFav ? 'text-primary fill-primary' : 'text-secondary'}
                      style={isFav ? { color: 'var(--primary-color)', fill: 'var(--primary-color)' } : {}}
                    />
                  </button>

                  <ChevronRight size={16} className="text-muted" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
