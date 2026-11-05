import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import { ChevronLeft, Share2, Copy, Check, Heart, Flag, X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCurrentSong, setIsPlaying } = useContext(AppContext);
  
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(
    parseInt(localStorage.getItem('fontSize') || '16', 10)
  );

  // Favorite state
  const [isFavorite, setIsFavorite] = useState(false);

  // Report Issue Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [issueType, setIssueType] = useState('missing_lyrics');
  const [reportNote, setReportNote] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('jw_song_favorites') || '[]');
      setIsFavorite(favs.includes(id));
    } catch (_) {}
  }, [id]);

  const toggleFavorite = () => {
    try {
      const favs = JSON.parse(localStorage.getItem('jw_song_favorites') || '[]');
      let updated;
      if (favs.includes(id)) {
        updated = favs.filter((item) => item !== id);
        setIsFavorite(false);
      } else {
        updated = [...favs, id];
        setIsFavorite(true);
      }
      localStorage.setItem('jw_song_favorites', JSON.stringify(updated));
    } catch (_) {}
  };

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
          setCurrentSong(data);
          setIsPlaying(false);
        }
      }
      setLoading(false);
    }
    
    fetchSong();
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

  const handleFontSizeChange = (newSize) => {
    const clamped = Math.min(32, Math.max(12, newSize));
    setFontSize(clamped);
    try {
      localStorage.setItem('fontSize', String(clamped));
    } catch (_) {}
  };

  const submitSongReport = async (e) => {
    e.preventDefault();
    if (!song) return;
    setSubmittingReport(true);
    setReportError('');

    try {
      const deviceId = localStorage.getItem('jw_device_id') || `web_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('jw_device_id', deviceId);

      const payload = {
        message: `[SONG REPORT] "${song.title}" (ID: ${song.id})\nIssue: ${issueType}\nNote: ${reportNote.trim() || 'No additional note'}`,
        device_id: deviceId,
        device_meta: {
          platform: 'WEB',
          os: 'Browser',
          version: 'Web App',
          song_id: song.id,
          song_title: song.title,
          issue: issueType,
          note: reportNote.trim() || null,
        },
        is_admin_reply: false,
      };

      const { error } = await supabase.from('feedback').insert([payload]);
      if (error) throw error;

      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSuccess(false);
        setReportNote('');
      }, 2000);
    } catch (err) {
      setReportError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
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
    <div className="animate-fade-in pb-24">
      {/* Hero Banner with Feature Image */}
      <div 
        className="relative h-64 md:h-80 w-full bg-cover bg-center rounded-b-3xl shadow-lg"
        style={{ backgroundImage: `url(${song.feature_image_url || ''})`, backgroundColor: 'var(--bg-hover)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 rounded-b-3xl"></div>
        
        {/* Top Actions Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <button onClick={() => navigate(-1)} className="btn-icon bg-black/40 text-white backdrop-blur-md" title="Back">
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex gap-2">
            {/* Favorite Button */}
            <button
              onClick={toggleFavorite}
              className="btn-icon bg-black/40 text-white backdrop-blur-md"
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Heart
                size={20}
                className={isFavorite ? 'text-primary fill-primary' : 'text-white'}
                style={isFavorite ? { color: 'var(--primary-color)', fill: 'var(--primary-color)' } : {}}
              />
            </button>

            {/* Copy Lyrics */}
            <button onClick={handleCopy} className="btn-icon bg-black/40 text-white backdrop-blur-md" title="Copy lyrics">
              {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
            </button>

            {/* Report Issue */}
            <button
              onClick={() => setReportModalOpen(true)}
              className="btn-icon bg-black/40 text-white backdrop-blur-md"
              title="Report an issue with this song"
            >
              <Flag size={18} />
            </button>

            {/* Share */}
            {navigator.share && (
              <button onClick={handleShare} className="btn-icon bg-black/40 text-white backdrop-blur-md" title="Share song">
                <Share2 size={20} />
              </button>
            )}
          </div>
        </div>
        
        {/* Title and Writeup */}
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

      {/* Lyrics Body */}
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-primary">Lyrics</h2>
          <div className="flex items-center gap-2 bg-bg-card p-1 rounded-lg">
            <button 
              className="px-3 py-1 rounded text-sm hover:bg-bg-hover"
              onClick={() => handleFontSizeChange(fontSize - 2)}
              title="Decrease font size"
            >
              A-
            </button>
            <span className="text-xs text-secondary">{fontSize}px</span>
            <button 
              className="px-3 py-1 rounded text-sm hover:bg-bg-hover"
              onClick={() => handleFontSizeChange(fontSize + 2)}
              title="Increase font size"
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

      {/* Report Issue Modal */}
      {reportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setReportModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              backgroundColor: 'var(--bg-card-solid)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Flag size={18} className="text-primary" />
                <h3 className="text-base font-bold text-white m-0">Report Song Issue</h3>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-secondary hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 size={40} className="text-success mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white mb-1">Report Sent</h4>
                <p className="text-xs text-secondary">
                  Thank you! Our administrators will review and update this song.
                </p>
              </div>
            ) : (
              <form onSubmit={submitSongReport}>
                <p className="text-xs text-secondary mb-4">
                  Reporting an issue for: <strong className="text-white">{song.title}</strong>
                </p>

                {reportError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs mb-3">
                    <AlertCircle size={14} />
                    <span>{reportError}</span>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-secondary mb-1.5">
                    What is the issue?
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full p-2.5 rounded-lg text-xs bg-bg-card border border-border-color text-white outline-none"
                  >
                    <option value="missing_lyrics">Lyrics are missing or incomplete</option>
                    <option value="audio_error">Audio is not playing or broken link</option>
                    <option value="wrong_lyrics">Lyrics have typos or incorrect words</option>
                    <option value="wrong_image">Feature image is incorrect or broken</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-secondary mb-1.5">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe what needs correction..."
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    className="w-full p-2.5 rounded-lg text-xs bg-bg-card border border-border-color text-white outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="btn btn-secondary text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>{submittingReport ? 'Sending...' : 'Submit Report'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
