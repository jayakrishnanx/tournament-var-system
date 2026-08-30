import React, { useState, useEffect, useRef } from 'react';
import { Radio, Volume2, Maximize2, Minimize2, RefreshCw, Smartphone } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const LiveStreamViewer = ({ matchId, homeTeam, awayTeam, homeScore, awayScore, clockTime, matchStatus }) => {
  const [isLive, setIsLive] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forceLandscapeCSS, setForceLandscapeCSS] = useState(false);
  const containerRef = useRef(null);
  
  const streamRoomId = `kallikalam_match_${matchId}`;
  const rotationParam = rotationAngle > 0 ? `&rotate=${rotationAngle}` : '';
  // Ultra-Low Latency (<100ms), Instant Connect & Clean Widescreen Stream
  const viewerUrl = `https://vdo.ninja/?view=${streamRoomId}&autoplay=1&cleanoutput=1&transparent=1&aspect=16:9&scale=100&zerolatency=1&buffer=0&fast&noerror${rotationParam}`;

  useEffect(() => {
    // Listen to Firestore live stream document
    const unsub = onSnapshot(doc(db, 'live_streams', String(matchId)), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsLive(Boolean(data.is_active));
      } else {
        setIsLive(false);
      }
    }, () => {
      setIsLive(true);
    });

    return () => unsub();
  }, [matchId]);

  // Sync fullscreen exit when user uses browser back or escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
        setForceLandscapeCSS(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  const cycleRotation = () => {
    setRotationAngle(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      // Attempt HTML5 Fullscreen API on mobile & desktop
      try {
        const elem = containerRef.current || document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } catch (e) {
        console.warn('Native fullscreen request notice:', e);
      }

      // Attempt screen orientation lock to landscape
      try {
        if (window.screen?.orientation?.lock) {
          await window.screen.orientation.lock('landscape');
        } else if (window.screen?.lockOrientation) {
          window.screen.lockOrientation('landscape');
        }
      } catch (e) {
        // Fallback: If phone is in portrait and cannot lock, allow CSS landscape toggle
        if (window.innerHeight > window.innerWidth) {
          setForceLandscapeCSS(true);
        }
      }
    } else {
      setIsFullscreen(false);
      setForceLandscapeCSS(false);
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      } catch (e) {}

      try {
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (e) {}
    }
  };

  // FULLSCREEN LANDSCAPE MODE FOR PHONE & DESKTOP WATCHERS
  if (isLive && isFullscreen) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100dvh',
          backgroundColor: '#000000',
          zIndex: 9999999,
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          touchAction: 'none'
        }}
      >
        {/* Floating Top Scoreboard & HUD */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 50,
          pointerEvents: 'none'
        }}>
          {/* Live Score Overlay */}
          <div style={{
            backgroundColor: 'rgba(13, 17, 23, 0.92)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
            pointerEvents: 'auto'
          }}>
            <span style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: '900',
              padding: '3px 7px',
              borderRadius: '4px',
              letterSpacing: '0.05em'
            }}>
              ● LIVE
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#f8fafc' }}>
              {homeTeam || 'Home'} <span style={{ color: '#ef4444', margin: '0 5px' }}>{homeScore} : {awayScore}</span> {awayTeam || 'Away'}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
              ⏱️ {clockTime || '00:00'}
            </span>
          </div>

          {/* Action Controls */}
          <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
            <button
              onClick={() => setForceLandscapeCSS(prev => !prev)}
              style={{
                backgroundColor: forceLandscapeCSS ? '#2563eb' : 'rgba(0, 0, 0, 0.85)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Toggle forced landscape mode for portrait phones"
            >
              <Smartphone size={14} /> {forceLandscapeCSS ? 'Portrait View' : 'Force Landscape'}
            </button>

            <button
              onClick={cycleRotation}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Rotate video"
            >
              <RefreshCw size={14} /> Rotate ({rotationAngle}°)
            </button>

            <button
              onClick={toggleFullscreen}
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.5)'
              }}
            >
              <Minimize2 size={14} /> Exit
            </button>
          </div>
        </div>

        {/* Fullscreen Video Viewport with auto-fit container */}
        <div style={{
          width: forceLandscapeCSS ? '100vh' : '100vw',
          height: forceLandscapeCSS ? '100vw' : '100dvh',
          backgroundColor: '#000000',
          position: forceLandscapeCSS ? 'absolute' : 'relative',
          top: forceLandscapeCSS ? '50%' : 0,
          left: forceLandscapeCSS ? '50%' : 0,
          transform: forceLandscapeCSS ? 'translate(-50%, -50%) rotate(90deg)' : 'none',
          transformOrigin: 'center center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <iframe
            key={`viewer-fs-${rotationAngle}`}
            src={viewerUrl}
            title="Live Match Stream Fullscreen"
            allow="camera; microphone; display-capture; autoplay; fullscreen; picture-in-picture; accelerometer; gyroscope"
            allowFullScreen={true}
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
          />
        </div>
      </div>
    );
  }

  // STANDARD IN-PAGE EMBED VIEW
  return (
    <div
      ref={containerRef}
      className="glass-panel"
      style={{
        padding: '0px',
        overflow: 'hidden',
        marginBottom: '20px',
        borderRadius: '14px',
        border: isLive ? '2px solid #ef4444' : '1px solid #334155',
        boxShadow: isLive ? '0 0 25px rgba(239, 68, 68, 0.25)' : 'none',
        backgroundColor: '#000000',
        position: 'relative'
      }}
    >
      {/* Top HUD Overlay (Always Visible on Top of Video) */}
      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0d1117',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        zIndex: 20,
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            backgroundColor: isLive ? '#ef4444' : '#64748b',
            color: '#ffffff',
            fontSize: '0.72rem',
            fontWeight: '900',
            padding: '3px 8px',
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isLive ? '● LIVE FIELD BROADCAST' : 'STANDBY'}
          </span>
          <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc' }}>
            {homeTeam || 'Home'} <span style={{ color: '#ef4444', margin: '0 4px', fontWeight: '900' }}>{homeScore} : {awayScore}</span> {awayTeam || 'Away'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isLive && (
            <button
              onClick={cycleRotation}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Click if video is sideways"
            >
              <RefreshCw size={13} /> Rotate ({rotationAngle}°)
            </button>
          )}

          <div style={{ fontSize: '0.92rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
            ⏱️ {clockTime || '00:00'}
          </div>

          {/* Fullscreen Button */}
          {isLive && (
            <button
              onClick={toggleFullscreen}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.5)'
              }}
              title="Tap to watch in full-screen phone mode"
            >
              <Maximize2 size={14} /> Fullscreen
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '56.25vw',
        maxHeight: '520px',
        minHeight: '260px',
        backgroundColor: '#070a10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {isLive ? (
          <>
            <iframe
              key={`viewer-${rotationAngle}`}
              src={viewerUrl}
              title="Live Match Stream"
              allow="camera; microphone; display-capture; autoplay; fullscreen; picture-in-picture; accelerometer; gyroscope"
              allowFullScreen={true}
              webkitallowfullscreen="true"
              mozallowfullscreen="true"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
            />
            {/* Quick Floating Tap-to-Fullscreen button for mobile viewers */}
            <button
              onClick={toggleFullscreen}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(4px)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 30,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)'
              }}
            >
              <Maximize2 size={14} color="#38bdf8" /> Fullscreen
            </button>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <Radio size={28} color="#ef4444" className={matchStatus === 'LIVE' ? 'animate-pulse' : ''} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#f8fafc', marginBottom: '6px' }}>
              Live Match Stream Offline
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
              The live video and sound stream will automatically appear right here once the field camera goes live!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreamViewer;
