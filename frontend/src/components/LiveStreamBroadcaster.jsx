import React, { useState, useRef, useEffect } from 'react';
import { Camera, Radio, Play, Square, RefreshCw, Mic, MicOff, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanData } from '../services/firebaseService';

export const LiveStreamBroadcaster = ({ matchId, homeTeam, awayTeam, score }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [zoomLevel, setZoomLevel] = useState(1.0); // 0.8x to 4.0x
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeviceLandscape, setIsDeviceLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );

  const iframeRef = useRef(null);
  const touchStateRef = useRef({ initialDist: null, initialZoom: 1.0 });
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

  // Base broadcast URL — stays persistent so iframe NEVER reloads on zoom/touch
  const rotationParam = rotationAngle > 0 ? `&rotate=${rotationAngle}` : '';
  const muteParam = isMicMuted ? '&mute=1' : '';
  const broadcastUrl = `https://vdo.ninja/?push=${streamRoomId}&facing=environment&rear&landscape=1&aspect=16:9&autorotate=1${rotationParam}${muteParam}&autostart=1&webcam&audiodevice&bitrate=2500&fps=60&zerolatency=1&buffer=0&fast&noerror&cleanoutput=1`;

  // Send hardware optical zoom command to camera stream if supported
  useEffect(() => {
    try {
      const msg = { action: 'zoom', value: zoomLevel };
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(msg, '*');
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

    try {
      await setDoc(doc(db, 'live_streams', String(matchId)), cleanData({
        matchId: String(matchId),
        is_active: true,
        stream_room_id: streamRoomId,
        started_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }), { merge: true });

      await updateDoc(doc(db, 'matches', String(matchId)), {
        status: 'LIVE',
        is_live_streaming: true
      });
    } catch (e) {
      console.warn('Firebase live stream update notice:', e);
    }
  };

  const stopBroadcast = async () => {
    setIsStreaming(false);
    setIsFullscreen(false);

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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(4.0, parseFloat((prev + 0.2).toFixed(1))));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.8, parseFloat((prev - 0.2).toFixed(1))));
  };

  const setPresetZoom = (lvl) => {
    setZoomLevel(lvl);
  };

  const toggleMic = () => {
    setIsMicMuted(prev => !prev);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Two-Finger Native Touch Pinch-In (Zoom Out) & Pinch-Out (Zoom In)
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
      const ratio = currentDist / touchStateRef.current.initialDist;
      const targetZoom = Math.min(4.0, Math.max(0.8, touchStateRef.current.initialZoom * ratio));
      setZoomLevel(parseFloat(targetZoom.toFixed(1)));
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current = { initialDist: null, initialZoom: zoomLevel };
    setIsPinching(false);
  };

  // 100% IMMERSIVE FULLSCREEN CAMERA VIEW (TRIGGERED IN LANDSCAPE OR VIA BUTTON)
  // HIDES ALL BROWSER HEADERS, BANNERS, TEXT, AND SCROLLBARS SO ONLY THE CAMERA IS VISIBLE!
  const shouldRenderFullscreen = isStreaming && (isDeviceLandscape || isFullscreen);

  if (shouldRenderFullscreen) {
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
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Fullscreen Video Viewport with Touch Gestures */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            backgroundColor: '#000000',
            overflow: 'hidden',
            touchAction: 'none'
          }}
        >
          <iframe
            ref={iframeRef}
            src={broadcastUrl}
            title="Fullscreen Camera Broadcast"
            allow="camera; microphone; display-capture; autoplay"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: isPinching ? 'none' : 'transform 0.15s ease-out'
            }}
          />

          {/* Pinch Zoom Real-time Floating HUD */}
          {isPinching && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              color: '#38bdf8',
              padding: '10px 20px',
              borderRadius: '12px',
              border: '2px solid #38bdf8',
              fontSize: '1.3rem',
              fontWeight: '900',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)',
              pointerEvents: 'none',
              zIndex: 50
            }}>
              🔍 {zoomLevel.toFixed(1)}x {zoomLevel <= 0.9 ? '(Wide Field)' : ''}
            </div>
          )}

          {/* Sleek Floating Top Status */}
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

          {/* Sleek Floating Bottom Controls */}
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
            {/* Quick Lens Buttons */}
            <div style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              padding: '4px 6px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <button
                onClick={() => setPresetZoom(0.8)}
                style={{
                  backgroundColor: zoomLevel === 0.8 ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                Wide
              </button>
              <button
                onClick={() => setPresetZoom(1.0)}
                style={{
                  backgroundColor: zoomLevel === 1.0 ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                1.0x
              </button>
              <button
                onClick={() => setPresetZoom(1.8)}
                style={{
                  backgroundColor: zoomLevel === 1.8 ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                2.0x
              </button>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.8}
                style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', padding: '3px 6px', fontSize: '0.8rem', fontWeight: '900', cursor: 'pointer' }}
              >
                -
              </button>
              <span style={{ fontSize: '0.72rem', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center' }}>
                {zoomLevel.toFixed(1)}x
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 4.0}
                style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', padding: '3px 6px', fontSize: '0.8rem', fontWeight: '900', cursor: 'pointer' }}
              >
                +
              </button>
            </div>

            {/* Mic Toggle & Stop Broadcast */}
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
        </div>
      </div>
    );
  }

  // STANDARD IN-PAGE VIEW (PORTRAIT MODE)
  return (
    <div className="glass-panel" style={{
      padding: '18px 20px',
      marginBottom: '20px',
      border: isStreaming ? '2px solid #ef4444' : '1px solid #334155',
      boxShadow: isStreaming ? '0 0 25px rgba(239, 68, 68, 0.25)' : 'none',
      borderRadius: '14px',
      backgroundColor: '#11151f'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Radio size={22} color={isStreaming ? '#ef4444' : '#10b981'} className={isStreaming ? 'animate-pulse' : ''} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isStreaming ? '🔴 LIVE CAMERA BROADCASTER' : '📹 FIELD CAMERA LIVE BROADCAST'}
              <span style={{ fontSize: '0.65rem', backgroundColor: '#10b981', color: '#000000', padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>
                AUTO-FULLSCREEN
              </span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Rotate your phone sideways into landscape mode to automatically enter full-screen camera viewfinder!
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

      {/* Broadcast Frame / Preview with Pinch-to-Zoom Touch Gestures */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
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
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isPinching ? 'none' : 'transform 0.15s ease-out'
              }}
            />
            {/* Visual HUD when Pinching on Screen */}
            {isPinching && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: '#38bdf8',
                padding: '12px 24px',
                borderRadius: '12px',
                border: '2px solid #38bdf8',
                fontSize: '1.4rem',
                fontWeight: '900',
                boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)',
                pointerEvents: 'none',
                zIndex: 30
              }}>
                🔍 {zoomLevel.toFixed(1)}x {zoomLevel <= 0.9 ? '(Wide Field)' : ''}
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
      </div>

      {/* 🎛️ Live Broadcaster Control Bar (Zoom, Lens Presets, Mic, Rotate) */}
      {isStreaming && (
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
              🎛️ Camera Lens, Pinch Zoom & Audio Controls
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Current Scale: <strong style={{ color: '#38bdf8' }}>{zoomLevel.toFixed(1)}x</strong>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Quick Lens Preset Buttons (Wide 0.8x, Normal 1.0x, Zoom 2.0x) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPresetZoom(0.8)}
                style={{
                  backgroundColor: zoomLevel === 0.8 ? '#2563eb' : '#1e293b',
                  color: '#ffffff',
                  border: zoomLevel === 0.8 ? '1px solid #60a5fa' : '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                Wide (0.8x)
              </button>
              <button
                onClick={() => setPresetZoom(1.0)}
                style={{
                  backgroundColor: zoomLevel === 1.0 ? '#2563eb' : '#1e293b',
                  color: '#ffffff',
                  border: zoomLevel === 1.0 ? '1px solid #60a5fa' : '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                1.0x Normal
              </button>
              <button
                onClick={() => setPresetZoom(1.8)}
                style={{
                  backgroundColor: zoomLevel === 1.8 ? '#2563eb' : '#1e293b',
                  color: '#ffffff',
                  border: zoomLevel === 1.8 ? '1px solid #60a5fa' : '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                2.0x Zoom
              </button>

              {/* Fine-Tuning Step Zoom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.8}
                  className="btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '2px' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={13} /> -
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 4.0}
                  className="btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '2px' }}
                  title="Zoom In"
                >
                  <ZoomIn size={13} /> +
                </button>
              </div>
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

      {/* Broadcaster Actions */}
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
          <>
            <button
              onClick={toggleFullscreen}
              style={{
                flex: 1,
                minWidth: '220px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '900',
                padding: '12px 18px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.45)'
              }}
            >
              <Maximize2 size={18} /> ⛶ Fullscreen Camera Studio
            </button>
            <button
              onClick={stopBroadcast}
              style={{
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
          </>
        )}
      </div>
    </div>
  );
};

export default LiveStreamBroadcaster;
