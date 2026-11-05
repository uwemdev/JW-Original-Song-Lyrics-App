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
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  User,
  Filter,
} from 'lucide-react';

export default function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get('tab') || 'songs';

  // Responsive sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Global Command Palette State
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

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

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
      .channel('admin_nav_feedback_live')
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

  // Focus search input when palette opens
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

  // Palette search
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0910',
        color: '#9CA3AF',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { key: 'songs', label: 'Songs Library', icon: Music },
    { key: 'categories', label: 'Categories', icon: FolderTree },
    { key: 'feedback', label: 'User Feedback', icon: MessageSquare, badge: unreadFeedbackCount },
    { key: 'notifications', label: 'Push Alerts', icon: Megaphone },
    { key: 'updates', label: 'App Updates', icon: Smartphone },
  ];

  const currentTabLabel = navItems.find((n) => n.key === currentTab)?.label || 'Dashboard';

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      maxWidth: '100vw',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      background: '#0a0910',
      color: '#fff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* Sleek Collapsible Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? '72px' : '240px',
        minWidth: sidebarCollapsed ? '72px' : '240px',
        maxWidth: sidebarCollapsed ? '72px' : '240px',
        background: '#12101a',
        borderRight: '1px solid #231f30',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
      }}>
        {/* Brand Header */}
        <div style={{
          height: '64px',
          padding: sidebarCollapsed ? '0 16px' : '0 20px',
          borderBottom: '1px solid #231f30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
            }}>
              <Music2 color="white" size={18} />
            </div>
            {!sidebarCollapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', lineHeight: '1.2', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  JW Lyrics
                </div>
                <div style={{ fontSize: '10px', color: '#A78BFA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Admin Console
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '16px 10px', flex: 1, overflowY: 'auto' }}>
          {navItems.map(({ key, label, icon: Icon, badge }) => {
            const isActive = currentTab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                title={sidebarCollapsed ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: sidebarCollapsed ? '12px 0' : '10px 14px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  marginBottom: '6px',
                  background: isActive ? '#8B5CF6' : 'transparent',
                  color: isActive ? '#fff' : '#9CA3AF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 10px rgba(139, 92, 246, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#1c1829';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#9CA3AF';
                  }
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
                {Boolean(badge && badge > 0) && (
                  <span style={{
                    position: sidebarCollapsed ? 'absolute' : 'static',
                    top: sidebarCollapsed ? '6px' : 'auto',
                    right: sidebarCollapsed ? '6px' : 'auto',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: '#EC4899',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: '700',
                    lineHeight: '1',
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer with Collapse Toggle and Sign Out */}
        <div style={{ padding: '12px', borderTop: '1px solid #231f30', background: '#0e0c16', flexShrink: 0 }}>
          {/* Toggle Sidebar Button */}
          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '10px',
              width: '100%',
              padding: '8px 10px',
              marginBottom: '8px',
              background: '#1a1626',
              border: '1px solid #2c263d',
              borderRadius: '8px',
              color: '#9CA3AF',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>

          {/* User Email & Sign Out */}
          {!sidebarCollapsed && (
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.user?.email || 'Admin User'}
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '8px',
              width: '100%',
              padding: '8px 10px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#F87171',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Layout Area: Header + Scrollable Workspace */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Unified Top Header Bar */}
        <header style={{
          height: '64px',
          background: '#12101a',
          borderBottom: '1px solid #231f30',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '16px',
        }}>
          {/* Breadcrumb / Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Admin</span>
            <span style={{ fontSize: '13px', color: '#4B5563' }}>/</span>
            <span style={{ fontSize: '14px', color: '#fff', fontWeight: '700' }}>{currentTabLabel}</span>
          </div>

          {/* Quick Search & Actions Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => setPaletteOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#1a1626',
                border: '1px solid #2c263d',
                borderRadius: '8px',
                padding: '7px 12px',
                width: 'clamp(200px, 28vw, 360px)',
                cursor: 'pointer',
                color: '#9CA3AF',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8B5CF6')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2c263d')}
            >
              <Search size={14} color="#8B5CF6" />
              <span style={{ fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Quick search songs or actions...
              </span>
              <span style={{
                fontSize: '10px',
                background: '#252136',
                border: '1px solid #3c3552',
                borderRadius: '4px',
                padding: '2px 5px',
                color: '#C4B5FD',
                fontWeight: '600',
              }}>
                Ctrl K
              </span>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => navigate('/admin?tab=songs&newSong=true')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                background: '#8B5CF6',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={14} />
              <span>Add Song</span>
            </button>
          </div>
        </header>

        {/* Content Workspace — Strict boundary prevents page overflow */}
        <main style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0910',
        }}>
          <Outlet context={{ currentTab }} />
        </main>
      </div>

      {/* Global Command Palette Modal */}
      {paletteOpen && (
        <div
          onClick={() => setPaletteOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 4, 8, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '80px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '620px',
              maxWidth: '92vw',
              background: '#151320',
              border: '1px solid #362e49',
              borderRadius: '16px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Search Input Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #282236',
              gap: '12px',
              background: '#110f1c',
            }}>
              <Search size={18} color="#8B5CF6" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search songs to edit, copy ID, or preview audio..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '14px',
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
                <span style={{ fontSize: '11px', color: '#6B7280', border: '1px solid #282236', padding: '2px 6px', borderRadius: '4px' }}>
                  ESC
                </span>
              )}
            </div>

            {/* Results or Shortcuts */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '12px' }}>
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
                            background: '#1b1728',
                            marginBottom: '6px',
                            border: '1px solid #282236',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            {song.feature_image_url ? (
                              <img src={song.feature_image_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#252136', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Music size={16} color="#9CA3AF" />
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {song.title}
                              </div>
                              <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{song.categories?.name || 'No Category'}</span>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: song.is_published ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: song.is_published ? '#34D399' : '#F87171',
                                }}>
                                  {song.is_published ? 'Published' : 'Draft'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {song.mp3_url && (
                              <button
                                onClick={(e) => togglePaletteAudio(song, e)}
                                title={isPlaying ? 'Pause' : 'Preview audio'}
                                style={{
                                  background: isPlaying ? '#8B5CF6' : '#252136',
                                  border: '1px solid #3c3552',
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
                                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                              </button>
                            )}

                            <button
                              onClick={(e) => copyId(song.id, e)}
                              title="Copy Song ID"
                              style={{
                                background: '#252136',
                                border: '1px solid #3c3552',
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
                              {copiedId === song.id ? <Check size={13} /> : <Copy size={13} />}
                            </button>

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
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 12px 8px 12px' }}>
                    Quick Actions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div
                      onClick={() => executeAction(() => navigate('/admin?tab=songs&newSong=true'))}
                      style={{ padding: '12px 14px', background: '#1b1728', border: '1px solid #2c253d', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <Plus size={16} color="#A78BFA" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Add New Song</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Create song & audio</div>
                      </div>
                    </div>

                    <div
                      onClick={() => executeAction(() => navigate('/admin?tab=feedback&filter=needs_reply'))}
                      style={{ padding: '12px 14px', background: '#1b1728', border: '1px solid #2c253d', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <MessageSquare size={16} color="#EC4899" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>User Feedback</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Support & song reports</div>
                      </div>
                    </div>

                    <div
                      onClick={() => executeAction(() => navigate('/admin?tab=songs&status=no_audio'))}
                      style={{ padding: '12px 14px', background: '#1b1728', border: '1px solid #2c253d', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <Filter size={16} color="#F59E0B" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Missing Audio</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Songs without MP3 link</div>
                      </div>
                    </div>

                    <div
                      onClick={() => executeAction(() => navigate('/admin?tab=notifications'))}
                      style={{ padding: '12px 14px', background: '#1b1728', border: '1px solid #2c253d', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <Megaphone size={16} color="#3B82F6" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Push Alerts</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Broadcast to mobile users</div>
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
