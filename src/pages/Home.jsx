import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Music, Shield, Globe, Bell, X, ExternalLink, Search, Sparkles } from 'lucide-react';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // In-app notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setCategories(data);
      } else {
        setCategories([
          { id: '1', name: 'Original Songs', slug: 'original-songs' },
          { id: '2', name: "Become Jehovah's Friend — Original Songs", slug: 'bjf-original' },
          { id: '3', name: "Become Jehovah's Friend — Sing With Us", slug: 'bjf-sing' },
          { id: '4', name: 'International Music', slug: 'international' },
        ]);
      }
      setLoading(false);
    }

    async function fetchNotifications() {
      try {
        const { data } = await supabase
          .from('push_notifications')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(10);

        if (data && data.length > 0) {
          setNotifications(data);
          const lastViewed = localStorage.getItem('jw_last_viewed_notification');
          const latestSent = data[0]?.sent_at;
          if (!lastViewed || new Date(latestSent) > new Date(lastViewed)) {
            setHasUnreadNotice(true);
          }
        }
      } catch (_) {}
    }

    fetchCategories();
    fetchNotifications();
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

  const getIcon = (slug) => {
    if (slug.includes('bjf')) return <Shield size={28} className="text-primary" />;
    if (slug.includes('international')) return <Globe size={28} className="text-primary" />;
    return <Music size={28} className="text-primary" />;
  };

  return (
    <div className="main-content animate-fade-in pb-24">
      {/* Top Brand Bar with Logo & Notifications Bell */}
      <div
        className="topbar mb-5 flex justify-between items-center"
        style={{ margin: '-1rem -1rem 1.25rem -1rem', padding: '1.25rem 1rem' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
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
            <h1 className="text-xl font-bold text-white leading-tight m-0">
              JW Original Songs
            </h1>
            <span className="text-xs text-secondary">Lyrics & Audio</span>
          </div>
        </div>

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
          title="Announcements & Notifications"
        >
          <Bell size={18} className="text-white" />
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
      </div>

      {/* Quick Search Shortcut Banner */}
      <Link
        to="/search"
        className="card flex items-center gap-3 p-3.5 mb-5 hover:border-primary/50 transition-all cursor-pointer"
        style={{ padding: '0.875rem 1rem' }}
      >
        <Search size={18} className="text-primary flex-shrink-0" />
        <span className="text-sm text-secondary flex-1">
          Search all songs, titles, or lyrics...
        </span>
        <span
          className="text-xs px-2.5 py-1 rounded-md font-semibold"
          style={{
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            color: 'var(--primary-color)',
          }}
        >
          Search
        </span>
      </Link>

      {/* Categories Heading */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-white m-0">Music Categories</h2>
        <span className="text-xs text-secondary">{categories.length} Collections</span>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="card flex items-center gap-4 p-4 rounded-2xl hover:border-primary/50 transition-all"
              style={{ padding: '1rem 1.25rem' }}
            >
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  className="rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                    color: 'var(--primary-color)',
                  }}
                >
                  {getIcon(cat.slug)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white truncate m-0 leading-tight">
                  {cat.name}
                </h3>
                <p className="text-xs text-secondary mt-1 truncate m-0">
                  Browse songs in this collection
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

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
