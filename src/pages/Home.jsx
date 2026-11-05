import React, { useState, useRef } from 'react';
import './LandingPage.css';
import {
  Music,
  Download,
  Star,
  Users,
  Layers,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Menu,
  X,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Bell,
  Heart,
  Share2,
  CheckCircle2,
  CloudDownload,
  FolderPlus,
  ArrowRight,
  Volume2,
} from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.jworiginalsongslyrics.app';

// Official Google Play colorful triangle logo
function GooglePlayLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3.6 2.4C3.3 2.8 3.1 3.4 3.1 4.1V19.9C3.1 20.6 3.3 21.2 3.6 21.6L3.7 21.7L13.8 11.6V11.4L3.7 2.3L3.6 2.4Z" fill="#2196F3" />
      <path d="M17.2 15.0L13.8 11.6V11.4L17.2 8.0L17.3 8.1L21.3 10.4C22.4 11.0 22.4 12.0 21.3 12.6L17.3 14.9L17.2 15.0Z" fill="#FFC107" />
      <path d="M17.3 14.9L13.8 11.5L3.6 21.7C4.0 22.1 4.6 22.2 5.4 21.7L17.3 14.9Z" fill="#F44336" />
      <path d="M17.3 8.1L5.4 1.3C4.6 0.8 4.0 0.9 3.6 1.3L13.8 11.5L17.3 8.1Z" fill="#4CAF50" />
    </svg>
  );
}

// --------------------------------------------------------------------------
// Phone Mockup Screens Matching the Visual Reference
// --------------------------------------------------------------------------

