import React, { useState, useEffect } from 'react';
import { Radio, Volume2, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const LiveStreamViewer = ({ matchId, homeTeam, awayTeam, homeScore, awayScore, clockTime, matchStatus }) => {
  const [isLive, setIsLive] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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

  const cycleRotation = () => {
    setRotationAngle(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev;
      if (next) {
        try {
          if (window.screen?.orientation?.lock) {
            window.screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (e) {}
      }
      return next;
    });
  };

  // FULLSCREEN LANDSCAPE IN-PAGE THEATER MODE FOR PHONE WATCHERS
  if (isLive && isFullscreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        zIndex: 9999999,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Floating Top Scoreboard & HUD */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '14px',
          right: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 40,
          pointerEvents: 'none'
        }}>
          {/* Live Score Overlay */}
          <div style={{
            backgroundColor: 'rgba(13, 17, 23, 0.88)',
            padding: '5px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            pointerEvents: 'auto'
          }}>
            <span style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: '900',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              ● LIVE
            </span>
            <span style={{ fontSize: '0.92rem', fontWeight: '900', color: '#f8fafc' }}>
              {homeTeam || 'Home'} <span style={{ color: '#ef4444', margin: '0 4px' }}>{homeScore} : {awayScore}</span> {awayTeam || 'Away'}
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
              ⏱️ {clockTime || '00:00'}
            </span>
          </div>

          {/* Action Controls */}
          <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
            <button
              onClick={cycleRotation}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Rotate video"
            >
              <RefreshCw size={13} /> Rotate ({rotationAngle}°)
            </button>

            <button
              onClick={toggleFullscreen}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Minimize2 size={13} /> Exit Fullscreen
            </button>
          </div>
        </div>

        {/* Fullscreen Video Viewport */}
        <div style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}>
          <iframe
            key={`viewer-fs-${rotationAngle}`}
            src={viewerUrl}
            title="Live Match Stream Fullscreen"
            allow="autoplay; fullscreen; picture-in-picture"
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
    <div className="glass-panel" style={{
      padding: '0px',
      overflow: 'hidden',
      marginBottom: '20px',
      borderRadius: '14px',
      border: isLive ? '2px solid #ef4444' : '1px solid #334155',
      boxShadow: isLive ? '0 0 25px rgba(239, 68, 68, 0.25)' : 'none',
      backgroundColor: '#000000',
      position: 'relative'
    }}>
      {/* Top HUD Overlay (Always Visible on Top of Video) */}
      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0d1117',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            backgroundColor: isLive ? '#ef4444' : '#64748b',
            color: '#ffffff',
            fontSize: '0.7rem',
            fontWeight: '900',
            padding: '2px 8px',
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isLive ? '● LIVE FIELD BROADCAST' : 'STANDBY'}
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#f8fafc' }}>
            {homeTeam || 'Home'} <span style={{ color: '#ef4444', margin: '0 4px', fontWeight: '900' }}>{homeScore} : {awayScore}</span> {awayTeam || 'Away'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isLive && (
            <button
              onClick={cycleRotation}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Click if video is sideways"
            >
              <RefreshCw size={12} /> Rotate ({rotationAngle}°)
            </button>
          )}

          <div style={{ fontSize: '0.9rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
            ⏱️ {clockTime || '00:00'}
          </div>

          {/* In-Page Fullscreen Landscape Theater Button */}
          {isLive && (
            <button
              onClick={toggleFullscreen}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
              }}
              title="Watch in full-screen landscape theater mode"
            >
              <Maximize2 size={13} /> Fullscreen Landscape
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '56.25vw',
        maxHeight: '480px',
        minHeight: '240px',
        backgroundColor: '#070a10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {isLive ? (
          <iframe
            key={`viewer-${rotationAngle}`}
            src={viewerUrl}
            title="Live Match Stream"
            allow="autoplay; fullscreen; picture-in-picture"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
          />
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
