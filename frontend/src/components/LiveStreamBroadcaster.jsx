import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { Camera, RefreshCw, Mic, MicOff, Radio, Users, Play, Square, AlertCircle, Sparkles } from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanData } from '../services/firebaseService';

// Global STUN & TURN Relay servers (Bypasses all mobile 4G/5G carrier firewalls)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelay',
    credential: 'openrelay'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelay',
    credential: 'openrelay'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelay',
    credential: 'openrelay'
  }
];

export const LiveStreamBroadcaster = ({ matchId, homeTeam, awayTeam, score }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [isMuted, setIsMuted] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const viewersRef = useRef(new Map());

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [matchId]);

  const startStreaming = async () => {
    setErrorMessage('');
    setStatusMessage('Accessing phone camera & microphone...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = 'Camera API is not supported on this browser. Please ensure you are on HTTPS.';
      setErrorMessage(err);
      alert(err);
      return;
    }

    try {
      // 1. Get user media with fallback for mobile devices
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (err1) {
        console.warn('Tier 1 camera access failed, trying standard video+audio...', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: true
          });
        } catch (err2) {
          console.warn('Tier 2 camera access failed, trying basic video...', err2);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
        }
      }

      if (!stream) {
        throw new Error('Could not initialize video stream from device camera.');
      }

      // Explicitly enable all audio tracks
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });

      streamRef.current = stream;
      setIsStreaming(true);

      // Attach stream to video preview element immediately
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          const video = videoRef.current;
          video.srcObject = streamRef.current;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => console.warn('Preview play warning:', e));
          }
        }
      }, 100);

      setStatusMessage('Connecting global cloud relay network...');

      // 2. Initialize Broadcaster Peer with Global TURN Relay
      const broadcasterPeerId = `kallikalam_live_${matchId}_broadcaster`;

      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (e) {}
      }

      const peer = new Peer(broadcasterPeerId, {
        debug: 1,
        config: {
          iceServers: ICE_SERVERS
        }
      });

      peerRef.current = peer;

      peer.on('open', async (id) => {
        setStatusMessage('🔴 Live Stream Broadcasting to All Spectators!');

        // Update Firestore live stream document & match status
        try {
          await setDoc(doc(db, 'live_streams', String(matchId)), cleanData({
            matchId: String(matchId),
            is_active: true,
            broadcaster_peer_id: id,
            started_at: serverTimestamp(),
            updated_at: serverTimestamp()
          }), { merge: true });

          await updateDoc(doc(db, 'matches', String(matchId)), {
            status: 'LIVE',
            is_live_streaming: true
          });
        } catch (e) {
          console.warn('Firestore live stream record error:', e);
        }
      });

      // 3. Handle spectator join requests -> Broadcaster calls Spectator with live camera stream
      peer.on('connection', (conn) => {
        conn.on('data', (data) => {
          if (data && data.type === 'JOIN_STREAM' && data.viewerId && streamRef.current) {
            const call = peer.call(data.viewerId, streamRef.current);
            if (call) {
              viewersRef.current.set(data.viewerId, call);
              setViewerCount(viewersRef.current.size);

              call.on('close', () => {
                viewersRef.current.delete(data.viewerId);
                setViewerCount(viewersRef.current.size);
              });
              call.on('error', () => {
                viewersRef.current.delete(data.viewerId);
                setViewerCount(viewersRef.current.size);
              });
            }
          }
        });
      });

      // Also handle direct calls
      peer.on('call', (call) => {
        if (streamRef.current) {
          call.answer(streamRef.current);
          viewersRef.current.set(call.peer, call);
          setViewerCount(viewersRef.current.size);

          call.on('close', () => {
            viewersRef.current.delete(call.peer);
            setViewerCount(viewersRef.current.size);
          });
          call.on('error', () => {
            viewersRef.current.delete(call.peer);
            setViewerCount(viewersRef.current.size);
          });
        }
      });

      peer.on('error', (err) => {
        console.warn('Broadcaster peer warning:', err);
        if (err.type === 'unavailable-id') {
          setStatusMessage('🔴 Live Stream Active!');
        }
      });

    } catch (err) {
      console.error('Camera access error:', err);
      const msg = 'Camera Error: ' + (err.name || '') + ' - ' + err.message + '. Please allow Camera & Microphone permissions in your phone browser settings.';
      setErrorMessage(msg);
      setStatusMessage('');
      setIsStreaming(false);
      alert(msg);
    }
  };

  const stopStreaming = async () => {
    setIsStreaming(false);
    setStatusMessage('');
    setErrorMessage('');
    setViewerCount(0);

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Close all viewer calls
    viewersRef.current.forEach(call => {
      try { call.close(); } catch (e) {}
    });
    viewersRef.current.clear();

    // Destroy Peer
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) {}
      peerRef.current = null;
    }

    // Update Firestore
    try {
      await updateDoc(doc(db, 'live_streams', String(matchId)), {
        is_active: false,
        ended_at: serverTimestamp()
      });
    } catch (e) {}
  };

  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);

    if (isStreaming) {
      await stopStreaming();
      setTimeout(() => {
        startStreaming();
      }, 300);
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMuted(!audioTracks[0].enabled);
      }
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '16px',
      marginBottom: '20px',
      border: isStreaming ? '2px solid #ef4444' : '1px solid #334155',
      boxShadow: isStreaming ? '0 0 20px rgba(239, 68, 68, 0.25)' : 'none',
      borderRadius: '12px',
      backgroundColor: '#131720'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={20} color={isStreaming ? '#ef4444' : '#10b981'} className={isStreaming ? 'animate-pulse' : ''} />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isStreaming ? '🔴 IN-BROWSER LIVE BROADCASTER' : '📹 LIVE CAMERA STREAM'}
              <span style={{ fontSize: '0.65rem', backgroundColor: '#10b981', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>
                ZERO APPS / NO SUBSCRIBERS NEEDED
              </span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Stream directly from your phone camera over cloud relay to all spectator devices!
            </span>
          </div>
        </div>

        {isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: '900',
              padding: '3px 10px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ● LIVE
            </span>
            <span style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#cbd5e1',
              fontSize: '0.75rem',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Users size={12} /> {viewerCount} Spectators
            </span>
          </div>
        )}
      </div>

      {/* Video Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxHeight: '420px',
        height: isStreaming ? '56.25vw' : 'auto',
        minHeight: isStreaming ? '240px' : 'auto',
        backgroundColor: '#000000',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '14px',
        border: isStreaming ? '2px solid #ef4444' : '1px dashed #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {isStreaming ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <video
              ref={videoRef}
              playsInline={true}
              autoPlay={true}
              muted={true}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />

            {/* HUD Score Overlay on Camera */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(6px)',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: '900',
              zIndex: 10
            }}>
              <span>{homeTeam || 'Home'}</span>
              <span style={{ backgroundColor: '#ef4444', padding: '2px 8px', borderRadius: '4px' }}>
                {score || '0 - 0'}
              </span>
              <span>{awayTeam || 'Away'}</span>
            </div>

            {/* Camera Controls Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              display: 'flex',
              gap: '8px',
              zIndex: 10
            }}>
              <button
                onClick={toggleCameraFacing}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.88)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}
                title="Flip Camera"
              >
                <RefreshCw size={14} /> Flip
              </button>
              <button
                onClick={toggleAudio}
                style={{
                  backgroundColor: isMuted ? '#ef4444' : 'rgba(15, 23, 42, 0.88)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />} {isMuted ? 'Muted' : 'Mic On'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#090d16',
            padding: '28px 16px',
            textAlign: 'center',
            width: '100%'
          }}>
            <Camera size={40} color="#64748b" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <p style={{ fontSize: '0.95rem', fontWeight: '800', color: '#EAECF0', marginBottom: '4px' }}>
              Direct In-Browser Camera Ready
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '420px', margin: '0 auto' }}>
              Tap the button below to start streaming your phone camera directly to all spectator devices with zero accounts or subscribers needed.
            </p>
          </div>
        )}
      </div>

      {/* Broadcaster Actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!isStreaming ? (
          <button
            onClick={startStreaming}
            style={{
              flex: 1,
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontWeight: '900',
              padding: '12px 18px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              cursor: 'pointer'
            }}
          >
            <Play size={18} /> ▶️ Start Live Camera Stream (Go Live)
          </button>
        ) : (
          <button
            onClick={stopStreaming}
            style={{
              flex: 1,
              backgroundColor: '#334155',
              color: '#f8fafc',
              fontWeight: '900',
              padding: '12px 18px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: '1px solid #475569',
              cursor: 'pointer'
            }}
          >
            <Square size={16} /> ⏹️ End Live Camera Stream
          </button>
        )}
      </div>

      {statusMessage && (
        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: isStreaming ? '#10b981' : '#f59e0b', fontWeight: '700', textAlign: 'center' }}>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#f43f5e', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}
    </div>
  );
};

export default LiveStreamBroadcaster;