// 1. Home Screen (Song of the Day + Categories)
function PhoneScreenHome() {
  return (
    <div className="mockup-phone" style={{ height: '510px' }}>
      {/* Status Bar */}
      <div className="mockup-status-bar">
        <span>9:41</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '9px' }}>5G</span>
          <div style={{ width: '16px', height: '8px', border: '1px solid #fff', borderRadius: '2px', padding: '1px' }}>
            <div style={{ width: '80%', height: '100%', background: '#fff' }} />
          </div>
        </div>
      </div>

      <div className="mockup-screen-body" style={{ padding: '10px 12px', background: '#0d0915' }}>
        {/* App Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={12} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#fff', lineHeight: '1.1' }}>JW Original Songs</div>
              <div style={{ fontSize: '7px', color: '#a78bfa', fontWeight: '600' }}>Lyrics</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', color: '#cbd5e1' }}>
            <Search size={13} />
            <Bell size={13} />
          </div>
        </div>

        {/* Song of the Day Card */}
        <div
          style={{
            borderRadius: '14px',
            padding: '12px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #f97316 100%)',
            marginBottom: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>
            Song of the Day
          </div>
          <div style={{ fontSize: '13px', fontWeight: '900', color: '#fff', margin: '4px 0 10px 0', lineHeight: '1.2', maxWidth: '140px' }}>
            I Trust in Your Loyal Love
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.85)' }}>Original</span>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <Play size={12} style={{ marginLeft: '1px' }} />
            </div>
          </div>
        </div>

        {/* Browse by Category */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff' }}>Browse by Category</span>
          <span style={{ fontSize: '9px', color: '#a78bfa', fontWeight: '600' }}>See All</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { title: 'Original Songs', count: '13 songs', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=120&q=80' },
            { title: "Become Jehovah's Friend Original Songs", count: '20 songs', img: 'https://images.unsplash.com/photo-1493225457124-a1a2a2954024?auto=format&fit=crop&w=120&q=80' },
            { title: "Become Jehovah's Friend Sing With Us", count: '18 songs', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=120&q=80' },
          ].map((cat, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#161124',
                padding: '6px 8px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <img src={cat.img} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cat.title}
                </div>
                <div style={{ fontSize: '8px', color: '#94a3b8' }}>{cat.count}</div>
              </div>
              <ChevronRight size={12} color="#64748b" />
            </div>
          ))}
        </div>

        {/* Bottom Tab Bar */}
        <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#8b5cf6' }}>
            <Music size={13} />
            <span style={{ fontSize: '7px', fontWeight: '700', marginTop: '2px' }}>Home</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
            <Volume2 size={13} />
            <span style={{ fontSize: '7px', marginTop: '2px' }}>Songs</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
            <Layers size={13} />
            <span style={{ fontSize: '7px', marginTop: '2px' }}>Playlists</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
            <Download size={13} />
            <span style={{ fontSize: '7px', marginTop: '2px' }}>Library</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Now Playing / Lyrics Screen
function PhoneScreenPlayer() {
  return (
    <div className="mockup-phone" style={{ height: '510px' }}>
      {/* Status Bar */}
      <div className="mockup-status-bar">
        <span>9:41</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '9px' }}>5G</span>
          <div style={{ width: '16px', height: '8px', border: '1px solid #fff', borderRadius: '2px', padding: '1px' }}>
            <div style={{ width: '80%', height: '100%', background: '#fff' }} />
          </div>
        </div>
      </div>

      <div className="mockup-screen-body" style={{ padding: '8px 12px 12px 12px', background: '#0e0918', textAlign: 'center' }}>
        {/* Top Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <ChevronLeft size={14} color="#fff" />
          <div style={{ display: 'flex', gap: '10px', color: '#cbd5e1' }}>
            <Heart size={13} />
            <Share2 size={13} />
          </div>
        </div>

        {/* Artwork & Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
          <img
            src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=180&q=80"
            alt="Rise Again"
            style={{ width: '58px', height: '58px', borderRadius: '10px', objectFit: 'cover', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', marginBottom: '6px' }}
          />
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>Rise Again</div>
          <div style={{ fontSize: '8px', color: '#94a3b8' }}>Original Songs</div>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'inline-flex', background: '#1c152a', padding: '2px', borderRadius: '20px', marginBottom: '12px' }}>
          <span style={{ padding: '3px 12px', borderRadius: '16px', background: '#8b5cf6', color: '#fff', fontSize: '8px', fontWeight: '700' }}>Lyrics</span>
          <span style={{ padding: '3px 12px', color: '#94a3b8', fontSize: '8px' }}>About</span>
        </div>

        {/* Synchronized Karaoke Lyrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0 16px 0', minHeight: '110px', justifyContent: 'center' }}>
          <div style={{ fontSize: '9.5px', color: '#64748b' }}>When we feel weak</div>
          <div style={{ fontSize: '9.5px', color: '#64748b' }}>And can't go on</div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>Jehovah gives us strength</div>
          <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#fff', background: 'rgba(139, 92, 246, 0.35)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.5)' }}>
            To help us stand strong
          </div>
        </div>

        {/* Scrub Bar */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ height: '3px', background: '#27272a', borderRadius: '2px', position: 'relative', marginBottom: '4px' }}>
            <div style={{ width: '38%', height: '100%', background: '#8b5cf6', borderRadius: '2px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#64748b' }}>
            <span>1:24</span>
            <span>3:56</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px' }}>
          <RotateCcw size={16} color="#94a3b8" />
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.5)' }}>
            <Play size={16} style={{ marginLeft: '1px' }} />
          </div>
          <RotateCw size={16} color="#94a3b8" />
        </div>
      </div>
    </div>
  );
}

