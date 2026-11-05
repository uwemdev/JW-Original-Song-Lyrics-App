import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Music,
  Shield,
  Globe,
  Bell,
  X,
  ExternalLink,
  Search,
  Sparkles,
  Download,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Heart,
  Headphones,
  BookOpen,
  Volume2,
  CheckCircle2,
  Sliders,
  FolderTree,
} from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.jworiginalsongslyrics.app';

const SCREENSHOTS = [
  {
    src: '/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-1.png',
    title: 'Home & Collections',
    desc: 'Browse official song collections with a clean, dark interface',
  },
  {
    src: '/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-2.png',
    title: 'Audio Streaming Player',
    desc: 'High-quality audio streaming with 10s skip and progress bar',
  },
  {
    src: '/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-3.png',
    title: 'Full-Text Lyrics',
    desc: 'Complete verified lyrics with adjustable text size for easy reading',
  },
  {
    src: '/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-4.png',
    title: 'Sing Along',
    desc: 'Special categories for family worship and spiritual encouragement',
  },
  {
    src: '/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-5.png',
    title: 'Fast Instant Search',
    desc: 'Find any song in seconds by searching title words or lyric phrases',
  },
  {
    src: '/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-6.png',
    title: 'Saved Favorites',
    desc: 'Bookmark beloved songs for quick one-tap access anytime',
  },
  {
    src: '/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-7.png',
    title: 'Reading Themes',
    desc: 'Comfortable dark and light themes crafted for prolonged reading',
  },
  {
    src: '/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-8.png',
    title: 'In-App Support',
    desc: 'Report missing lyrics or audio issues directly to administrators',
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Complete Song Lyrics',
    desc: 'Follow along with complete, verified lyrics for all released songs. Scale text up or down for comfortable reading during personal study.',
  },
  {
    icon: Headphones,
    title: 'Crystal Clear Audio',
    desc: 'Listen to vocal and musical tracks with responsive playback, forward/backward seek, and background playback support.',
  },
  {
    icon: FolderTree,
    title: 'Organized Collections',
    desc: 'Explore Original Songs, Become Jehovah\'s Friend sing-alongs, International music, and themed praise songs.',
  },
  {
    icon: Search,
    title: 'Instant Search',
    desc: 'Quickly find songs by typing any word from the title, chorus, or verses. Real-time filtering shows instant results.',
  },
  {
    icon: Heart,
    title: 'Personal Favorites',
    desc: 'Save your most cherished songs to your personal list so they are always one tap away on your device.',
  },
  {
    icon: Smartphone,
    title: 'Lightweight & Ad-Free',
    desc: 'Designed strictly for spiritual upliftment. Fast performance, zero intrusive ads, and respectful of your data storage.',
  },
];

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [totalSongsCount, setTotalSongsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // In-app notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);

  // Screenshot gallery scroll
  const galleryRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [catsRes, songsRes, notifsRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order', { ascending: true }),
          supabase.from('songs').select('id, category_id').eq('is_published', true),
          supabase.from('push_notifications').select('*').order('sent_at', { ascending: false }).limit(10),
        ]);

        if (catsRes.data) {
          setCategories(catsRes.data);
        } else {
          setCategories([
            { id: '1', name: 'Original Songs', slug: 'original-songs' },
            { id: '2', name: "Become Jehovah's Friend — Original Songs", slug: 'bjf-original' },
            { id: '3', name: "Become Jehovah's Friend — Sing With Us", slug: 'bjf-sing' },
            { id: '4', name: 'International Music', slug: 'international' },
          ]);
        }

        if (songsRes.data) {
          setTotalSongsCount(songsRes.data.length);
          const counts = {};
          for (const s of songsRes.data) {
            counts[s.category_id] = (counts[s.category_id] || 0) + 1;
          }
          setCategoryCounts(counts);
        }

        if (notifsRes.data && notifsRes.data.length > 0) {
          setNotifications(notifsRes.data);
          const lastViewed = localStorage.getItem('jw_last_viewed_notification');
          const latestSent = notifsRes.data[0]?.sent_at;
          if (!lastViewed || new Date(latestSent) > new Date(lastViewed)) {
            setHasUnreadNotice(true);
          }
        }
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const openNotifications = () => {
    setNotificationModalOpen(true);
    setHasUnreadNotice(false);
    if (notifications.length > 0) {
      try {
        localStorage.setItem('jw_last_viewed_notification', notifications[0].sent_at || new Date().toISOString());
      } catch (_) {}
    }
  };

  const scrollGallery = (direction) => {
    if (galleryRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      galleryRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getIcon = (slug) => {
    if (slug.includes('bjf')) return <Shield size={26} className="text-primary" />;
    if (slug.includes('international')) return <Globe size={26} className="text-primary" />;
    return <Music size={26} className="text-primary" />;
  };

  return (
    <div className="main-content animate-fade-in pb-28" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.25rem' }}>
      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0 20px 0',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', lineHeight: '1.2' }}>
              JW Original Songs
            </div>
            <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '600' }}>
              Lyrics & Audio
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Notification Bell */}
          <button
            onClick={openNotifications}
            className="btn-icon relative"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              width: '38px',
              height: '38px',
            }}
            title="Announcements"
          >
            <Bell size={17} className="text-white" />
            {hasUnreadNotice && (
              <span
                style={{
                  position: 'absolute',
                  top: '7px',
                  right: '7px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ec4899',
                }}
              />
            )}
          </button>

          {/* Top Download Button */}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} />
            <span>Get on Google Play</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          alignItems: 'center',
          marginBottom: '56px',
        }}
      >
        {/* Hero Text */}
        <div>
          {/* Live Android Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              fontSize: '11px',
              fontWeight: '700',
              color: '#c4b5fd',
              marginBottom: '16px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
            Android App Available on Google Play
          </div>

          <h1
            style={{
              fontSize: 'clamp(26px, 4.5vw, 42px)',
              fontWeight: '900',
              lineHeight: '1.15',
              color: '#fff',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            Sing Along with Official{' '}
            <span style={{ color: '#a78bfa' }}>JW Original Songs</span> & Lyrics
          </h1>

          <p
            style={{
              fontSize: 'clamp(13px, 2vw, 16px)',
              lineHeight: '1.6',
              color: '#a1a1aa',
              marginBottom: '24px',
              maxWidth: '520px',
            }}
          >
            Stream high-quality spiritual music, read complete lyrics with adjustable fonts, and carry your favorite songs wherever you go. Available now as a native app for Android.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(139, 92, 246, 0.5)',
              }}
            >
              <Download size={16} />
              <span>Download for Android</span>
            </a>

            <a
              href="#web-player"
              className="btn btn-secondary"
              style={{
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: '600',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Music size={16} />
              <span>Listen in Browser</span>
            </a>
          </div>

          {/* Trust Highlights */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span style={{ fontSize: '12px', color: '#d4d4d8', fontWeight: '500' }}>
                Complete Official Lyrics
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span style={{ fontSize: '12px', color: '#d4d4d8', fontWeight: '500' }}>
                {totalSongsCount > 0 ? `${totalSongsCount}+ Songs Included` : 'Over 100+ Songs'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span style={{ fontSize: '12px', color: '#d4d4d8', fontWeight: '500' }}>
                Fast Audio Streaming
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span style={{ fontSize: '12px', color: '#d4d4d8', fontWeight: '500' }}>
                100% Free & No Ads
              </span>
            </div>
          </div>
        </div>

        {/* Hero Flagship Phone Showcase */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          {/* Subtle Glow Behind Phone */}
          <div
            style={{
              position: 'absolute',
              width: '280px',
              height: '380px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 70%)',
              filter: 'blur(35px)',
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              maxWidth: '280px',
              borderRadius: '28px',
              padding: '6px',
              background: 'linear-gradient(145deg, #27272a, #09090b)',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(139, 92, 246, 0.25)',
            }}
          >
            <img
              src="/screenshots/app-mockup-ios-screenshot-1-default-5.5-inch-1.png"
              alt="JW Original Songs App Screen"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '22px',
              }}
            />
          </div>
        </div>
      </section>

      {/* App Screenshots Showcase Carousel */}
      <section style={{ marginBottom: '56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
              Interface Preview
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0 }}>
              Screenshots from the Mobile App
            </h2>
          </div>

          {/* Carousel Arrows */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => scrollGallery('left')}
              className="btn-icon"
              style={{
                width: '36px',
                height: '36px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
              }}
              title="Previous Screenshot"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scrollGallery('right')}
              className="btn-icon"
              style={{
                width: '36px',
                height: '36px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
              }}
              title="Next Screenshot"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Screenshots Row */}
        <div
          ref={galleryRef}
          style={{
            display: 'flex',
            gap: '18px',
            overflowX: 'auto',
            paddingBottom: '16px',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'thin',
          }}
        >
          {SCREENSHOTS.map((item, idx) => (
            <div
              key={idx}
              style={{
                flex: '0 0 240px',
                scrollSnapAlign: 'start',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              <div
                style={{
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#09090b',
                  marginBottom: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <img
                  src={item.src}
                  alt={item.title}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#fff', margin: '0 0 4px 0' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: 0, lineHeight: '1.4' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* App Features Grid */}
      <section style={{ marginBottom: '56px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
            Thoughtfully Crafted
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 8px 0' }}>
            Built for Singing, Reading, and Personal Study
          </h2>
          <p style={{ fontSize: '13px', color: '#a1a1aa', maxWidth: '560px', margin: '0 auto' }}>
            Everything you need to enjoy spiritual music and follow along with accurate lyrics in one fast, reliable application.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="card"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '0 0 6px 0' }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, lineHeight: '1.5' }}>
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Web Player / Online Catalog Section */}
      <section id="web-player" style={{ marginBottom: '56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
              Online Catalog
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0 }}>
              Listen Right Here in Your Browser
            </h2>
            <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '4px 0 0 0' }}>
              Visiting on computer or iOS? Browse collections and stream audio directly on the web.
            </p>
          </div>

          <Link
            to="/search"
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Search size={14} />
            <span>Search All Songs</span>
          </Link>
        </div>

        {/* Quick Search Shortcut */}
        <Link
          to="/search"
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '14px',
            marginBottom: '16px',
            border: '1px solid var(--border-color)',
            textDecoration: 'none',
          }}
        >
          <Search size={18} color="#8b5cf6" />
          <span style={{ fontSize: '13px', color: '#a1a1aa', flex: 1 }}>
            Search songs by title or lyric phrase...
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#c4b5fd',
              fontWeight: '700',
            }}
          >
            Search
          </span>
        </Link>

        {/* Categories Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '14px' }} />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
            }}
          >
            {categories.map((cat) => {
              const count = categoryCounts[cat.id];
              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-color)',
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                  }}
                >
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '10px',
                        background: 'rgba(139, 92, 246, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getIcon(cat.slug)}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>
                      {count ? `${count} songs` : 'Browse collection'}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Google Play Download CTA Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(109, 40, 217, 0.15) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: '24px',
          padding: 'clamp(24px, 4vw, 40px)',
          textAlign: 'center',
          marginBottom: '40px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(139, 92, 246, 0.25)',
            border: '1px solid rgba(139, 92, 246, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <img
            src="/logo.png"
            alt="App Icon"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 30px)', fontWeight: '900', color: '#fff', margin: '0 0 10px 0' }}>
          Take the Music Everywhere on Android
        </h2>
        <p style={{ fontSize: '13px', color: '#d4d4d8', maxWidth: '520px', margin: '0 auto 22px auto', lineHeight: '1.5' }}>
          Install the free JW Original Songs Lyrics app directly from the Google Play Store for seamless listening and offline song lyrics.
        </p>

        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '700',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 25px -4px rgba(139, 92, 246, 0.6)',
          }}
        >
          <Download size={18} />
          <span>Get it on Google Play</span>
        </a>
      </section>

      {/* Footer */}
      <footer
        style={{
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          fontSize: '11px',
          color: '#71717a',
        }}
      >
        <div>
          <span>JW Original Songs Lyrics & Audio</span> · <span>100% Non-Commercial Spiritual Resource</span>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Link to="/search" style={{ color: '#a1a1aa' }}>Search</Link>
          <Link to="/favorites" style={{ color: '#a1a1aa' }}>Favorites</Link>
          <Link to="/settings" style={{ color: '#a1a1aa' }}>Settings</Link>
          <a href="/admin/login" style={{ color: '#a78bfa' }}>Admin Portal</a>
        </div>
      </footer>

      {/* In-App Notifications Modal */}
      {notificationModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setNotificationModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: 'var(--bg-card-solid)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-color">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-primary" />
                <h3 className="text-base font-bold text-white m-0">Announcements</h3>
              </div>
              <button
                onClick={() => setNotificationModalOpen(false)}
                className="text-secondary hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell size={36} className="text-secondary mx-auto mb-2 opacity-40" />
                <p className="text-xs text-secondary">No new announcements at this time.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="text-sm font-bold text-white leading-tight m-0">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-secondary flex-shrink-0">
                        {new Date(n.sent_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed m-0 whitespace-pre-line">
                      {n.message}
                    </p>
                    {n.link_url && (
                      <a
                        href={n.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary mt-2 font-medium hover:underline"
                      >
                        <span>Open link</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
