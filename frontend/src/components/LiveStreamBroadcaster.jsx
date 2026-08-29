import React, { useState, useEffect } from 'react';
import { Camera, Radio, Play, Square, ExternalLink, Sparkles, Volume2, Video } from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanData } from '../services/firebaseService';

export const LiveStreamBroadcaster = ({ matchId, homeTeam, awayTeam, score }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRoomId = `kallikalam_match_${matchId}`;
  const broadcastUrl = `https://vdo.ninja/?push=${streamRoomId}&cleanoutput=1&autostart=1&webcam&audiodevice`;

  const startBroadcast = async () => {
    setIsStreaming(true);

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
              {isStreaming ? '🔴 LIVE CAMERA BROADCASTER ACTIVE' : '📹 FIELD CAMERA LIVE BROADCAST'}
              <span style={{ fontSize: '0.65rem', backgroundColor: '#10b981', color: '#000000', padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>
                HD 60FPS / ZERO APPS NEEDED
              </span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Broadcast directly from your phone camera & microphone — all spectators watch inside the scoreboard!
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
              Tap <strong>"Start Live Camera Stream"</strong> below to activate your phone camera & microphone. All spectators will instantly see and hear the match!
            </p>
          </div>
        )}
      </div>

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
