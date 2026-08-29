import React, { useState, useRef, useEffect } from 'react';
import { Camera, Radio, Play, Square, RefreshCw, Mic, MicOff, ZoomIn, ZoomOut } from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanData, updateMatch } from '../services/firebaseService';

export const LiveStreamBroadcaster = ({ matchId, homeTeam, awayTeam, score }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [zoomLevel, setZoomLevel] = useState(1.00); // 1.00x to 3.00x (micro 0.05x steps)
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeviceLandscape, setIsDeviceLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );

  const iframeRef = useRef(null);
  const touchStateRef = useRef({ initialDist: null, initialZoom: 1.00 });
  const streamRoomId = `kallikalam_match_${matchId}`;
  
  // Track device orientation changes in real time
  useEffect(() => {
    const handleOrientationChange = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsDeviceLandscape(landscape);
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Persistent Broadcast URL — completely static so iframe NEVER reloads or cuts stream
  const broadcastUrl = `https://vdo.ninja/?push=${streamRoomId}&facing=environment&rear&landscape=1&aspect=16:9&autorotate=1&zoom=1&zoom&meter=1&autostart=1&webcam&audiodevice&bitrate=2500&fps=60&zerolatency=1&buffer=0&fast&noerror`;

  // Send hardware camera video frame zoom command to WebRTC track
  useEffect(() => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ action: 'zoom', value: zoomLevel }, '*');
        iframeRef.current.contentWindow.postMessage({ function: 'zoom', value: zoomLevel }, '*');
        iframeRef.current.contentWindow.postMessage({ zoom: zoomLevel }, '*');
      }
    } catch (e) {}
  }, [zoomLevel]);

  const startBroadcast = async () => {
    setIsStreaming(true);

    try {
      if (window.screen?.orientation?.lock) {
        window.screen.orientation.lock('landscape').catch(() => {});
      }
    } catch (e) {}

    // Immediately mark this exact match schedule as LIVE
    try {
      await updateMatch(matchId, {
        status: 'LIVE',
        is_live_streaming: true,
        current_period: '1ST_HALF'
      });
    } catch (e) {}

    try {
      await setDoc(doc(db, 'live_streams', String(matchId)), cleanData({
        matchId: String(matchId),
        is_active: true,
        stream_room_id: streamRoomId,
        started_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }), { merge: true });
    } catch (e) {
      console.warn('Firebase live stream update notice:', e);
    }
  };

  const stopBroadcast = async () => {
    setIsStreaming(false);
    setIsFullscreen(false);

    try {
      await updateMatch(matchId, {
        is_live_streaming: false
      });
    } catch (e) {}

    try {
      await updateDoc(doc(db, 'live_streams', String(matchId)), {
        is_active: false,
        ended_at: serverTimestamp()
      });
    } catch (e) {}
  };

  const cycleRotation = () => {
    setRotationAngle(prev => (prev + 90) % 360);
  };

  // Fine-Grain Micro Zoom Steps (0.05x per tap for tiny, smooth frame adjustments)
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3.00, parseFloat((prev + 0.05).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(1.00, parseFloat((prev - 0.05).toFixed(2))));
  };

  const handleSliderZoom = (e) => {
    setZoomLevel(parseFloat(parseFloat(e.target.value).toFixed(2)));
  };

  const setPresetZoom = (lvl) => {
    setZoomLevel(lvl);
  };

  // Instant Live Mic Toggle WITHOUT pausing or cutting the stream
  const toggleMic = () => {
    setIsMicMuted(prev => {
      const nextMuted = !prev;
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ mic: !nextMuted }, '*');
          iframeRef.current.contentWindow.postMessage({ action: 'mute', value: nextMuted }, '*');
          iframeRef.current.contentWindow.postMessage({ function: 'muteMic', value: nextMuted }, '*');
        }
      } catch (e) {}
      return nextMuted;
    });
  };

  // Two-Finger Ultra-Smooth Micro Pinch Gestures
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStateRef.current = { initialDist: dist, initialZoom: zoomLevel };
      setIsPinching(true);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStateRef.current.initialDist) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (currentDist - touchStateRef.current.initialDist) * 0.0015;
      const targetZoom = Math.min(3.00, Math.max(1.00, touchStateRef.current.initialZoom + delta));
      setZoomLevel(parseFloat(targetZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current = { initialDist: null, initialZoom: zoomLevel };
    setIsPinching(false);
  };

  const transformStyle = `scale(${zoomLevel}) ${rotationAngle > 0 ? `rotate(${rotationAngle}deg)` : ''}`;
  const isLandscapeMode = isStreaming && (isDeviceLandscape || isFullscreen);

  return (
    <div
      style={isLandscapeMode ? {
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
        alignItems: 'center',
        justifyContent: 'center'
      } : {
        padding: '18px 20px',
        marginBottom: '20px',
        border: isStreaming ? '2px solid #ef4444' : '1px solid #334155',
        boxShadow: isStreaming ? '0 0 25px rgba(239, 68, 68, 0.25)' : 'none',
        borderRadius: '14px',
        backgroundColor: '#11151f'
      }}
      className={isLandscapeMode ? '' : 'glass-panel'}
    >
      {/* Header (Only shown in Portrait mode) */}
      {!isLandscapeMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={22} color={isStreaming ? '#ef4444' : '#10b981'} className={isStreaming ? 'animate-pulse' : ''} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isStreaming ? '🔴 LIVE CAMERA BROADCASTER' : '📹 FIELD CAMERA LIVE BROADCAST'}
                <span style={{ fontSize: '0.65rem', backgroundColor: '#10b981', color: '#000000', padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>
                  CONTINUOUS STREAM
                </span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Rotate your phone sideways into landscape mode without interrupting the live stream!
              </span>
            </div>
          </div>

          {isStreaming && (
            <span style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: '900',
              padding: '4px 12px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              ● BROADCASTING LIVE
            </span>
          )}
        </div>
      )}

      {/* Floating Status Bar in Fullscreen Landscape */}
      {isLandscapeMode && (
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 40,
          pointerEvents: 'none'
        }}>
          <span style={{
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            color: '#ffffff',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '900',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'auto'
          }}>
            ● LIVE
          </span>

          <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
            <button
              onClick={cycleRotation}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.72rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={12} /> Rotate ({rotationAngle}°)
            </button>
          </div>
        </div>
      )}

      {/* THE SINGLE PERMANENT CAMERA VIEWPORT (NEVER DESTROYED ON ROTATE) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={isLandscapeMode ? {
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
          overflow: 'hidden',
          touchAction: 'none'
        } : {
          position: 'relative',
          width: '100%',
          height: isStreaming ? '56.25vw' : 'auto',
          maxHeight: '460px',
          minHeight: isStreaming ? '260px' : 'auto',
          backgroundColor: '#000000',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '14px',
          border: isStreaming ? '2px solid #ef4444' : '1px dashed #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none'
        }}
      >
        {isStreaming ? (
          <>
            {/* The Permanent Iframe element */}
            <iframe
              ref={iframeRef}
              src={broadcastUrl}
              title="Field Camera Broadcast"
              allow="camera; microphone; display-capture; autoplay"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
                transform: transformStyle,
                transformOrigin: 'center center',
                transition: isPinching ? 'none' : 'transform 0.12s ease-out'
              }}
            />

            {/* Pinch Zoom Real-time HUD */}
            {isPinching && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: '#38bdf8',
                padding: '8px 18px',
                borderRadius: '12px',
                border: '2px solid #38bdf8',
                fontSize: '1.2rem',
                fontWeight: '900',
                boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)',
                pointerEvents: 'none',
                zIndex: 50
              }}>
                🔍 {zoomLevel.toFixed(2)}x
              </div>
            )}
          </>
        ) : (
          <div style={{
            backgroundColor: '#090d16',
            padding: '28px 16px',
            textAlign: 'center',
            width: '100%'
          }}>
            <Camera size={42} color="#64748b" style={{ margin: '0 auto 10px auto', display: 'block' }} />
            <p style={{ fontSize: '1rem', fontWeight: '800', color: '#EAECF0', marginBottom: '4px' }}>
              Field Camera Ready to Go Live
            </p>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '440px', margin: '0 auto' }}>
              Turn your phone horizontally (landscape mode) and tap <strong>"Start Live Camera Stream"</strong> below to broadcast live!
            </p>
          </div>
        )}

        {/* Floating Controls in Fullscreen Landscape Mode */}
        {isLandscapeMode && isStreaming && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 40,
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {/* Micro Zoom Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.82)',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.25)'
            }}>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1.00}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}
                title="Micro Zoom Out (-0.05x)"
              >
                - 0.05x
              </button>

              <input
                type="range"
                min="1.00"
                max="2.50"
                step="0.02"
                value={zoomLevel}
                onChange={handleSliderZoom}
                style={{
                  width: '90px',
                  accentColor: '#38bdf8',
                  cursor: 'pointer'
                }}
              />

              <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#38bdf8', minWidth: '42px', textAlign: 'center' }}>
                {zoomLevel.toFixed(2)}x
              </span>

              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.00}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}
                title="Micro Zoom In (+0.05x)"
              >
                + 0.05x
              </button>

              <button
                onClick={() => setPresetZoom(1.00)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginLeft: '2px'
                }}
              >
                1.0x
              </button>
            </div>

            {/* Live Non-Cutting Mic Toggle & Stop Broadcast */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={toggleMic}
                style={{
                  backgroundColor: isMicMuted ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.72rem',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {isMicMuted ? <MicOff size={13} /> : <Mic size={13} />}
                {isMicMuted ? 'Muted' : 'Mic ON'}
              </button>
              <button
                onClick={stopBroadcast}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.72rem',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Square size={13} /> End Stream
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar in Portrait Mode */}
      {!isLandscapeMode && isStreaming && (
        <div style={{
          backgroundColor: '#161c28',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🎛️ Micro Frame Zoom & Audio Controls
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Frame Scale: <strong style={{ color: '#38bdf8' }}>{zoomLevel.toFixed(2)}x</strong>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Micro Step Buttons & Precision Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1.00}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Micro Zoom Out by 0.05x"
              >
                <ZoomOut size={13} /> - 0.05x
              </button>

              <input
                type="range"
                min="1.00"
                max="2.50"
                step="0.02"
                value={zoomLevel}
                onChange={handleSliderZoom}
                style={{
                  width: '100px',
                  accentColor: '#38bdf8',
                  cursor: 'pointer'
                }}
              />

              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.00}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Micro Zoom In by 0.05x"
              >
                <ZoomIn size={13} /> + 0.05x
              </button>

              <button
                onClick={() => setPresetZoom(1.00)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                1.0x (Normal)
              </button>

              <button
                onClick={() => setPresetZoom(1.20)}
                style={{
                  backgroundColor: zoomLevel === 1.20 ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                1.2x
              </button>
            </div>

            {/* Mic Toggle & Rotation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Mic On/Off */}
              <button
                onClick={toggleMic}
                style={{
                  backgroundColor: isMicMuted ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '0.78rem',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: isMicMuted ? '0 2px 8px rgba(239, 68, 68, 0.3)' : '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isMicMuted ? <MicOff size={14} /> : <Mic size={14} />}
                {isMicMuted ? '🔇 Mic Muted' : '🎙️ Mic ON'}
              </button>

              {/* Rotate */}
              <button
                onClick={cycleRotation}
                className="btn-secondary"
                style={{
                  padding: '7px 12px',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#1e293b'
                }}
                title="Rotate 90 degrees"
              >
                <RefreshCw size={14} /> Rotate ({rotationAngle}°)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcaster Actions (Only shown in Portrait mode) */}
      {!isLandscapeMode && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!isStreaming ? (
            <button
              onClick={startBroadcast}
              style={{
                flex: 1,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontWeight: '900',
                padding: '13px 20px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.45)',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Play size={18} /> ▶️ Start Live Camera Stream (Go Live)
            </button>
          ) : (
            <button
              onClick={stopBroadcast}
              style={{
                flex: 1,
                backgroundColor: '#334155',
                color: '#f8fafc',
                fontWeight: '900',
                padding: '12px 18px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: '1px solid #475569',
                cursor: 'pointer'
              }}
            >
              <Square size={16} /> ⏹️ End Stream
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveStreamBroadcaster;
