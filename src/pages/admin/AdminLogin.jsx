import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, ArrowRight, Music2 } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/admin');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center w-full bg-[#0d0c11] text-white font-sans overflow-hidden relative p-4">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#2d1b4e 1px, transparent 1px), linear-gradient(90deg, #2d1b4e 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-0 left-1/4 w-[40%] h-[40%] bg-[#A78BFA] mix-blend-screen filter blur-[150px] opacity-20 rounded-full animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-[40%] h-[40%] bg-[#F472B6] mix-blend-screen filter blur-[150px] opacity-20 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* Centered Glassmorphism Card */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Card Container */}
        <div className="bg-[#170c26]/60 backdrop-blur-xl border border-[#4a2e85]/50 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#A78BFA] to-[#F472B6] flex items-center justify-center shadow-lg mb-4">
              <Music2 color="white" size={28} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[#F472B6] rounded-full shadow-[0_0_8px_#F472B6]"></div>
              <span className="text-xs font-bold tracking-wider text-[#A78BFA] uppercase">JW Original Songs</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-white">Admin Access</h1>
            <p className="text-sm text-[#9CA3AF]">Manage the music catalog and categories.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
              <div className="min-w-[20px]">
                <Lock size={16} />
              </div>
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold tracking-wider text-[#9CA3AF] mb-2 block uppercase">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#A78BFA]">
                  <Mail color="currentColor" size={18} className={email ? "text-[#A78BFA]" : "text-[#6B7280]"} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#0d0c11]/80 border border-[#2d293b] rounded-xl focus:border-[#A78BFA] focus:bg-[#0d0c11] text-white transition-all outline-none text-sm shadow-inner"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold tracking-wider text-[#9CA3AF] mb-2 block uppercase">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#A78BFA]">
                  <Lock color="currentColor" size={18} className={password ? "text-[#A78BFA]" : "text-[#6B7280]"} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#0d0c11]/80 border border-[#2d293b] rounded-xl focus:border-[#A78BFA] focus:bg-[#0d0c11] text-white transition-all outline-none text-sm shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1 mb-2">
              <button
                type="button" 
                className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer border transition-colors ${rememberMe ? 'bg-[#F472B6] border-[#F472B6]' : 'bg-[#0d0c11] border-[#2d293b]'}`}
                onClick={() => setRememberMe(!rememberMe)}
                aria-label="Remember me"
              >
                {rememberMe && <div className="w-2 h-2 bg-white rounded-sm"></div>}
              </button>
              <span className="text-sm text-[#D1D5DB] cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                Remember me for 30 days
              </span>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 font-bold text-white rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#F472B6] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,114,182,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
            </button>
          </form>

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center w-full px-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse shadow-[0_0_8px_#10B981]"></div>
            <span className="text-xs text-[#9CA3AF] font-medium tracking-wide">Systems online</span>
          </div>
          <span className="text-xs text-[#9CA3AF] font-medium tracking-wide">Secure Session</span>
        </div>

      </div>
    </div>
  );
}
