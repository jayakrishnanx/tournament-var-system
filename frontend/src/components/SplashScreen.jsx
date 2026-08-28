import React, { useState, useEffect } from 'react';

export const SplashScreen = ({ children }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <img
            src="/logo.png"
            alt="Tournament Logo"
            style={{
              maxHeight: '180px',
              maxWidth: '85vw',
              objectFit: 'contain',
              animation: 'pulseLogo 1.4s ease-in-out infinite'
            }}
          />
          <style>{`
            @keyframes pulseLogo {
              0% { transform: scale(0.95); opacity: 0.85; }
              50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 20px rgba(123, 37, 37, 0.7)); }
              100% { transform: scale(0.95); opacity: 0.85; }
            }
          `}</style>
        </div>
      )}
      {children}
    </>
  );
};
