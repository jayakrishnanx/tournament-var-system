import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { Volume2, VolumeX, Maximize2, Radio, RefreshCw, Eye } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const LiveStreamViewer = ({ matchId, homeTeam, awayTeam, homeScore, awayScore, clockTime, matchStatus }) => {
  const [isLive, setIsLive] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('');
  
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const activeStreamRef = useRef(null);
  const retryIntervalRef = useRef(null);

  useEffect(() => {
    // Listen to Firestore live stream document
    const unsub = onSnapshot(doc(db, 'live_streams', String(matchId)), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.is_active) {
          setIsLive(true);
          const broadcasterId = data.broadcaster_peer_id || `kallikalam_live_${matchId}_broadcaster`;
          initViewerConnection(broadcasterId);
        } else {
          setIsLive(false);
          setHasRemoteVideo(false);
          cleanupViewer();
        }
      } else {
        setIsLive(false);
        setHasRemoteVideo(false);
        cleanupViewer();
      }
    }, (err) => {
      console.warn('Firestore live_streams snapshot notice:', err);
      initViewerConnection(`kallikalam_live_${matchId}_broadcaster`);
    });

    return () => {
      unsub();
      cleanupViewer();
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [matchId]);

  const cleanupViewer = () => {
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) {}
      peerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    activeStreamRef.current = null;
    setIsConnecting(false);
  };

  const attachStreamToVideo = (stream) => {
    activeStreamRef.current = stream;
    setHasRemoteVideo(true);
    setIsLive(true);
    setIsConnecting(false);
    setConnectionStatus('');

    if (videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = isMuted;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Retry playback on user interaction
          video.muted = true;
          video.play().catch(e => console.warn('Playback error:', e));
        });
      }
    }
  };

  const initViewerConnection = (broadcasterId) => {
    if (isConnecting && peerRef.current) return;
    setIsConnecting(true);
    setConnectionStatus('Connecting to live camera broadcast...');

    try {
      const viewerId = `kallikalam_viewer_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      const peer = new Peer(viewerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      peerRef.current = peer;

      peer.on('open', (id) => {
        // 1. Join broadcaster via data channel so broadcaster calls us with real camera stream
        const conn = peer.connect(broadcasterId, { reliable: true });
        
        conn.on('open', () => {
          conn.send({ type: 'JOIN_STREAM', viewerId: id });
        });

        // 2. Listen for incoming call from Broadcaster with real stream
        peer.on('call', (call) => {
          call.answer(); // Answer incoming stream
          call.on('stream', (remoteStream) => {
            attachStreamToVideo(remoteStream);
          });
          call.on('close', () => {
            setHasRemoteVideo(false);
          });
        });

        // 3. Fallback: Also try calling broadcaster directly if broadcaster call takes longer than 2.5s
        setTimeout(() => {
          if (!activeStreamRef.current && peer && !peer.destroyed) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 2;
              canvas.height = 2;
              const dummyStream = canvas.captureStream ? canvas.captureStream(1) : null;
              if (dummyStream) {
                const directCall = peer.call(broadcasterId, dummyStream);
                if (directCall) {
                  directCall.on('stream', (remoteStream) => {
                    attachStreamToVideo(remoteStream);
                  });
                }
              }
            } catch (e) {}
          }
        }, 2500);
      });

      peer.on('error', (err) => {
        console.warn('Viewer Peer warning:', err);
        setIsConnecting(false);
      });

    } catch (e) {
      console.warn('Error starting viewer connection:', e);
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
      boxShadow: isLive ? '0 0 25px rgba(239, 68, 68, 0.25)' : 'none',
      backgroundColor: '#000000',
      position: 'relative'
    }}>
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
        {/* Real Video Element (rendered in DOM) */}
        <video
          ref={videoRef}
          playsInline={true}
          autoPlay={true}
          muted={isMuted}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: hasRemoteVideo ? 'block' : 'none'
          }}
        />

        {/* Offline / Connecting Standby Display */}
        {!hasRemoteVideo && (
          <div style={{
            textAlign: 'center',
            padding: '28px 16px',
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
              backgroundColor: isLive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.1)',
              border: `1px solid ${isLive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(100, 116, 139, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <Radio size={28} color={isLive ? '#ef4444' : '#64748b'} className={isLive ? 'animate-pulse' : ''} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', marginBottom: '6px' }}>
              {isLive ? '📡 Connecting to Live Field Camera...' : 'Live Match Stream Offline'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', margin: 0 }}>
              {isLive
                ? 'Field camera is online. Connecting live peer video feed...'
                : 'The video stream will automatically connect and play here once the field camera goes live!'}
            </p>
            {isConnecting && (
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={12} className="animate-spin" /> Connecting live peer network...
              </span>
            )}
          </div>
        )}

        {/* Top HUD Overlay (Always Visible) */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(11, 14, 20, 0.88)',
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

          <div style={{ fontSize: '0.85rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
            ⏱️ {clockTime || '00:00'}
          </div>
        </div>

        {/* Bottom Controls Overlay */}
        {hasRemoteVideo && (
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
                backgroundColor: 'rgba(11, 14, 20, 0.88)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '6px 12px',
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
                backgroundColor: 'rgba(11, 14, 20, 0.88)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '6px 12px',
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

export default LiveStreamViewer;
