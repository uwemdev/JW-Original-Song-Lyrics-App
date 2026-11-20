import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../App';
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AudioPlayer() {
  const { currentSong, setCurrentSong, isPlaying, setIsPlaying } = useContext(AppContext);
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && currentSong?.mp3_url) {
      if (isPlaying && !isOffline) {
        audioRef.current.play().catch((e) => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong, isOffline]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setProgress((current / duration) * 100 || 0);
    }
  };

  const handleNext = useCallback(async () => {
    if (!currentSong) return;
    try {
      let query = supabase.from('songs').select('*').eq('is_published', true).not('mp3_url', 'is', null);
      if (currentSong.category_id) {
        query = query.eq('category_id', currentSong.category_id);
      }
      const { data } = await query.order('created_at', { ascending: false });
      if (data && data.length > 1) {
        const curIdx = data.findIndex((s) => s.id === currentSong.id);
        const nextIdx = curIdx + 1 < data.length ? curIdx + 1 : 0;
        setCurrentSong(data[nextIdx]);
        setIsPlaying(true);
      }
    } catch (_) {}
  }, [currentSong, setCurrentSong, setIsPlaying]);

  const handlePrev = useCallback(async () => {
    if (!currentSong) return;
    try {
      if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        return;
      }
      let query = supabase.from('songs').select('*').eq('is_published', true).not('mp3_url', 'is', null);
      if (currentSong.category_id) {
        query = query.eq('category_id', currentSong.category_id);
      }
      const { data } = await query.order('created_at', { ascending: false });
      if (data && data.length > 1) {
        const curIdx = data.findIndex((s) => s.id === currentSong.id);
        const prevIdx = curIdx - 1 >= 0 ? curIdx - 1 : data.length - 1;
        setCurrentSong(data[prevIdx]);
        setIsPlaying(true);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    } catch (_) {}
  }, [currentSong, setCurrentSong, setIsPlaying]);

  if (!currentSong) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: isLanding ? '0px' : '56px',
      left: 0,
      right: 0,
      backgroundColor: 'var(--bg-card)',
      borderTop: '2px solid var(--primary-color)',
      padding: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40,
      boxShadow: '0 -10px 15px -3px rgba(0,0,0,0.2)'
    }}>
      <audio 
        ref={audioRef} 
        src={currentSong.mp3_url} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleNext}
      />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col overflow-hidden whitespace-nowrap text-ellipsis mr-4">
          <span className="font-bold text-sm text-primary">{currentSong.title}</span>
          {isOffline && <span className="text-xs text-danger">Offline - Audio disabled</span>}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            className="btn-icon text-secondary" 
            onClick={handlePrev}
            title="Previous song"
            style={{ padding: '6px' }}
          >
            <SkipBack size={20} />
          </button>

          <button 
            className="btn-icon" 
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isOffline}
            title={isPlaying ? "Pause" : "Play"}
            style={{ opacity: isOffline ? 0.5 : 1 }}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button 
            className="btn-icon text-secondary" 
            onClick={handleNext}
            title="Next song"
            style={{ padding: '6px' }}
          >
            <SkipForward size={20} />
          </button>

          <button className="btn-icon text-secondary" onClick={() => {
            setCurrentSong(null);
            setIsPlaying(false);
          }} title="Close player">
            <X size={20} />
          </button>
        </div>
      </div>
      
      <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.1s linear' }}></div>
      </div>
    </div>
  );
}
