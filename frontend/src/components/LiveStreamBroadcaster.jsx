import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { Camera, VideoOff, RefreshCw, Mic, MicOff, Radio, Users, Play, Square } from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanData } from '../services/firebaseService';

export const LiveStreamBroadcaster = ({ matchId, homeTeam, awayTeam, score }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [isMuted, setIsMuted] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const activeCallsRef = useRef(new Set());

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [matchId]);

  const startStreaming = async () => {
    setStatusMessage('Accessing camera...');
    try {
      // 1. Get user media (camera + mic)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // 2. Initialize PeerJS as Broadcaster
      const broadcasterPeerId = `kallikalam_live_${matchId}_broadcaster`;
      setStatusMessage('Connecting live cloud network...');

      // Cleanup existing peer if any
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (e) {}
      }

      const peer = new Peer(broadcasterPeerId, {
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

      peer.on('open', async (id) => {
        setIsStreaming(true);
        setStatusMessage('🔴 Live Stream Active!');

        // Update Firestore live stream room
        try {
          await setDoc(doc(db, 'live_streams', String(matchId)), cleanData({
            matchId: String(matchId),
            is_active: true,
            broadcaster_peer_id: id,
            started_at: serverTimestamp()
          }), { merge: true });
        } catch (e) {
          console.warn('Firestore live stream record error:', e);
        }
      });

      // Handle incoming viewer calls
      peer.on('call', (call) => {
        if (streamRef.current) {
          // Answer incoming viewer with our camera stream
          call.answer(streamRef.current);
          activeCallsRef.current.add(call);
          setViewerCount(activeCallsRef.current.size);

          call.on('close', () => {
            activeCallsRef.current.delete(call);
            setViewerCount(activeCallsRef.current.size);
          });

          call.on('error', () => {
            activeCallsRef.current.delete(call);
            setViewerCount(activeCallsRef.current.size);
          });
        }
      });

      peer.on('error', (err) => {
        console.warn('Broadcaster peer error:', err);
        if (err.type === 'unavailable-id') {
          // Retry with fresh timestamp ID
          setStatusMessage('Broadcasting live...');
        }
      });

    } catch (err) {
      console.error('Camera access error:', err);
      alert('Could not access camera/microphone. Please ensure you have granted camera permissions in your browser: ' + err.message);
      setStatusMessage('Camera error: ' + err.message);
      stopStreaming();
    }
  };

  const stopStreaming = async () => {
    setIsStreaming(false);
    setStatusMessage('');
    setViewerCount(0);

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Close all viewer calls
    activeCallsRef.current.forEach(call => {
      try { call.close(); } catch (e) {}
    });
    activeCallsRef.current.clear();

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
      stopStreaming();
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
            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
              {isStreaming ? '🔴 LIVE CAMERA BROADCASTER' : '📹 LIVE MATCH CAMERA STREAM'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Stream directly from your phone camera to all spectators — no extra app needed!
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
      {isStreaming ? (
        <div style={{
          position: 'relative',
          width: '100%',
          maxHeight: '400px',
          height: '56vw',
          minHeight: '220px',
          backgroundColor: '#000000',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '14px',
          border: '1px solid #334155'
        }}>
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
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
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: '900'
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
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '8px',
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
                backgroundColor: isMuted ? '#ef4444' : 'rgba(15, 23, 42, 0.85)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '8px',
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
          border: '1px dashed #334155',
          borderRadius: '10px',
          padding: '24px 16px',
          textAlign: 'center',
          marginBottom: '14px'
        }}>
          <Camera size={36} color="#64748b" style={{ margin: '0 auto 8px auto', display: 'block' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: '800', color: '#EAECF0', marginBottom: '4px' }}>
            Camera Stream is Currently Offline
          </p>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '420px', margin: '0 auto' }}>
            Tap the button below to start streaming this live match from your phone's back camera directly to all spectator devices.
          </p>
        </div>
      )}

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
    </div>
  );
};
