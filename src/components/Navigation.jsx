import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Heart, Settings } from 'lucide-react';

export default function Navigation() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg-card-solid)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0.4rem 0.5rem',
        zIndex: 50,
        boxShadow: '0 -4px 15px rgba(0,0,0,0.3)',
      }}
    >
      <NavItem to="/" icon={<Home size={20} />} label="Home" />
      <NavItem to="/search" icon={<Search size={20} />} label="Search" />
      <NavItem to="/favorites" icon={<Heart size={20} />} label="Favorites" />
      <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
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
        justifyContent: 'center',
        minWidth: '60px',
        minHeight: '46px',
        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
        fontSize: '0.72rem',
        fontWeight: isActive ? '700' : '500',
        gap: '0.2rem',
        textDecoration: 'none',
        transition: 'color 0.15s ease',
      })}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
