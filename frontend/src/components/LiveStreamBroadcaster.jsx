import React, { useState, useEffect } from 'react';
import { Camera, Radio, Play, Square, ExternalLink, RefreshCw, Mic, MicOff, ZoomIn, ZoomOut } from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanData } from '../services/firebaseService';

export const LiveStreamBroadcaster = ({ matchId, homeTeam, awayTeam, score }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0x to 4.0x
  const [isMicMuted, setIsMicMuted] = useState(false);
  
  const streamRoomId = `kallikalam_match_${matchId}`;
  
  // Ultra-Low Latency (<100ms), 60 FPS, Zoom, Mute & Rotation Controls
  const rotationParam = rotationAngle > 0 ? `&rotate=${rotationAngle}` : '';
  const muteParam = isMicMuted ? '&mute=1' : '';
  const zoomParam = zoomLevel > 1.0 ? `&zoom=${zoomLevel}` : '';
  
  const broadcastUrl = `https://vdo.ninja/?push=${streamRoomId}&facing=environment&rear&landscape=1&aspect=16:9&autorotate=1${rotationParam}${muteParam}${zoomParam}&autostart=1&webcam&audiodevice&bitrate=2500&fps=60&zerolatency=1&buffer=0&fast&noerror&cleanoutput=1`;

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
    setZoomLevel(prev => Math.max(1.0, parseFloat((prev - 0.2).toFixed(1))));
  };

  const resetZoom = () => {
    setZoomLevel(1.0);
  };

  const toggleMic = () => {
    setIsMicMuted(prev => !prev);
  };

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
                CAMERA CONTROLS
              </span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Hold your phone in landscape mode to film the match. Use controls below to zoom, rotate, or mute!
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

      {/* Broadcast Frame / Preview */}
      <div style={{
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
        justifyContent: 'center'
      }}>
        {isStreaming ? (
          <iframe
            key={`broadcast-${rotationAngle}-${isMicMuted}-${zoomLevel}`}
            src={broadcastUrl}
            title="Field Camera Broadcast"
            allow="camera; microphone; display-capture; autoplay"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
          />
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

      {/* 🎛️ Live Broadcaster Control Bar (Zoom, Mic, Rotate) */}
      {isStreaming && (
        <div style={{
          backgroundColor: '#161c28',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🎛️ Live Camera & Audio Controls
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#cbd5e1' }}>Zoom:</span>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1.0}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Zoom Out"
              >
                <ZoomOut size={14} /> -
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#38bdf8', minWidth: '40px', textAlign: 'center' }}>
                {zoomLevel.toFixed(1)}x
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 4.0}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Zoom In"
              >
                <ZoomIn size={14} /> +
              </button>
              {zoomLevel > 1.0 && (
                <button
                  onClick={resetZoom}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Reset (1.0x)
                </button>
              )}
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
                {isMicMuted ? '🔇 Mic OFF (Muted)' : '🎙️ Mic ON (Active)'}
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
            <a
              href={broadcastUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: '220px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '800',
                padding: '12px 18px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
              }}
            >
              <ExternalLink size={16} /> 📱 Open Fullscreen Camera Studio
            </a>
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
