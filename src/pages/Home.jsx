import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Music, Shield, Globe } from 'lucide-react';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      // In a real app we'd fetch from supabase:
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
        
      if (!error && data) {
        setCategories(data);
      } else {
        // Fallback for demo if supabase isn't connected yet
        setCategories([
          { id: '1', name: 'Original Songs', slug: 'original-songs' },
          { id: '2', name: "Become Jehovah's Friend — Original Songs", slug: 'bjf-original' },
          { id: '3', name: "Become Jehovah's Friend — Sing With Us", slug: 'bjf-sing' },
          { id: '4', name: 'International Music', slug: 'international' }
        ]);
      }
      setLoading(false);
    }
    
    fetchCategories();
  }, []);

  const getIcon = (slug) => {
    if (slug.includes('bjf')) return <Shield size={32} className="text-primary" />;
    if (slug.includes('international')) return <Globe size={32} className="text-primary" />;
    return <Music size={32} className="text-primary" />;
  };

  return (
    <div className="main-content animate-fade-in">
      <div className="topbar mb-6" style={{ margin: '-1rem -1rem 1.5rem -1rem', padding: '1.5rem 1rem' }}>
        <h1 className="text-2xl font-bold">Music & Songs</h1>
      </div>
      
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-lg"></div>)}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {categories.map(cat => (
            <Link key={cat.id} to={`/category/${cat.slug}`} className="card flex items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-full">
                {getIcon(cat.slug)}
              </div>
              <div>
                <h2 className="text-lg font-bold">{cat.name}</h2>
                <p className="text-sm text-secondary">Browse songs in this collection</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
