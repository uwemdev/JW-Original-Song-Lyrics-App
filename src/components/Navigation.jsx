import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Heart, Settings, Info } from 'lucide-react';

export default function Navigation() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--bg-card)',
      borderTop: '1px solid var(--bg-hover)',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '0.75rem',
      zIndex: 50,
      boxShadow: '0 -4px 10px rgba(0,0,0,0.1)'
    }}>
      <NavItem to="/" icon={<Home size={24} />} label="Home" />
      <NavItem to="/search" icon={<Search size={24} />} label="Search" />
      <NavItem to="/favorites" icon={<Heart size={24} />} label="Favorites" />
      <NavItem to="/settings" icon={<Settings size={24} />} label="Settings" />
    </nav>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to} 
      style={({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
        fontSize: '0.75rem',
        gap: '0.25rem',
        textDecoration: 'none',
        transition: 'color 0.2s'
      })}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
