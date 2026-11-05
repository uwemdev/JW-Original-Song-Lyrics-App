import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  LogOut,
  Music,
  FolderTree,
  Music2,
  MessageSquare,
  Megaphone,
  Smartphone,
  Search,
  Plus,
  Play,
  Pause,
  Copy,
  Check,
  Edit2,
  X,
  ExternalLink,
  Command,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react';

export default function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get('tab') || 'songs';

  // Global Command Palette / Quick Search State
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteResults, setPaletteResults] = useState([]);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const audioPlayerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Unread feedback count
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch unread feedback count
  const fetchUnreadFeedback = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('feedback')
        .select('id, is_admin_reply')
        .eq('is_admin_reply', false);
      if (data) {
        setUnreadFeedbackCount(data.length);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchUnreadFeedback();
    const channel = supabase
      .channel('admin_nav_feedback')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, () => {
        fetchUnreadFeedback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadFeedback]);

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paletteOpen]);

  // Focus input when palette opens
  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setPaletteQuery('');
      setPaletteResults([]);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingAudioId(null);
    }
  }, [paletteOpen]);

  // Query Supabase for palette results
  useEffect(() => {
    if (!paletteQuery.trim()) {
      setPaletteResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setPaletteLoading(true);
      try {
        const q = paletteQuery.trim();
        const { data: songsData } = await supabase
          .from('songs')
          .select('id, title, feature_image_url, mp3_url, is_published, category_id, categories(name)')
          .ilike('title', `%${q}%`)
          .limit(8);

        setPaletteResults(songsData || []);
      } catch (err) {
        console.error('Palette search error:', err);
      } finally {
        setPaletteLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [paletteQuery]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  const executeAction = (action) => {
    setPaletteOpen(false);
    action();
  };

  const togglePaletteAudio = (song, e) => {
    e.stopPropagation();
    if (!song.mp3_url) return;

    if (playingAudioId === song.id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(song.mp3_url);
      audioPlayerRef.current = audio;
      setPlayingAudioId(song.id);
      audio.play().catch(() => setPlayingAudioId(null));
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  const copyId = (id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0c11',
        color: '#9CA3AF',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { key: 'songs', label: 'Songs', icon: Music },
    { key: 'categories', label: 'Categories', icon: FolderTree },
    { key: 'feedback', label: 'Feedback & Chat', icon: MessageSquare, badge: unreadFeedbackCount },
    { key: 'notifications', label: 'Push Notifications', icon: Megaphone },
    { key: 'updates', label: 'App Updates', icon: Smartphone },
  ];

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0d0c11',
      color: '#fff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: '#17151f',
        borderRight: '1px solid #2d293b',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #2d293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #A78BFA, #F472B6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Music2 color="white" size={18} />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', lineHeight: '1.2' }}>JW Original Songs</div>
            <div style={{ fontSize: '10px', color: '#A78BFA', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Admin</div>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {navItems.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                marginBottom: '4px',
                background: currentTab === key ? '#2d293b' : 'transparent',
                color: currentTab === key ? '#fff' : '#9CA3AF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
              }}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              {Boolean(badge && badge > 0) && (
                <span style={{
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: '#EC4899',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '700',
                }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #2d293b' }}>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.user?.email || 'Admin'}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: '#EF4444',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area with Top Header and Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Top Header with Quick Search Bar & Actions */}
        <header style={{
          height: '64px',
          background: '#13111b',
          borderBottom: '1px solid #2d293b',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '16px',
        }}>
          {/* Quick Search trigger */}
          <div
            onClick={() => setPaletteOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#1a1824',
              border: '1px solid #2d293b',
              borderRadius: '10px',
              padding: '8px 14px',
              width: '380px',
              cursor: 'pointer',
              color: '#9CA3AF',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8B5CF6')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2d293b')}
          >
            <Search size={15} color="#8B5CF6" />
            <span style={{ fontSize: '13px', flex: 1 }}>Search songs, actions...</span>
            <span style={{
              fontSize: '11px',
              background: '#282436',
              border: '1px solid #3c3652',
              borderRadius: '5px',
              padding: '2px 6px',
              color: '#C4B5FD',
              fontWeight: '600',
              letterSpacing: '0.5px',
            }}>
              Ctrl K
            </span>
          </div>

          {/* Quick Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                navigate('/admin?tab=songs&newSong=true');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#8B5CF6',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#7C3AED')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#8B5CF6')}
            >
              <Plus size={14} />
              Add Song
            </button>

            <button
              onClick={() => setTab('feedback')}
              title="User Feedback & Reports"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#221f2e',
                border: '1px solid #322d42',
                borderRadius: '8px',
                color: '#D1D5DB',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={14} color="#A78BFA" />
              <span>Feedback</span>
              {unreadFeedbackCount > 0 && (
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '8px',
                  background: '#EC4899',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: '700',
                }}>
                  {unreadFeedbackCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet context={{ currentTab }} />
        </main>
      </div>

      {/* Global Command Palette / Quick Search Modal */}
      {paletteOpen && (
        <div
          onClick={() => setPaletteOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 4, 8, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '100px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '640px',
              maxWidth: '92vw',
              background: '#17151f',
              border: '1px solid #3d3752',
              borderRadius: '16px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            {/* Search Input Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #2d293b',
              gap: '12px',
              background: '#13111b',
            }}>
              <Search size={18} color="#8B5CF6" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search songs to edit, copy ID, or play preview..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '15px',
                }}
              />
              {paletteQuery ? (
                <button
                  onClick={() => setPaletteQuery('')}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                >
                  <X size={16} />
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: '#6B7280', border: '1px solid #2d293b', padding: '2px 6px', borderRadius: '4px' }}>
                  ESC to close
                </span>
              )}
            </div>

            {/* Results or Quick Actions List */}
            <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '12px' }}>
              {paletteQuery.trim() ? (
                paletteLoading ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                    Searching songs...
                  </div>
                ) : paletteResults.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                    No songs found matching "{paletteQuery}"
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 12px 8px 12px' }}>
                      Matching Songs ({paletteResults.length})
                    </div>
                    {paletteResults.map((song) => {
                      const isPlaying = playingAudioId === song.id;
                      return (
                        <div
                          key={song.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: '#1c1a27',
                            marginBottom: '6px',
                            border: '1px solid #282436',
                            transition: 'border-color 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            {song.feature_image_url ? (
                              <img src={song.feature_image_url} alt="" style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#2d293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Music size={16} color="#9CA3AF" />
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {song.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{song.categories?.name || 'No Category'}</span>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: song.is_published ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: song.is_published ? '#34D399' : '#F87171',
                                }}>
                                  {song.is_published ? 'Published' : 'Draft'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions for this song */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {/* Audio Preview */}
                            {song.mp3_url && (
                              <button
                                onClick={(e) => togglePaletteAudio(song, e)}
                                title={isPlaying ? 'Pause audio' : 'Play audio preview'}
                                style={{
                                  background: isPlaying ? '#8B5CF6' : '#272336',
                                  border: '1px solid #3d3652',
                                  color: '#fff',
                                  borderRadius: '8px',
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                            )}

                            {/* Copy ID */}
                            <button
                              onClick={(e) => copyId(song.id, e)}
                              title="Copy Song ID"
                              style={{
                                background: '#272336',
                                border: '1px solid #3d3652',
                                color: copiedId === song.id ? '#34D399' : '#9CA3AF',
                                borderRadius: '8px',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              {copiedId === song.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                executeAction(() => {
                                  navigate(`/admin?tab=songs&editSongId=${song.id}`);
                                });
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#8B5CF6',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Quick Shortcuts when search is empty */
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 12px 8px 12px' }}>
                    Quick Actions
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 6px' }}>
                    <div
                      onClick={() => executeAction(() => navigate('/admin?tab=songs&newSong=true'))}
                      style={{
                        padding: '12px 14px',
                        background: '#1d1b29',
                        border: '1px solid #2e293d',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8B5CF6')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2e293d')}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Plus size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Add New Song</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Create song & upload audio</div>
                      </div>
                    </div>

                    <div
                      onClick={() => executeAction(() => navigate('/admin?tab=feedback&filter=needs_reply'))}
                      style={{
                        padding: '12px 14px',
                        background: '#1d1b29',
                        border: '1px solid #2e293d',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#EC4899')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2e293d')}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <MessageSquare size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Feedback & Chat</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Respond to user reports</div>
                      </div>
                    </div>

                    <div
                      onClick={() => executeAction(() => navigate('/admin?tab=songs&status=no_audio'))}
                      style={{
                        padding: '12px 14px',
                        background: '#1d1b29',
                        border: '1px solid #2e293d',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#F59E0B')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2e293d')}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Filter size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Songs Missing Audio</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Filter songs without MP3</div>
                      </div>
                    </div>

                    <div
                      onClick={() => executeAction(() => navigate('/admin?tab=notifications'))}
                      style={{
                        padding: '12px 14px',
                        background: '#1d1b29',
                        border: '1px solid #2e293d',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2e293d')}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Megaphone size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Push Notifications</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Broadcast to app users</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
