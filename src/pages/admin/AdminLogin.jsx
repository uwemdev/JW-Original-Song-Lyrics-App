import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen flex w-full bg-[#030712] overflow-hidden">
      
      {/* Left Abstract Side */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center bg-black overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[#030712] z-0"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#8B5CF6] mix-blend-screen filter blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-[#F472B6] mix-blend-screen filter blur-[120px] opacity-20"></div>
        
        <div className="relative z-10 text-center p-12 max-w-lg">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#F472B6] flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.6)] mb-8">
            <Lock color="white" size={40} />
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4">Content Management System</h2>
          <p className="text-xl text-secondary">Sign in to orchestrate your music catalog, manage categories, and publish lyrics to the mobile app.</p>
        </div>
      </div>

      {/* Right Login Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#F472B6] flex items-center justify-center shadow-glow mb-4">
              <Lock color="white" size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-center">CMS Login</h1>
          </div>

          <div className="hidden lg:block mb-10">
            <h1 className="text-3xl font-extrabold mb-2">Welcome Back</h1>
            <p className="text-secondary">Please enter your credentials to continue.</p>
          </div>

          {error && (
            <div className="alert alert-error mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="form-group mb-0 relative">
              <label className="text-sm font-semibold mb-2 block text-secondary">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl focus:border-[#8B5CF6] focus:bg-[rgba(255,255,255,0.05)] text-white transition-all outline-none"
                placeholder="admin@example.com"
              />
            </div>
            
            <div className="form-group mb-0 relative">
              <label className="text-sm font-semibold mb-2 block text-secondary">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl focus:border-[#8B5CF6] focus:bg-[rgba(255,255,255,0.05)] text-white transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full py-3 mt-4 text-base shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
