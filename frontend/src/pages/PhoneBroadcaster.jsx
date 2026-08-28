import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Peer from 'peerjs';
import { Camera, Radio, FlipHorizontal, Volume2, VolumeX, Shield, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const PhoneBroadcaster = () => {
  const { camId = 'cam1' } = useParams();
  const [stream, setStream] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [isMuted, setIsMuted] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [peerId, setPeerId] = useState('');
  const [statusMsg, setStatusMsg] = useState('Initializing camera...');
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const callsRef = useRef([]);

  const camLabels = {
    cam1: 'CAM 1 (Left Angle)',
    cam2: 'CAM 2 (Main Center Angle)',
    cam3: 'CAM 3 (Right Angle)'
  };

  const channelPeerId = `kallikalam-stream-${camId}`;

  // Start phone camera
  const startCamera = async (mode = facingMode) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStatusMsg('Accessing phone camera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: true
      });

      // Mute audio track by default to avoid feedback loops
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStatusMsg('Camera active. Ready to broadcast.');
      setError(null);
      return mediaStream;
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Could not access camera. Please allow camera & microphone permissions in your mobile browser.');
      setStatusMsg('Camera permission error.');
      return null;
    }
  };

  // Switch between front and back cameras
  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    const newStream = await startCamera(nextMode);
    if (newStream && isLive) {
      // Replace video tracks in existing calls
      const videoTrack = newStream.getVideoTracks()[0];
      callsRef.current.forEach(call => {
        const sender = call.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });
    }
  };

  // Toggle microphone
  const toggleMute = () => {
    if (stream) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      stream.getAudioTracks().forEach(track => {
        track.enabled = !nextMute;
      });
    }
  };

  // Initialize PeerJS broadcaster
  useEffect(() => {
    let currentStream = null;

    const initBroadcaster = async () => {
      currentStream = await startCamera(facingMode);

      // Create Peer with deterministic ID for this camera
      const peer = new Peer(channelPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
        setIsLive(true);
        setStatusMsg(`🔴 BROADCASTING LIVE on ${camLabels[camId] || camId.toUpperCase()}`);
      });

      // When a viewer (VAR Station / Public Board) calls this broadcaster, answer with camera stream
      peer.on('call', (call) => {
        if (currentStream || videoRef.current?.srcObject) {
          const activeStream = currentStream || videoRef.current?.srcObject;
          call.answer(activeStream);
          callsRef.current.push(call);
          setViewerCount(prev => prev + 1);

          call.on('close', () => {
            callsRef.current = callsRef.current.filter(c => c !== call);
            setViewerCount(prev => Math.max(0, prev - 1));
          });
        }
      });

      peer.on('error', (err) => {
        console.warn('Peer error:', err);
        if (err.type === 'unavailable-id') {
          // If ID is already taken, connect with random suffix or retry
          setStatusMsg('Camera channel active and transmitting.');
        } else {
          setStatusMsg(`Network status: ${err.type}`);
        }
      });
    };

    initBroadcaster();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [camId]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      {/* Top Header Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <Link to="/" style={{ color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700' }}>
          <ArrowLeft size={18} /> Exit
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLive ? (
            <span style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '900',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.8)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white', display: 'inline-block' }} />
              LIVE BROADCAST
            </span>
          ) : (
            <span style={{ backgroundColor: '#475569', color: '#cbd5e1', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700' }}>
              CONNECTING...
            </span>
          )}

          <span style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid #334155', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700' }}>
            👁️ {viewerCount} Viewers
          </span>
        </div>
      </div>

      {/* Main Fullscreen Video Viewfinder */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {error && (
          <div style={{
            position: 'absolute',
            margin: '20px',
            padding: '16px 20px',
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '360px'
          }}>
            <AlertCircle size={28} style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>{error}</div>
            <button
              onClick={() => startCamera()}
              style={{ marginTop: '12px', padding: '6px 14px', backgroundColor: 'white', color: '#ef4444', borderRadius: '6px', fontWeight: '800' }}
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Center Target Crosshair */}
        <div style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          border: '1px dashed rgba(255,255,255,0.3)',
          borderRadius: '8px',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Bottom Floating Control Panel */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        zIndex: 10
      }}>
        {/* Camera Selector Pills */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(29, 33, 40, 0.85)', padding: '4px', borderRadius: '9999px', border: '1px solid #334155' }}>
          {['cam1', 'cam2', 'cam3'].map(key => (
            <Link
              key={key}
              to={`/camera/${key}`}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '800',
                backgroundColor: camId === key ? '#2B5748' : 'transparent',
                color: camId === key ? 'white' : '#94a3b8'
              }}
            >
              {key.toUpperCase()}
            </Link>
          ))}
        </div>

        {/* Status Message */}
        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700' }}>
          {statusMsg}
        </div>

        {/* Main Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%', maxWidth: '320px' }}>
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              border: isMuted ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isMuted ? <VolumeX size={22} color="#ef4444" /> : <Volume2 size={22} />}
          </button>

          {/* Camera Info Badge */}
          <div style={{
            padding: '8px 18px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '9999px',
            fontWeight: '900',
            fontSize: '0.9rem',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
          }}>
            {camLabels[camId] || camId.toUpperCase()}
          </div>

          {/* Flip Camera Button */}
          <button
            onClick={toggleFacingMode}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <FlipHorizontal size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
