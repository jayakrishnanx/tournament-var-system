import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import Peer from 'peerjs';
import { VideoOff, RefreshCw, Radio, Play, VolumeX, Volume2, Zap, Smartphone, ExternalLink } from 'lucide-react';
import { getStreamHost } from '../services/streamConfig';

export const HlsPlayer = ({ src, fallbackUrl, label = 'Camera Stream' }) => {
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const currentCallRef = useRef(null);

  const [streamSource, setStreamSource] = useState('phone'); // 'phone' (Cloud WebRTC), 'webrtc' (MediaMTX WebRTC), 'hls' (MediaMTX HLS)
  const [isOnline, setIsOnline] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [needUserPlay, setNeedUserPlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streamHost, setStreamHostState] = useState(getStreamHost());

  // Extract cam key from src (e.g. 'cam1', 'cam2', 'cam3')
  let camKey = 'cam1';
  if (src.includes('cam2')) camKey = 'cam2';
  else if (src.includes('cam3')) camKey = 'cam3';

  const channelPeerId = `kallikalam-stream-${camKey}`;

  useEffect(() => {
    const handleHostChange = () => {
      setStreamHostState(getStreamHost());
    };
    window.addEventListener('stream_host_changed', handleHostChange);
    return () => window.removeEventListener('stream_host_changed', handleHostChange);
  }, []);

  let pathName = '';
  try {
    const urlObj = new URL(src);
    pathName = urlObj.pathname.replace(/^\//, '').replace(/\/index\.m3u8$/, '');
  } catch (e) {
    pathName = src.replace(/^http:\/\/[^\/]+\//, '').replace(/\/index\.m3u8$/, '');
  }

  const resolvedSrc = `http://${streamHost}:8888/${pathName}/index.m3u8`;
  const webrtcUrl = `http://${streamHost}:8889/${pathName}`;

  // 1. Phone Cloud WebRTC Connection
  const connectPhoneWebRtc = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    setLoading(true);
    setIsOnline(false);

    // Create viewer Peer
    const peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peerRef.current = peer;

    peer.on('open', () => {
      // Call the phone broadcaster
      // Create empty audio/video stream to initiate call
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dummyStream = canvas.captureStream(1);

      const call = peer.call(channelPeerId, dummyStream);
      currentCallRef.current = call;

      if (call) {
        call.on('stream', (remoteStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.muted = isMuted;
            videoRef.current.play().catch(() => setNeedUserPlay(true));
          }
          setIsOnline(true);
          setLoading(false);
        });

        call.on('close', () => {
          setIsOnline(false);
          setLoading(false);
        });

        call.on('error', (err) => {
          console.warn('Call error:', err);
          setIsOnline(false);
          setLoading(false);
        });
      }
    });

    peer.on('error', (err) => {
      console.warn('Viewer peer error:', err);
      setIsOnline(false);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (streamSource === 'phone') {
      connectPhoneWebRtc();
      // Retry connecting every 6 seconds if phone is not yet broadcasting
      const interval = setInterval(() => {
        if (!isOnline && peerRef.current?.open) {
          connectPhoneWebRtc();
        }
      }, 6000);

      return () => {
        clearInterval(interval);
        if (peerRef.current) peerRef.current.destroy();
      };
    }
  }, [streamSource, camKey, isOnline]);

  // 2. HLS Stream Loader
  useEffect(() => {
    if (streamSource !== 'hls') return;

    let hls = null;
    let retryTimer = null;
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);

    const initHls = () => {
      if (hls) hls.destroy();

      if (Hls.isSupported()) {
        hls = new Hls({
          manifestLoadingTimeOut: 5000,
          manifestLoadingMaxRetry: 10,
          levelLoadingTimeOut: 5000,
          fragLoadingTimeOut: 5000,
          maxBufferLength: 4,
          maxMaxBufferLength: 8,
          enableWorker: true,
        });

        hls.loadSource(resolvedSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsOnline(true);
          setLoading(false);
          video.muted = isMuted;
          video.play().catch(() => setNeedUserPlay(true));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            setIsOnline(false);
            setLoading(false);
            retryTimer = setTimeout(() => {
              if (hls) {
                hls.loadSource(resolvedSrc);
                hls.startLoad();
              }
            }, 2000);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = resolvedSrc;
        video.addEventListener('loadedmetadata', () => {
          setIsOnline(true);
          setLoading(false);
          video.play().catch(() => {});
        });
      }
    };

    initHls();

    return () => {
      if (hls) hls.destroy();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [resolvedSrc, streamSource]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16/9',
      backgroundColor: '#090d16',
      borderRadius: '12px',
      overflow: 'hidden',
      border: isOnline ? '2px solid #10b981' : '1px solid #334155',
      boxShadow: isOnline ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Viewport content */}
      {streamSource === 'webrtc' ? (
        /* 1. MediaMTX Local WebRTC IFrame */
        <iframe
          id={`iframe-${label.replace(/\s+/g, '-')}`}
          src={webrtcUrl}
          title={label}
          style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#090d16' }}
          allow="autoplay; fullscreen"
        />
      ) : (
        /* 2. Phone Cloud WebRTC or HLS Video Element */
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isOnline ? 'block' : 'none'
          }}
        />
      )}

      {/* Offline / Waiting State Display */}
      {!isOnline && streamSource !== 'webrtc' && (
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          padding: '20px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <Smartphone size={32} color="#3b82f6" className="animate-pulse" />
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>
            Waiting for {label} Broadcast
          </div>
          <p style={{ fontSize: '0.72rem', maxWidth: '240px', margin: 0, color: '#64748b' }}>
            Open the Camera link on any phone to start broadcasting live.
          </p>
          <a
            href={`/camera/${camKey}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: '4px', textDecoration: 'none' }}
          >
            📱 Open Phone Broadcaster <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Camera Label Badge */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: '800',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: '1px solid #334155',
        zIndex: 10
      }}>
        <Radio size={12} color={isOnline ? '#10b981' : '#64748b'} className={isOnline ? 'animate-pulse' : ''} />
        <span>{label}</span>
        <span style={{
          backgroundColor: isOnline ? '#10b981' : '#475569',
          color: 'white',
          fontSize: '0.65rem',
          padding: '1px 6px',
          borderRadius: '4px',
          fontWeight: '900'
        }}>
          {isOnline ? '● LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Mode Selector & Action Buttons */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', zIndex: 10 }}>
        {/* Source Mode Switcher */}
        <select
          value={streamSource}
          onChange={e => setStreamSource(e.target.value)}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            color: 'white',
            border: '1px solid #334155',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: '700'
          }}
        >
          <option value="phone">📱 Phone WebRTC (Cloud)</option>
          <option value="webrtc">⚡ Local WebRTC</option>
          <option value="hls">🌐 Local HLS</option>
        </select>

        {/* Reconnect button */}
        <button
          onClick={() => {
            if (streamSource === 'phone') connectPhoneWebRtc();
          }}
          title="Reconnect Stream"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            color: 'white',
            border: '1px solid #334155',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={12} color="#10b981" />
        </button>
      </div>
    </div>
  );
};
