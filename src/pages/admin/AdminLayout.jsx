import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Music, FolderTree, Settings, LayoutDashboard, Search, Bell, Sun, Music2 } from 'lucide-react';

export default function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session fetch error:", error);
        setErrorMsg("Authentication service unavailable. Please check your connection or environment variables.");
      }
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.error("Session promise error:", err);
      setErrorMsg("Failed to connect to authentication server. Please check your environment variables.");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0c11] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#2d293b] border-t-[#F472B6] rounded-full animate-spin"></div>
          <p className="text-[#A78BFA] font-bold tracking-widest text-sm uppercase">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0c11] p-6 text-white">
        <div className="max-w-md p-8 bg-[#17151f] border border-[#EF4444]/30 rounded-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#EF4444]/10 text-[#EF4444] rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-[#9CA3AF] mb-6 text-sm">{errorMsg}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#2d293b] hover:bg-[#4a2e85] rounded font-bold transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex w-full min-h-screen bg-[#0d0c11] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[280px] bg-[#0d0c11] flex flex-col border-r border-[#2d293b] sticky top-0 h-screen overflow-y-auto">
        
        {/* Logo Area */}
        <div className="p-6 border-b border-[#2d293b] flex items-center gap-3">
          <div className="w-10 h-10 border border-[#2d293b] rounded flex items-center justify-center bg-[#17151f]">
            <Music2 color="#F472B6" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight tracking-wide">JW Original Songs</h3>
            <p className="text-[10px] font-bold tracking-widest text-[#A78BFA] uppercase">Admin Panel</p>
          </div>
        </div>
        
        {/* Navigation Sections */}
        <div className="p-4 flex-1 flex flex-col gap-8">
          
          {/* Overview Section */}
          <div>
            <h4 className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase mb-3 px-2">Overview</h4>
            <nav className="flex flex-col gap-1">
              <button 
                onClick={() => setTab('dashboard')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-all ${currentTab === 'dashboard' ? 'bg-[#17151f] text-white border-l-2 border-[#F472B6]' : 'text-[#9CA3AF] hover:bg-[#17151f] hover:text-white border-l-2 border-transparent'}`}
              >
                <LayoutDashboard size={18} /> Dashboard
              </button>
            </nav>
          </div>

          {/* Content Section */}
          <div>
            <h4 className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase mb-3 px-2">Content</h4>
            <nav className="flex flex-col gap-1">
              <button 
                onClick={() => setTab('songs')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-all ${currentTab === 'songs' ? 'bg-[#17151f] text-white border-l-2 border-[#F472B6]' : 'text-[#9CA3AF] hover:bg-[#17151f] hover:text-white border-l-2 border-transparent'}`}
              >
                <Music size={18} /> All Songs
              </button>
              <button 
                onClick={() => setTab('categories')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-all ${currentTab === 'categories' ? 'bg-[#17151f] text-white border-l-2 border-[#F472B6]' : 'text-[#9CA3AF] hover:bg-[#17151f] hover:text-white border-l-2 border-transparent'}`}
              >
                <FolderTree size={18} /> Categories
              </button>
            </nav>
          </div>

          {/* System Section */}
          <div>
            <h4 className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase mb-3 px-2">System</h4>
            <nav className="flex flex-col gap-1">
              <button 
                onClick={() => setTab('settings')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-all ${currentTab === 'settings' ? 'bg-[#17151f] text-white border-l-2 border-[#F472B6]' : 'text-[#9CA3AF] hover:bg-[#17151f] hover:text-white border-l-2 border-transparent'}`}
              >
                <Settings size={18} /> Settings
              </button>
            </nav>
          </div>

        </div>
        
        {/* Profile Footer */}
        <div className="border-t border-[#2d293b] p-4">
          <div className="flex items-center gap-3 p-2 bg-[#17151f] rounded border border-[#2d293b] mb-4">
            <div className="w-10 h-10 rounded bg-gradient-to-tr from-[#A78BFA] to-[#F472B6] flex items-center justify-center">
              <span className="text-white font-bold text-lg">{session.user?.email?.[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{session.user?.email?.split('@')[0] || 'Admin'}</p>
              <p className="text-[10px] font-bold tracking-widest text-[#A78BFA] uppercase">Super Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-[#9CA3AF] hover:text-white text-sm font-semibold px-2 transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0d0c11]">
        {/* Top Header */}
        <header className="h-[72px] border-b border-[#2d293b] flex items-center justify-between px-8 bg-[#0d0c11]">
          <div>
            <h1 className="text-xl font-bold tracking-wide capitalize">
              {currentTab === 'dashboard' ? 'Dashboard' : currentTab}
            </h1>
            <p className="text-xs text-[#6B7280]">Welcome back, {session.user?.email?.split('@')[0] || 'Admin'}</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={16} />
              <input 
                type="text" 
                placeholder="Search songs, categories..."
                className="bg-[#17151f] border border-[#2d293b] rounded py-1.5 pl-9 pr-4 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#A78BFA] w-64 transition-all"
              />
            </div>
            <div className="flex items-center gap-3 border-l border-[#2d293b] pl-6">
              <button className="w-8 h-8 flex items-center justify-center rounded bg-[#17151f] border border-[#2d293b] text-[#9CA3AF] hover:text-white transition-colors">
                <Bell size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-[#17151f] border border-[#2d293b] text-[#9CA3AF] hover:text-white transition-colors">
                <Settings size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-[#17151f] border border-[#2d293b] text-[#9CA3AF] hover:text-white transition-colors">
                <Sun size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic View Injection */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet context={{ currentTab }} />
        </div>
      </main>
    </div>
  );
}