// 3. Playlists Screen (Features section)
function PhoneScreenPlaylists() {
  return (
    <div className="mockup-phone" style={{ height: '460px', width: '260px' }}>
      <div className="mockup-status-bar">
        <span>9:41</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '9px' }}>5G</span>
          <div style={{ width: '16px', height: '8px', border: '1px solid #fff', borderRadius: '2px', padding: '1px' }}>
            <div style={{ width: '80%', height: '100%', background: '#fff' }} />
          </div>
        </div>
      </div>

      <div className="mockup-screen-body" style={{ padding: '12px', background: '#0e0a19' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChevronLeft size={16} color="#fff" />
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>Playlists</span>
          </div>
          <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <FolderPlus size={13} />
          </div>
        </div>

        {/* Playlists List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { name: 'Family Worship', count: '12 songs', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=120&q=80' },
            { name: 'Morning Commute', count: '18 songs', img: 'https://images.unsplash.com/photo-1493225457124-a1a2a2954024?auto=format&fit=crop&w=120&q=80' },
            { name: 'Convention Prep', count: '25 songs', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=120&q=80' },
          ].map((pl, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#181228',
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <img src={pl.img} alt="" style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>{pl.name}</div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>{pl.count}</div>
              </div>
              <div style={{ color: '#64748b', fontSize: '14px', paddingRight: '4px' }}>···</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Offline Tracks Screen
function PhoneScreenOffline() {
  return (
    <div className="mockup-phone" style={{ height: '440px', width: '220px' }}>
      <div className="mockup-status-bar">
        <span>9:41</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          <span style={{ fontSize: '8px' }}>5G</span>
        </div>
      </div>
      <div className="mockup-screen-body" style={{ padding: '10px', background: '#0e0a19' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <ChevronLeft size={14} color="#fff" />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff' }}>Offline Tracks</span>
        </div>
        <div style={{ fontSize: '8px', color: '#a78bfa', fontWeight: '700', marginBottom: '10px' }}>
          Downloaded Songs (24)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { name: 'Rise Again', size: '3.8 MB' },
            { name: 'Count My Blessings', size: '4.1 MB' },
            { name: 'I Trust in You', size: '3.6 MB' },
          ].map((t, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#161124', padding: '6px 8px', borderRadius: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#2e1065', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={12} color="#a78bfa" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                <div style={{ fontSize: '7.5px', color: '#22c55e' }}>{t.size}</div>
              </div>
              <CheckCircle2 size={12} color="#22c55e" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 5. Create Lyric Card Screen
function PhoneScreenCard() {
  return (
    <div className="mockup-phone" style={{ height: '440px', width: '220px' }}>
      <div className="mockup-status-bar">
        <span>9:41</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          <span style={{ fontSize: '8px' }}>5G</span>
        </div>
      </div>
      <div className="mockup-screen-body" style={{ padding: '10px', background: '#0e0a19', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <ChevronLeft size={14} color="#fff" />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff' }}>Create Lyric Card</span>
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: '12px',
            backgroundImage: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '10px',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'relative', zIndex: 1, fontSize: '12px', fontWeight: '800', color: '#fff', lineHeight: '1.4' }}>
            Jehovah gives us strength to help us stand strong.
          </div>
        </div>
        <div style={{ background: '#22c55e', color: '#fff', padding: '7px 0', borderRadius: '8px', fontSize: '9px', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <Share2 size={11} />
          <span>Share to WhatsApp</span>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Main Landing Page Component
// --------------------------------------------------------------------------
export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const galleryRef = useRef(null);

  const scrollGallery = (direction) => {
    if (galleryRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      galleryRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-shell" id="home">
      {/* ------------------------------------------------------------------
          1. Header and Navigation
         ------------------------------------------------------------------ */}
      <header className="lp-header">
        <div className="landing-container">
          <div className="lp-header-content">
            {/* Brand Logo & Name */}
            <a href="#home" className="lp-brand">
              <div className="lp-brand-icon">
                <img src="/logo.png" alt="Logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <span className="lp-brand-name">JW Original Songs Lyrics</span>
            </a>

            {/* Desktop Navigation */}
            <nav className="lp-nav-links">
              <a
                href="#home"
                onClick={() => setActiveTab('home')}
                className={`lp-nav-link ${activeTab === 'home' ? 'active' : ''}`}
              >
                Home
              </a>
              <a
                href="#features"
                onClick={() => setActiveTab('features')}
                className={`lp-nav-link ${activeTab === 'features' ? 'active' : ''}`}
              >
                Features
              </a>
              <a
                href="#screenshots"
                onClick={() => setActiveTab('screenshots')}
                className={`lp-nav-link ${activeTab === 'screenshots' ? 'active' : ''}`}
              >
                Screenshots
              </a>
              <a
                href="#about"
                onClick={() => setActiveTab('about')}
                className={`lp-nav-link ${activeTab === 'about' ? 'active' : ''}`}
              >
                About
              </a>
            </nav>

            {/* Google Play CTA Button */}
            <div className="lp-header-actions">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn-playstore-white"
              >
                <GooglePlayLogo size={16} />
                <span>Get it on Google Play</span>
              </a>

              <button
                className="lp-mobile-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div style={{ padding: '16px 0 8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <a
                  href="#home"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#fff', fontSize: '14px', textDecoration: 'none', fontWeight: '600' }}
                >
                  Home
                </a>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#cbd5e1', fontSize: '14px', textDecoration: 'none' }}
                >
                  Features
                </a>
                <a
                  href="#screenshots"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#cbd5e1', fontSize: '14px', textDecoration: 'none' }}
                >
                  Screenshots
                </a>
                <a
                  href="#about"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#cbd5e1', fontSize: '14px', textDecoration: 'none' }}
                >
                  About
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------
          2. Hero Section
         ------------------------------------------------------------------ */}
      <section className="lp-hero-section">
        <div className="landing-container">
          <div className="lp-hero-grid">
            {/* Left Column: Copy & Actions */}
            <div>
              <div className="lp-hero-tag-pill">
                <span>Sing</span>
                <span>•</span>
                <span>Learn</span>
                <span>•</span>
                <span>Listen</span>
                <span>•</span>
                <span>Offline</span>
              </div>

              <h1 className="lp-hero-title">
                Original Songs
                <br />
                Lyrics, Anytime,
                <br />
                Anywhere
              </h1>

              <p className="lp-hero-desc">
                Browse, read, listen, and sing along to your favourite JW Original Songs — with playlists, offline listening, karaoke lyrics, and more.
              </p>

              <div className="lp-hero-ctas">
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-btn-playstore-white"
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  <GooglePlayLogo size={18} />
                  <span>Get it on Google Play</span>
                </a>

                <a href="#features" className="lp-btn-learn-more">
                  <span>Learn More</span>
                  <span style={{ fontSize: '12px' }}>↓</span>
                </a>
              </div>

              {/* Trust/Stats Row */}
              <div className="lp-hero-trust-row">
                <div className="lp-trust-item">
                  <div className="lp-trust-item-icon">
                    <Download size={18} />
                  </div>
                  <div>
                    <div className="lp-trust-value">10,000+</div>
                    <div className="lp-trust-label">Downloads</div>
                  </div>
                </div>

                <div className="lp-trust-item">
                  <div className="lp-trust-item-icon">
                    <Star size={18} fill="#a78bfa" color="#a78bfa" />
                  </div>
                  <div>
                    <div className="lp-trust-value">4.8/5</div>
                    <div className="lp-trust-label">User Rating</div>
                  </div>
                </div>

                <div className="lp-trust-item">
                  <div className="lp-trust-item-icon">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="lp-trust-value">For All Ages</div>
                    <div className="lp-trust-label">Individuals & Families</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Two Overlapping Phone Mockups */}
            <div className="lp-hero-phones-wrap">
              <div className="lp-hero-phones-glow" />

              <div className="lp-hero-phone-front">
                <PhoneScreenHome />
              </div>

              <div className="lp-hero-phone-back">
                <PhoneScreenPlayer />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Wave Divider */}
        <div className="lp-hero-wave-divider">
          <svg viewBox="0 0 1440 100" fill="none" preserveAspectRatio="none">
            <path
              d="M0,25 C320,80 640,95 960,50 C1200,15 1360,60 1440,40 L1440,100 L0,100 Z"
              fill="rgba(255,255,255,0.18)"
            />
            <path
              d="M0,45 C240,95 480,110 720,70 C960,35 1200,85 1440,55 L1440,100 L0,100 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          3. Four-Item Feature Highlights Strip
         ------------------------------------------------------------------ */}
      <section className="lp-highlights-strip">
        <div className="landing-container">
          <div className="lp-highlights-grid">
            {/* Item 1 */}
            <div className="lp-highlight-item">
              <div className="lp-highlight-icon-box">
                <Music size={22} />
              </div>
              <div>
                <div className="lp-highlight-title">Read & Listen</div>
                <p className="lp-highlight-desc">Song lyrics with audio playback</p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="lp-highlight-item">
              <div className="lp-highlight-icon-box">
                <Layers size={22} />
              </div>
              <div>
                <div className="lp-highlight-title">Create Playlists</div>
                <p className="lp-highlight-desc">Organize songs for worship, study, and more</p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="lp-highlight-item">
              <div className="lp-highlight-icon-box">
                <Download size={22} />
              </div>
              <div>
                <div className="lp-highlight-title">Listen Offline</div>
                <p className="lp-highlight-desc">Download songs and play anytime</p>
              </div>
            </div>

            {/* Item 4 */}
            <div className="lp-highlight-item">
              <div className="lp-highlight-icon-box">
                <Sparkles size={22} />
              </div>
              <div>
                <div className="lp-highlight-title">More Than Lyrics</div>
                <p className="lp-highlight-desc">Karaoke mode, lyric cards, quizzes, and daily songs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          4. Detailed Features Section
         ------------------------------------------------------------------ */}
      <section className="lp-detailed-features" id="features">
        <div className="landing-container">
          <div className="lp-features-grid">
            {/* Left Column: Text & Checklist */}
            <div>
              <span className="lp-pill-badge">Features</span>
              <h2 className="lp-section-title">
                Everything You Need for a Better Song Experience
              </h2>
              <p className="lp-section-desc">
                More than just lyrics — enjoy helpful tools that make learning, singing, and enjoying Original Songs easier and more rewarding.
              </p>

              <div className="lp-checklist">
                {[
                  'Synchronized karaoke lyrics',
                  'Floating mini-player & continuous play',
                  'Custom playlists and favorites',
                  'Private offline downloads',
                  'WhatsApp lyric card generator',
                  '"Finish the Lyric" family quiz',
                  'Mood-based song discovery',
                  'Daily Song of the Day',
                ].map((item, idx) => (
                  <div key={idx} className="lp-check-item">
                    <div className="lp-check-circle">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Tilted Phone & Floating Decorative Elements */}
            <div className="lp-features-visual">
              <div className="lp-features-visual-circle" />

              {/* Floating Music Note Card */}
              <div className="lp-float-badge-left">
                <Music size={26} />
              </div>

              {/* Floating Cloud Download Card */}
              <div className="lp-float-badge-right">
                <CloudDownload size={24} />
              </div>

              {/* Phone Mockup (Playlists Screen) */}
              <div className="lp-features-phone">
                <PhoneScreenPlaylists />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          5. App Screenshots Gallery
         ------------------------------------------------------------------ */}
      <section className="lp-gallery-section" id="screenshots">
        <div className="landing-container">
          <div className="lp-gallery-header">
            <div>
              <span className="lp-pill-badge">App Screenshots</span>
              <h2 className="lp-section-title" style={{ margin: '4px 0 6px 0' }}>
                Take a Closer Look
              </h2>
              <p className="lp-section-desc" style={{ margin: 0 }}>
                A clean, simple, and easy-to-use app designed for everyone.
              </p>
            </div>

            <div className="lp-gallery-arrows">
              <button
                className="lp-gallery-arrow-btn"
                onClick={() => scrollGallery('left')}
                title="Scroll left"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="lp-gallery-arrow-btn"
                onClick={() => scrollGallery('right')}
                title="Scroll right"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Gallery Horizontal Track */}
          <div className="lp-gallery-track" ref={galleryRef}>
            <div className="lp-gallery-card">
              <PhoneScreenHome />
            </div>
            <div className="lp-gallery-card">
              <PhoneScreenPlayer />
            </div>
            <div className="lp-gallery-card">
              <PhoneScreenOffline />
            </div>
            <div className="lp-gallery-card">
              <PhoneScreenCard />
            </div>
          </div>

          {/* Pagination Indicators */}
          <div className="lp-gallery-dots">
            <span className="lp-dot active" />
            <span className="lp-dot" />
            <span className="lp-dot" />
            <span className="lp-dot" />
            <span className="lp-dot" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          6. Testimonials Section
         ------------------------------------------------------------------ */}
      <section className="lp-testimonials-section" id="about">
        <div className="landing-container">
          <h2 className="lp-section-title" style={{ textAlign: 'left' }}>
            What Users Are Saying
          </h2>

          <div className="lp-testimonials-grid">
            {/* Card 1 */}
            <div className="lp-testimonial-card">
              <div>
                <div className="lp-stars-row">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="#eab308" color="#eab308" />
                  ))}
                </div>
                <p className="lp-testimonial-quote">
                  "A very helpful app! I can easily find lyrics, listen, and even download my favourite songs."
                </p>
              </div>
              <div className="lp-testimonial-author">
                <div className="lp-author-avatar">M</div>
                <div className="lp-author-name">— Mary T.</div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="lp-testimonial-card">
              <div>
                <div className="lp-stars-row">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="#eab308" color="#eab308" />
                  ))}
                </div>
                <p className="lp-testimonial-quote">
                  "The karaoke feature and playlists are amazing. It makes learning songs so much easier!"
                </p>
              </div>
              <div className="lp-testimonial-author">
                <div className="lp-author-avatar">D</div>
                <div className="lp-author-name">— Daniel K.</div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="lp-testimonial-card">
              <div>
                <div className="lp-stars-row">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill="#eab308" color="#eab308" />
                  ))}
                </div>
                <p className="lp-testimonial-quote">
                  "Simple, clean, and easy to use. Perfect for family worship and personal study."
                </p>
              </div>
              <div className="lp-testimonial-author">
                <div className="lp-author-avatar">E</div>
                <div className="lp-author-name">— Esther M.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          7. Download Call-To-Action Banner
         ------------------------------------------------------------------ */}
      <section className="lp-cta-section">
        <div className="landing-container">
          <div className="lp-cta-banner">
            <div className="lp-cta-left">
              <div className="lp-cta-icon">
                <Music size={26} />
              </div>
              <div>
                <h2 className="lp-cta-title">Get JW Original Songs Lyrics Today</h2>
                <p className="lp-cta-desc">
                  Read, listen, sing along, and keep your favourite Original Songs with you always.
                </p>
              </div>
            </div>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn-playstore-white"
              style={{ padding: '12px 24px', fontSize: '13px' }}
            >
              <GooglePlayLogo size={18} />
              <span>Get it on Google Play</span>
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          8. Footer
         ------------------------------------------------------------------ */}
      <footer className="lp-footer">
        <div className="landing-container">
          <div className="lp-footer-content">
            {/* Left Brand */}
            <div className="lp-footer-left">
              <div className="lp-brand-icon" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <img src="/logo.png" alt="Logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', lineHeight: '1.2' }}>
                  JW Original Songs Lyrics
                </div>
                <div className="lp-footer-tagline">Original Songs at Your Fingertips</div>
              </div>
            </div>

            {/* Center Navigation Links */}
            <ul className="lp-footer-links">
              <li><a href="#home" className="lp-footer-link">Home</a></li>
              <li><a href="#features" className="lp-footer-link">Features</a></li>
              <li><a href="#screenshots" className="lp-footer-link">Screenshots</a></li>
              <li><a href="#about" className="lp-footer-link">About</a></li>
            </ul>

            {/* Right: Unofficial App Notice */}
            <div className="lp-footer-disclaimer-pill">
              <Info size={13} color="#94a3b8" />
              <span>Independent & Unofficial App</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
