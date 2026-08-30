import React, { useState, useEffect, useRef } from 'react';
import { Radio, ExternalLink, Maximize2, Minimize2, Smartphone } from 'lucide-react';

export const parseEmbedUrl = (url) => {
  if (!url) return null;
  const clean = url.trim();

  // 1. YouTube Live / Watch URL formats
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = clean.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`,
      originalUrl: clean
    };
  }

  // 2. Twitch Stream URL format (twitch.tv/channel)
  const twitchRegex = /twitch\.tv\/([a-zA-Z0-9_]+)/;
  const twitchMatch = clean.match(twitchRegex);
  if (twitchMatch && twitchMatch[1]) {
    const parentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return {
      type: 'twitch',
      embedUrl: `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${parentHost}&autoplay=true&muted=false`,
      originalUrl: clean
    };
  }

  // 3. Direct iFrame embed URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return {
      type: 'generic',
      embedUrl: clean,
      originalUrl: clean
    };
  }

  return null;
};

export const LiveStreamEmbedPlayer = ({ streamUrl, homeTeam, awayTeam, homeScore, awayScore, clockTime, matchStatus }) => {
  const parsed = parseEmbedUrl(streamUrl);
  const isLive = Boolean(parsed && parsed.embedUrl);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forceLandscapeCSS, setForceLandscapeCSS] = useState(false);
  const containerRef = useRef(null);

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

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        const elem = containerRef.current || document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
      } catch (e) {
        console.warn('Native fullscreen request error:', e);
      }

      try {
        if (window.screen?.orientation?.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch (e) {
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
        }
      } catch (e) {}

      try {
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (e) {}
    }
  };

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
        {/* Floating Header */}
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
            <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.68rem', fontWeight: '900', padding: '3px 7px', borderRadius: '4px' }}>
              ● LIVE
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#f8fafc' }}>
              {homeTeam || 'Home'} <span style={{ color: '#ef4444', margin: '0 5px' }}>{homeScore} : {awayScore}</span> {awayTeam || 'Away'}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
              ⏱️ {clockTime || '00:00'}
            </span>
          </div>

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
            >
              <Smartphone size={14} /> {forceLandscapeCSS ? 'Portrait View' : 'Force Landscape'}
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

        {/* Video Viewport */}
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
            src={parsed.embedUrl}
            title="Live Match Broadcast Fullscreen"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen={true}
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
          />
        </div>
      </div>
    );
  }

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
      {/* Top HUD Overlay */}
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
            {isLive ? '● LIVE BROADCAST' : 'STANDBY'}
          </span>
          <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc' }}>
            {homeTeam || 'Home'} <span style={{ color: '#ef4444', margin: '0 4px', fontWeight: '900' }}>{homeScore} : {awayScore}</span> {awayTeam || 'Away'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
            ⏱️ {clockTime || '00:00'}
          </div>

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
            >
              <Maximize2 size={14} /> Fullscreen
            </button>
          )}

          {parsed?.originalUrl && (
            <a
              href={parsed.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                textDecoration: 'none'
              }}
              title="Open stream in new tab"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Video Stream Container */}
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
              src={parsed.embedUrl}
              title="Live Match Broadcast"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen={true}
              webkitallowfullscreen="true"
              mozallowfullscreen="true"
            />
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
              {matchStatus === 'LIVE' ? 'Match is Live — Stream Standby' : 'Live Match Stream Offline'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
              The YouTube / Twitch live stream will play automatically right here once the match broadcaster starts the stream!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreamEmbedPlayer;
