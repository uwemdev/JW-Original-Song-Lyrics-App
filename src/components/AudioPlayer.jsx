import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../App';
import { Play, Pause, X } from 'lucide-react';

export default function AudioPlayer() {
  const { currentSong, setCurrentSong, isPlaying, setIsPlaying } = useContext(AppContext);
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
        audioRef.current.play().catch(e => console.error("Playback failed", e));
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

  if (!currentSong) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '60px', // above nav
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
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col overflow-hidden whitespace-nowrap text-ellipsis mr-4">
          <span className="font-bold text-sm text-primary">{currentSong.title}</span>
          {isOffline && <span className="text-xs text-danger">Offline - Audio disabled</span>}
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            className="btn-icon" 
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isOffline}
            style={{ opacity: isOffline ? 0.5 : 1 }}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className="btn-icon text-secondary" onClick={() => {
            setCurrentSong(null);
            setIsPlaying(false);
          }}>
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
