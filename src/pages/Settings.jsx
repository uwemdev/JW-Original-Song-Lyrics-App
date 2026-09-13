import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme } = useContext(AppContext);

  return (
    <div className="main-content animate-fade-in">
      <div className="topbar mb-6" style={{ margin: '-1rem -1rem 1.5rem -1rem', padding: '1.5rem 1rem' }}>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Appearance</h2>
        
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between p-3 rounded-lg bg-bg-color hover:bg-bg-hover cursor-pointer transition-colors m-0">
            <div className="flex items-center gap-3">
              <Moon size={20} className="text-primary" />
              <span>Dark Mode</span>
            </div>
            <input 
              type="radio" 
              name="theme" 
              checked={theme === 'dark'} 
              onChange={() => setTheme('dark')}
              style={{ width: 'auto', marginBottom: 0 }}
            />
          </label>
          
          <label className="flex items-center justify-between p-3 rounded-lg bg-bg-color hover:bg-bg-hover cursor-pointer transition-colors m-0">
            <div className="flex items-center gap-3">
              <Sun size={20} className="text-primary" />
              <span>Light Mode</span>
            </div>
            <input 
              type="radio" 
              name="theme" 
              checked={theme === 'light'} 
              onChange={() => setTheme('light')}
              style={{ width: 'auto', marginBottom: 0 }}
            />
          </label>
        </div>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Admin</h2>
        <p className="text-sm text-secondary mb-4">
          Access the administrative panel to manage songs and categories.
        </p>
        <a href="/admin/login" className="btn btn-secondary w-full text-center">
          Go to Admin Panel
        </a>
      </div>
    </div>
  );
}
