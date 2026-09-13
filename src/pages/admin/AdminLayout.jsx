import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Music, FolderTree, Settings, LayoutDashboard } from 'lucide-react';

export default function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="skeleton w-32 h-32 rounded-full"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#F472B6] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Music color="white" size={20} />
          </div>
          <h2 className="text-gradient">JW Lyrics</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`} onClick={() => navigate('/admin')}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button className="nav-item">
            <Music size={20} /> All Songs
          </button>
          <button className="nav-item">
            <FolderTree size={20} /> Categories
          </button>
          <button className="nav-item">
            <Settings size={20} /> Settings
          </button>
        </nav>
        
        <div className="mt-auto">
          <div className="card p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center">
              <span className="text-white font-bold">{session.user?.email?.[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{session.user?.email}</p>
              <p className="text-xs text-secondary">Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary w-full flex items-center justify-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
