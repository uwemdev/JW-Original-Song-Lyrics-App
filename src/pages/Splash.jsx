import React, { useEffect } from 'react';
import { Music } from 'lucide-react';

export default function Splash({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, var(--primary-dark), var(--primary-color))' }}>
      <div className="animate-slide-up flex flex-col items-center">
        <div className="bg-white/20 p-6 rounded-full backdrop-blur-sm mb-6">
          <Music size={64} color="white" />
        </div>
        <h1 className="text-3xl font-bold text-white text-center">JW Original Songs</h1>
        <p className="text-white/80 mt-2">Lyrics & Audio</p>
      </div>
    </div>
  );
}
