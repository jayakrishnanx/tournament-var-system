import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { Volume2, VolumeX, Maximize2, Radio, Play, AlertCircle } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const LiveStreamViewer = ({ matchId, homeTeam, awayTeam, homeScore, awayScore, clockTime, matchStatus }) => {
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);

  useEffect(() => {
    // 1. Listen to Firestore for stream active status
    const unsub = onSnapshot(doc(db, 'live_streams', String(matchId)), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.is_active) {
          setIsLive(true);
          connectToLiveStream(data.broadcaster_peer_id || `kallikalam_live_${matchId}_broadcaster`);
        } else {
          setIsLive(false);
          cleanupCall();
        }
      } else {
        setIsLive(false);
        cleanupCall();
      }
    }, () => {
      // Fallback: try connecting directly
      connectToLiveStream(`kallikalam_live_${matchId}_broadcaster`);
    });

    return () => {
      unsub();
      cleanupCall();
    };
  }, [matchId]);

  const cleanupCall = () => {
    if (callRef.current) {
      try { callRef.current.close(); } catch (e) {}
      callRef.current = null;
    }
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) {}
      peerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsConnecting(false);
  };

  const connectToLiveStream = (broadcasterId) => {
    if (isConnecting || callRef.current) return;
    setIsConnecting(true);
    setErrorMsg('');

    try {
      const viewerId = `viewer_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      const peer = new Peer(viewerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      peerRef.current = peer;

      peer.on('open', () => {
        // Call broadcaster with empty media stream or dummy canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const dummyStream = canvas.captureStream(1);

        const call = peer.call(broadcasterId, dummyStream);
        callRef.current = call;

        call.on('stream', (remoteStream) => {
          setIsLive(true);
          setIsConnecting(false);
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.play().catch(() => {});
          }
        });

        call.on('close', () => {
          setIsLive(false);
          setIsConnecting(false);
        });

        call.on('error', (err) => {
          console.warn('Viewer call error:', err);
          setIsConnecting(false);
        });
      });

      peer.on('error', (err) => {
        console.warn('Viewer peer error:', err);
        setIsConnecting(false);
      });

    } catch (e) {
      console.warn('Error initiating stream connection:', e);
      setIsConnecting(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '0px',
      overflow: 'hidden',
      marginBottom: '20px',
      borderRadius: '12px',
      border: isLive ? '2px solid #ef4444' : '1px solid #334155',
      boxShadow: isLive ? '0 0 25px rgba(239, 68, 68, 0.2)' : 'none',
      backgroundColor: '#000000',
      position: 'relative'
    }}>
      {/* Video Stream / Standby Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '56.25vw',
        maxHeight: '480px',
        minHeight: '220px',
        backgroundColor: '#070a10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {isLive ? (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted={isMuted}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', marginBottom: '6px' }}>
              {matchStatus === 'LIVE' ? 'Match is Live — Camera Standby' : 'Live Match Stream Offline'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '380px' }}>
              The video stream will automatically connect and play here once the field camera goes live!
            </p>
          </div>
        )}

        {/* Top HUD Overlay (Always Visible on Top of Video) */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(11, 14, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '6px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: 'white',
          zIndex: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              {isLive ? '● LIVE' : 'STANDBY'}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>
              {homeTeam || 'Home'} <span style={{ color: '#ef4444', margin: '0 4px', fontWeight: '900' }}>{homeScore} : {awayScore}</span> {awayTeam || 'Away'}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
            ⏱️ {clockTime || '00:00'}
          </div>
        </div>

        {/* Bottom Stream Player Controls */}
        {isLive && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            display: 'flex',
            gap: '8px',
            zIndex: 20
          }}>
            <button
              onClick={toggleMute}
              style={{
                backgroundColor: 'rgba(11, 14, 20, 0.85)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />} {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={toggleFullscreen}
              style={{
                backgroundColor: 'rgba(11, 14, 20, 0.85)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}
            >
              <Maximize2 size={14} /> Fullscreen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
