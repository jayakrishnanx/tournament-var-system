import React, { useState, useEffect } from 'react';
import { Radio, Volume2, Maximize2, ExternalLink } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const LiveStreamViewer = ({ matchId, homeTeam, awayTeam, homeScore, awayScore, clockTime, matchStatus }) => {
  const [isLive, setIsLive] = useState(false);
  const streamRoomId = `kallikalam_match_${matchId}`;
  const viewerUrl = `https://vdo.ninja/?view=${streamRoomId}&autoplay=1&cleanoutput=1&transparent=1`;

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
            ⏱️ {clockTime || '00:00'}
          </div>
          {isLive && (
            <a
              href={viewerUrl}
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
              title="Open stream in fullscreen window"
            >
              <ExternalLink size={14} />
            </a>
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
