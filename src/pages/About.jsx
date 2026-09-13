import React from 'react';

export default function About() {
  return (
    <div className="main-content animate-fade-in">
      <div className="topbar mb-6" style={{ margin: '-1rem -1rem 1.5rem -1rem', padding: '1.5rem 1rem' }}>
        <h1 className="text-2xl font-bold">About App</h1>
      </div>

      <div className="card text-center py-10">
        <div className="bg-primary p-4 rounded-full inline-block mb-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">JW Original Songs</h2>
        <p className="text-secondary mb-6">Lyrics & Audio</p>
        
        <div className="text-sm text-secondary text-left border-t border-gray-700 pt-6">
          <p className="mb-4">
            This app allows you to easily browse, read, and listen to the Original Songs.
          </p>
          <p className="mb-4">
            Features include offline lyrics caching, so you can read the lyrics even when you don't have an internet connection.
          </p>
          <p>
            Version 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
