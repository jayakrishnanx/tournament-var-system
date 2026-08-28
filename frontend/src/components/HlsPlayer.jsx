import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { VideoOff, RefreshCw, Radio, Play, VolumeX, Volume2, Zap } from 'lucide-react';
import { getStreamHost } from '../services/streamConfig';

export const HlsPlayer = ({ src, fallbackUrl, label = 'Camera Stream' }) => {
  const videoRef = useRef(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [useWebRtc, setUseWebRtc] = useState(true); // Default to WebRTC for ZERO shuttering
  const [needUserPlay, setNeedUserPlay] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamHost, setStreamHostState] = useState(getStreamHost());

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

  // Build resolved URLs using dynamic streamHost
  const resolvedSrc = `http://${streamHost}:8888/${pathName}/index.m3u8`;
  const webrtcUrl = `http://${streamHost}:8889/${pathName}`;

  useEffect(() => {
    if (useWebRtc) return; // If WebRTC mode enabled, iframe handles stream

    let hls = null;
    let retryTimer = null;
    const video = videoRef.current;
    if (!video || !src) return;

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
          setError(null);
          video.muted = true;
          video.play().catch(() => setNeedUserPlay(true));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            setIsOnline(false);
            setLoading(false);
            setError('Stream offline (retrying...)');
            // Retry loading HLS manifest after 2 seconds
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
          video.play().catch(() => { });
        });
      }
    };

    initHls();

    return () => {
      if (hls) hls.destroy();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [resolvedSrc, streamHost, useWebRtc]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16/9',
      backgroundColor: '#090d16',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* 1. WebRTC Mode Player (Zero Shutter / Zero Lag) */}
      {useWebRtc ? (
        <iframe
          id={`iframe-${label.replace(/\s+/g, '-')}`}
          src={webrtcUrl}
          title={label}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#090d16'
          }}
          allow="autoplay; fullscreen"
        />
      ) : (
        /* 2. HLS Fallback Video Element */
        <video
          ref={videoRef}
          controls
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      )}

      {/* Camera Label Badge */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
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
        <Radio size={12} color="#10b981" />
        <span>{label}</span>
        <span style={{ backgroundColor: '#8b5cf6', color: 'white', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>
          {useWebRtc ? '⚡ WebRTC (Zero-Stutter)' : 'HLS'}
        </span>
      </div>

      {/* Mode Switcher Toggle Button */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 10 }}>
        {useWebRtc && (
          <button
            onClick={() => {
              const videoIframe = document.getElementById(`iframe-${label.replace(/\s+/g, '-')}`);
              if (videoIframe) videoIframe.src = videoIframe.src;
            }}
            title="Reconnect WebRTC stream"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              color: 'white',
              border: '1px solid #334155',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} color="#10b981" /> Reconnect
          </button>
        )}

        <button
          onClick={() => setUseWebRtc(!useWebRtc)}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: 'white',
            border: '1px solid #334155',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer'
          }}
        >
          <Zap size={12} color="#f59e0b" />
          <span>{useWebRtc ? 'Switch to HLS (Ultra-Stable)' : 'Switch to WebRTC (Ultra-Fast)'}</span>
        </button>
      </div>
    </div>
  );
};
