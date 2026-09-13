import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Music, FolderTree, LayoutDashboard, Music2 } from 'lucide-react';

export default function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get('tab') || 'songs';

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const setTab = (tab) => {
    setSearchParams({ tab });
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
          {navItems.map(({ key, label, icon: Icon }) => (
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
              }}
            >
              <Icon size={18} />
              {label}
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

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet context={{ currentTab }} />
      </main>
    </div>
  );
}
