import React, { useState, useEffect } from 'react';

export const SplashScreen = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fading out after 1.8 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1800);

    // Completely remove splash screen after fade completes (2.2 seconds total)
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!showSplash) {
    return children;
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.4s ease-in-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '90vw',
          height: '90vw',
          maxWidth: '200px',
          maxHeight: '200px',
          overflow: 'hidden',
        }}>
          <picture style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <source srcSet="/loading.webp" type="image/webp" />
            <img
              src="/loading.gif"
              alt="Loading..."
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </picture>
        </div>
      </div>
      {children}
    </>
  );
};
