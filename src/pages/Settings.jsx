import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Moon, Sun, Download, Trash2, Smartphone, ShieldCheck, Check, Sparkles, ExternalLink } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme } = useContext(AppContext);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install on iOS: Tap Share and then "Add to Home Screen". On Android/Chrome: Tap the three dots menu and select "Install app".');
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Clear cached app data and refresh?')) {
      try {
        localStorage.removeItem('jw_last_viewed_notification');
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        setClearedNotice(true);
        setTimeout(() => setClearedNotice(false), 3000);
      } catch (_) {}
    }
  };

  return (
    <div className="main-content animate-fade-in pb-24">
      {/* Topbar */}
      <div className="topbar mb-5" style={{ margin: '-1rem -1rem 1.25rem -1rem', padding: '1.25rem 1rem' }}>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-xs text-secondary">Preferences and web app options</p>
      </div>

      {/* Appearance Card */}
      <div className="card mb-4 p-4 rounded-2xl">
        <h2 className="text-sm font-bold mb-3 border-b border-border-color pb-2 text-white">
          Appearance
        </h2>
        
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-bg-card hover:bg-bg-hover cursor-pointer transition-colors m-0 border border-border-color">
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-primary" />
              <span className="text-xs font-semibold text-white">Dark Mode</span>
            </div>
            <input 
              type="radio" 
              name="theme" 
              checked={theme === 'dark'} 
              onChange={() => setTheme('dark')}
              style={{ width: 'auto', marginBottom: 0, accentColor: 'var(--primary-color)' }}
            />
          </label>
          
          <label className="flex items-center justify-between p-3 rounded-xl bg-bg-card hover:bg-bg-hover cursor-pointer transition-colors m-0 border border-border-color">
            <div className="flex items-center gap-3">
              <Sun size={18} className="text-primary" />
              <span className="text-xs font-semibold text-white">Light Mode</span>
            </div>
            <input 
              type="radio" 
              name="theme" 
              checked={theme === 'light'} 
              onChange={() => setTheme('light')}
              style={{ width: 'auto', marginBottom: 0, accentColor: 'var(--primary-color)' }}
            />
          </label>
        </div>
      </div>

      {/* Web App Installation Card */}
      <div className="card mb-4 p-4 rounded-2xl">
        <h2 className="text-sm font-bold mb-3 border-b border-border-color pb-2 text-white flex items-center gap-2">
          <Smartphone size={16} className="text-primary" />
          <span>Browser App Mode</span>
        </h2>
        <p className="text-xs text-secondary mb-3 leading-relaxed">
          Install this web app to your device home screen for fullscreen viewing, quick offline lyrics access, and faster loading.
        </p>
        
        {installed ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-medium">
            <Check size={16} />
            <span>App installed and running in standalone mode</span>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            className="btn btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2 font-semibold"
          >
            <Download size={15} />
            <span>Install App to Home Screen</span>
          </button>
        )}
      </div>

      {/* Storage and Cache */}
      <div className="card mb-4 p-4 rounded-2xl">
        <h2 className="text-sm font-bold mb-3 border-b border-border-color pb-2 text-white">
          Data & Storage
        </h2>
        <p className="text-xs text-secondary mb-3 leading-relaxed">
          Reset local temporary storage and clear browser-cached song metadata.
        </p>

        {clearedNotice && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/10 border border-success/30 text-success text-xs mb-3 font-medium">
            <Check size={14} />
            <span>Local cache cleared successfully</span>
          </div>
        )}

        <button
          onClick={handleClearCache}
          className="btn btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2 text-secondary hover:text-white"
        >
          <Trash2 size={14} />
          <span>Clear Local Cache</span>
        </button>
      </div>
      
      {/* Admin Panel Portal */}
      <div className="card p-4 rounded-2xl">
        <h2 className="text-sm font-bold mb-3 border-b border-border-color pb-2 text-white">
          Administrative Portal
        </h2>
        <p className="text-xs text-secondary mb-4 leading-relaxed">
          Manage songs, categories, user feedback reports, push notifications, and app updates.
        </p>
        <a href="/admin/login" className="btn btn-secondary w-full text-center text-xs py-2.5 font-semibold">
          Access Admin Panel
        </a>
      </div>
    </div>
  );
}
