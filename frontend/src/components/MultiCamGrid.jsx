import React, { useState } from 'react';
import { HlsPlayer } from './HlsPlayer';
import { LayoutGrid, Maximize2, Smartphone, Info, Copy, Check } from 'lucide-react';

export const MultiCamGrid = ({ matchId }) => {
  const [activeTab, setActiveTab] = useState('GRID'); // GRID, CAM1, CAM2, CAM3
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const streamHost = window.location.hostname || 'localhost';

  const streams = [
    { id: 'cam1', label: 'CAM 1 (Left Angle)', url: `http://${streamHost}:8888/live/cam1/index.m3u8`, fallbackUrl: `http://${streamHost}:8888/cam1/index.m3u8`, rtmp: `rtmp://${streamHost}:1935/live/cam1` },
    { id: 'cam2', label: 'CAM 2 (Main Center)', url: `http://${streamHost}:8888/live/cam2/index.m3u8`, fallbackUrl: `http://${streamHost}:8888/cam2/index.m3u8`, rtmp: `rtmp://${streamHost}:1935/live/cam2` },
    { id: 'cam3', label: 'CAM 3 (Right Angle)', url: `http://${streamHost}:8888/live/cam3/index.m3u8`, fallbackUrl: `http://${streamHost}:8888/cam3/index.m3u8`, rtmp: `rtmp://${streamHost}:1935/live/cam3` }
  ];

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('GRID')}
            className={activeTab === 'GRID' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <LayoutGrid size={14} /> 3-Cam Grid
          </button>
          {streams.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={activeTab === s.id ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Cam {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowIngestModal(true)}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Smartphone size={14} color="#3b82f6" /> Mobile Setup Guide
        </button>
      </div>

      {/* Grid or Focused View */}
      {activeTab === 'GRID' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {streams.map(s => (
            <HlsPlayer key={s.id} src={s.url} label={s.label} />
          ))}
        </div>
      ) : (
        <div>
          {streams.filter(s => s.id === activeTab).map(s => (
            <HlsPlayer key={s.id} src={s.url} label={s.label} />
          ))}
        </div>
      )}

      {/* Mobile Stream Ingest Modal */}
      {showIngestModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Smartphone size={24} color="#3b82f6" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Universal Mobile Camera Setup (iOS / Android)</h2>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
              Use <strong>Larix Broadcaster</strong> or any RTMP app. You can use the <strong>Universal Hostname</strong> (`jayakrishnan.local`) which works across <strong>ANY Wi-Fi or Phone Hotspot automatically</strong> without changing IP addresses!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {streams.map(s => {
                const universalUrl = `rtmp://jayakrishnan.local:1935/live/${s.id}`;
                return (
                  <div key={s.id} style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ backgroundColor: 'white', padding: '6px', borderRadius: '8px', minWidth: '90px' }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(universalUrl)}`}
                        alt={`QR ${s.id}`}
                        style={{ width: '90px', height: '90px', display: 'block' }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#f8fafc', marginBottom: '6px' }}>{s.label}</div>
                      
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '800', display: 'block' }}>🌐 Universal Hostname (Works Everywhere):</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '4px' }}>
                          <code style={{ fontSize: '0.75rem', color: '#3b82f6', fontFamily: 'monospace' }}>{universalUrl}</code>
                          <button
                            onClick={() => handleCopy(universalUrl, `${s.id}-uni`)}
                            className="btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {copiedKey === `${s.id}-uni` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            {copiedKey === `${s.id}-uni` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', display: 'block' }}>📡 Auto-Detected IP URL:</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '4px' }}>
                          <code style={{ fontSize: '0.75rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{s.rtmp}</code>
                          <button
                            onClick={() => handleCopy(s.rtmp, `${s.id}-ip`)}
                            className="btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {copiedKey === `${s.id}-ip` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            {copiedKey === `${s.id}-ip` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowIngestModal(false)} className="btn-primary" style={{ padding: '8px 16px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
