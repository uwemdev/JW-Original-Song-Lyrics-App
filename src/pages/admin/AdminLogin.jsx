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
    <div className="min-h-screen flex w-full bg-[#0d0c11] text-white font-sans overflow-hidden">
      
      {/* Left Abstract Side */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative bg-[#170c26] p-12 border-r border-[#2d1b4e]">
        {/* Decorative Grid/Glow */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#2d1b4e 1px, transparent 1px), linear-gradient(90deg, #2d1b4e 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute bottom-0 right-0 w-[80%] h-[80%] bg-[#8B5CF6] mix-blend-screen filter blur-[150px] opacity-20 rounded-full"></div>
        
        {/* Top Header */}
        <div className="relative z-10 flex justify-between items-start w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#4a2e85] rounded flex items-center justify-center bg-[#170c26]">
              <Music2 color="#F472B6" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight tracking-wide">Audiova</h3>
              <p className="text-[10px] font-bold tracking-widest text-[#A78BFA] uppercase">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-[#4a2e85] px-3 py-1.5 rounded bg-[#170c26]/50 backdrop-blur">
            <div className="w-2 h-2 bg-[#F472B6]"></div>
            <span className="text-xs font-bold tracking-wider text-[#A78BFA]">RESTRICTED</span>
          </div>
        </div>
        
        {/* Center Content */}
        <div className="relative z-10 mt-20 max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-[2px] bg-[#8B5CF6]"></div>
            <span className="text-xs font-bold tracking-widest text-[#A78BFA] uppercase">Command Center</span>
          </div>
          <h1 className="text-6xl font-extrabold text-white mb-2 tracking-tight">Audiova</h1>
          <h1 className="text-6xl font-extrabold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#A78BFA] to-[#F472B6]">
            admin gate
          </h1>
          <p className="text-lg text-[#9CA3AF] mb-12 max-w-md leading-relaxed">
            Manage artists, releases, payouts, and the full platform from one rectangular control room.
          </p>
          
          {/* Waveform Graphic */}
          <div className="flex items-end gap-2 h-24 opacity-80">
            {[30, 45, 30, 70, 90, 45, 60, 40, 60, 45].map((height, i) => (
              <div key={i} className="w-4 bg-gradient-to-t from-[#4a2e85] to-[#A78BFA] rounded-sm" style={{ height: `${height}%` }}></div>
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 flex justify-between items-center w-full border-t border-[#4a2e85]/50 pt-6 mt-12">
          <p className="text-sm text-[#9CA3AF]">
            <strong className="text-white">Secure session</strong> · encrypted credentials
          </p>
          <p className="text-sm text-[#4a2e85] font-bold">2026</p>
        </div>
      </div>

      {/* Right Login Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-[#0d0c11]">
        <div className="w-full max-w-[420px]">
          
          {/* Mobile Header (Hidden on LG) */}
          <div className="mb-12 lg:hidden flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-[#4a2e85] rounded flex items-center justify-center">
                <Music2 color="#F472B6" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight tracking-wide">Audiova</h3>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-[#F472B6]"></div>
              <span className="text-xs font-bold tracking-wider text-[#A78BFA]">ADMIN ACCESS</span>
            </div>
            <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Welcome back</h2>
            <p className="text-[#9CA3AF]">Sign in to the Audiova admin panel</p>
          </div>

          {error && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] p-3 rounded mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div>
              <label className="text-xs font-bold tracking-wider text-[#9CA3AF] mb-2 block uppercase">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail color="#6B7280" size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-[#17151f] border border-[#2d293b] rounded focus:border-[#A78BFA] focus:bg-[#1f1c29] text-white transition-all outline-none text-sm"
                  placeholder="admin@audiova.com"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold tracking-wider text-[#9CA3AF] mb-2 block uppercase">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock color="#6B7280" size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-[#17151f] border border-[#2d293b] rounded focus:border-[#A78BFA] focus:bg-[#1f1c29] text-white transition-all outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <div 
                className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer border ${rememberMe ? 'bg-[#F472B6] border-[#F472B6]' : 'bg-[#17151f] border-[#2d293b]'}`}
                onClick={() => setRememberMe(!rememberMe)}
              >
                {rememberMe && <div className="w-2.5 h-2.5 bg-white"></div>}
              </div>
              <label className="text-sm text-[#D1D5DB] cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                Remember me for 30 days
              </label>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 mt-2 font-bold text-white rounded bg-gradient-to-r from-[#A78BFA] to-[#F472B6] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,114,182,0.3)]"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
            </button>
          </form>

          {/* Right Bottom Footer */}
          <div className="flex justify-between items-center w-full border-t border-[#2d293b] pt-6 mt-12">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10B981]"></div>
              <span className="text-xs text-[#6B7280]">Systems online</span>
            </div>
            <span className="text-xs text-[#6B7280]">Audiova · Restricted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
