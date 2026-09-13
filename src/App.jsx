import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Splash from './pages/Splash';
import Home from './pages/Home';
import CategoryView from './pages/CategoryView';
import SongDetail from './pages/SongDetail';
import Settings from './pages/Settings';
import About from './pages/About';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import Navigation from './components/Navigation';
import AudioPlayer from './components/AudioPlayer';
import { seedCategoriesIfEmpty } from './lib/seedCategories';

export const AppContext = React.createContext();

function PublicLayout() {
  return (
    <>
      <Outlet />
      <AudioPlayer />
      <Navigation />
    </>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Attempt to seed categories on initial load if none exist
    seedCategoriesIfEmpty();
  }, []);

  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  return (
    <AppContext.Provider value={{ currentSong, setCurrentSong, isPlaying, setIsPlaying, theme, setTheme }}>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            {/* Public Routes with Navigation & AudioPlayer */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/category/:slug" element={<CategoryView />} />
              <Route path="/song/:id" element={<SongDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
            </Route>
            
            {/* Admin Routes (No Navigation/AudioPlayer) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
