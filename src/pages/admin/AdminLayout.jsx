import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './admin.css';
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
  LayoutDashboard,
  Sun,
  Moon,
} from 'lucide-react';

export default function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get('tab') || 'dashboard';

  // Sidebar states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminTheme, setAdminTheme] = useState(() => {
    try {
      return localStorage.getItem('admin_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleAdminTheme = () => {
    setAdminTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('admin_theme', next);
      } catch (_) {}
      return next;
    });
  };

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
    setMobileMenuOpen(false);
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
        background: '#09090b',
        color: '#a1a1aa',
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
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'songs', label: 'Songs', icon: Music },
    { key: 'categories', label: 'Categories', icon: FolderTree },
    { key: 'feedback', label: 'Feedback & Chat', icon: MessageSquare, badge: unreadFeedbackCount },
    { key: 'notifications', label: 'Push Notifications', icon: Megaphone },
    { key: 'updates', label: 'App Updates', icon: Smartphone },
  ];

  const currentTabLabel = navItems.find((n) => n.key === currentTab)?.label || 'Dashboard';
  const userInitial = session.user?.email ? session.user.email[0].toUpperCase() : 'U';

  return (
    <div className="admin-shell" data-theme={adminTheme}>
      {/* Mobile Drawer Overlay */}
      <div
        className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar: Persistent on Desktop, Slide-over Drawer on Mobile */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: '22px', height: '22px', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <Music2 color="white" size={18} style={{ display: 'none' }} className="fallback-icon" />
          </div>
          <div className="brand-text">
            <div style={{ fontWeight: '700', fontSize: '13px', lineHeight: '1.2', color: '#fff' }}>
              JW Original Songs
            </div>
            <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Admin
            </div>
          </div>

          {/* Close button on mobile drawer */}
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="btn-icon-admin"
              style={{ marginLeft: 'auto', border: 'none', background: 'transparent' }}
              title="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {navItems.map(({ key, label, icon: Icon, badge }) => {
            const isActive = currentTab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                <span className="nav-label" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {label}
                </span>
                {Boolean(badge && badge > 0) && (
                  <span className="nav-badge">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          {/* Collapse/Expand Toggle (Desktop only) */}
          {!mobileMenuOpen && (
            <button
              onClick={toggleSidebar}
              className="footer-btn collapse-toggle-btn"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              <span className="btn-label">Collapse</span>
            </button>
          )}

          {/* User Profile Info in Drawer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 4px 10px 4px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '700',
              flexShrink: 0,
            }}>
              {userInitial}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="user-email" style={{ padding: 0, fontSize: '12px', fontWeight: '500', color: '#fafafa' }} title={session.user?.email}>
                {session.user?.email || 'Admin User'}
              </div>
              <div
                onClick={handleLogout}
                style={{ fontSize: '11px', color: '#f87171', fontWeight: '600', cursor: 'pointer', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Sign Out"
              >
                <LogOut size={11} />
                <span>Sign Out</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area: Top Bar + Scrollable Content */}
      <div className="admin-main">
        {/* Top Header Bar */}
        <header className="admin-header">
          {/* Left: Mobile Hamburger + Mobile Brand Logo / Desktop Breadcrumb */}
          <div className="header-left">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-btn"
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <Menu size={18} />
            </button>

            {/* Mobile Brand Logo displayed in top bar */}
            <div className="mobile-brand-header">
              <div className="brand-icon" style={{ width: '28px', height: '28px', borderRadius: '7px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src="/logo.png"
                  alt="Logo"
                  style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', lineHeight: '1.2' }}>
                  JW Original Songs
                </span>
                <span style={{ fontSize: '9px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Admin
                </span>
              </div>
            </div>

            {/* Desktop Breadcrumb */}
            <div className="header-breadcrumb">
              <span className="bc-dim">Admin</span>
              <span className="bc-sep">/</span>
              <span className="bc-active">{currentTabLabel}</span>
            </div>
          </div>

          {/* Right: Quick Search, Theme, Notifications, Avatar */}
          <div className="header-right">
            {/* Quick Search Palette Trigger (Desktop only) */}
            <div
              className="search-trigger"
              onClick={() => setPaletteOpen(true)}
              title="Search songs, feedback, or actions (Ctrl + K)"
            >
              <Search size={14} color="#8b5cf6" />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Search songs, feedback, or actions...
              </span>
              <span className="kbd">Ctrl K</span>
            </div>

            {/* Notification Bell with indicator */}
            <button
              onClick={() => setTab('feedback')}
              className="btn-icon-admin"
              title={unreadFeedbackCount > 0 ? `${unreadFeedbackCount} unread message(s)` : 'Feedback Notifications'}
              style={{ position: 'relative' }}
            >
              <Bell size={16} />
              {unreadFeedbackCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#ec4899',
                }} />
              )}
            </button>

            {/* Theme Switcher Toggle (Desktop only) */}
            <button
              onClick={toggleAdminTheme}
              className="btn-icon-admin desktop-only-btn"
              title={adminTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
              {adminTheme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* User Avatar Circle */}
            <div
              onClick={() => setMobileMenuOpen(true)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '700',
                flexShrink: 0,
                cursor: 'pointer',
              }}
              title={session.user?.email || 'Admin'}
            >
              {userInitial}
            </div>
          </div>
        </header>

        {/* Content Workspace */}
        <main className="admin-content">
          <Outlet context={{ currentTab }} />
        </main>
      </div>

      {/* Global Command Palette Modal (Ctrl + K) */}
      {paletteOpen && (
        <div
          className="palette-overlay"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="palette-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="palette-search">
              <Search size={16} color="#8b5cf6" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Type a song title or action..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
              />
              {paletteQuery ? (
                <button
                  onClick={() => setPaletteQuery('')}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={15} />
                </button>
              ) : (
                <span className="kbd" style={{ fontSize: '10px', color: '#a1a1aa' }}>ESC</span>
              )}
            </div>

            {/* Results or Quick Actions */}
            <div className="palette-results">
              {paletteQuery.trim() ? (
                paletteLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#a1a1aa', fontSize: '13px' }}>
                    Searching songs...
                  </div>
                ) : paletteResults.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                    No songs found matching "{paletteQuery}"
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '11px', color: '#71717a', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                      Matching Songs ({paletteResults.length})
                    </div>
                    {paletteResults.map((song) => {
                      const isPlaying = playingAudioId === song.id;
                      return (
                        <div
                          key={song.id}
                          className="palette-result-item"
                          onClick={() => executeAction(() => navigate(`/admin?tab=songs&editSongId=${song.id}`))}
                        >
                          {song.feature_image_url ? (
                            <img src={song.feature_image_url} alt="" className="result-img" />
                          ) : (
                            <div className="result-img-placeholder">
                              <Music size={16} color="#71717a" />
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {song.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{song.categories?.name || 'Uncategorized'}</span>
                              <span>·</span>
                              <span style={{ color: song.is_published ? '#22c55e' : '#f87171' }}>
                                {song.is_published ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {song.mp3_url && (
                              <button
                                onClick={(e) => togglePaletteAudio(song, e)}
                                title={isPlaying ? 'Pause' : 'Play Preview'}
                                className="btn-icon-admin"
                                style={{ width: '30px', height: '30px', background: isPlaying ? '#8b5cf6' : undefined, color: isPlaying ? '#fff' : undefined }}
                              >
                                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                              </button>
                            )}

                            <button
                              onClick={(e) => copyId(song.id, e)}
                              title="Copy Song ID"
                              className="btn-icon-admin"
                              style={{ width: '30px', height: '30px' }}
                            >
                              {copiedId === song.id ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                            </button>

                            <button
                              onClick={() => executeAction(() => navigate(`/admin?tab=songs&editSongId=${song.id}`))}
                              className="btn-admin-edit"
                              style={{ padding: '5px 8px', fontSize: '11px' }}
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Quick Shortcuts when search is empty */
                <div className="palette-actions">
                  <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                    Quick Actions
                  </div>
                  <div className="palette-action-grid">
                    <button
                      onClick={() => executeAction(() => navigate('/admin?tab=songs&newSong=true'))}
                      className="palette-action-btn"
                    >
                      <Plus size={15} color="#8b5cf6" />
                      <span>Add New Song</span>
                    </button>

                    <button
                      onClick={() => executeAction(() => navigate('/admin?tab=feedback'))}
                      className="palette-action-btn"
                    >
                      <MessageSquare size={15} color="#ec4899" />
                      <span>User Feedback</span>
                    </button>

                    <button
                      onClick={() => executeAction(() => navigate('/admin?tab=songs&status=no_audio'))}
                      className="palette-action-btn"
                    >
                      <Filter size={15} color="#f59e0b" />
                      <span>Missing Audio</span>
                    </button>

                    <button
                      onClick={() => executeAction(() => navigate('/admin?tab=notifications'))}
                      className="palette-action-btn"
                    >
                      <Megaphone size={15} color="#3b82f6" />
                      <span>Push Alerts</span>
                    </button>
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
