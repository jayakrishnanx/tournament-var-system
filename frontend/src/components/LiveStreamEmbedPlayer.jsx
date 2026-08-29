import React from 'react';
import { Radio, ExternalLink } from 'lucide-react';

export const parseEmbedUrl = (url) => {
  if (!url) return null;
  const clean = url.trim();

  // 1. YouTube Live / Watch URL formats
  // Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live/ID, youtube.com/embed/ID
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = clean.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&rel=0&modestbranding=1`,
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
            {isLive ? '● LIVE BROADCAST' : 'STANDBY'}
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#f8fafc' }}>
            {homeTeam || 'Home'} <span style={{ color: '#ef4444', margin: '0 4px', fontWeight: '900' }}>{homeScore} : {awayScore}</span> {awayTeam || 'Away'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
            ⏱️ {clockTime || '00:00'}
          </div>
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
            src={parsed.embedUrl}
            title="Live Match Broadcast"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
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
