'use client';

import { useState, useEffect } from 'react';

export default function SplashVideo() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if we've already shown the splash this session
    const hasShown = sessionStorage.getItem('prepbite-splash-shown');
    if (hasShown) {
      setShowSplash(false);
      return;
    }

    // Set timeout as a fallback in case video fails to load or end
    const fallbackTimer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('prepbite-splash-shown', 'true');
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  if (!showSplash) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0A0A0A',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <video 
        autoPlay 
        muted 
        playsInline 
        onEnded={() => {
          setShowSplash(false);
          sessionStorage.setItem('prepbite-splash-shown', 'true');
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src="/PBAnim.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
