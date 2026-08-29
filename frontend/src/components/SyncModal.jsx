import React, { useState, useEffect } from 'react';
import { Smartphone, QrCode, Copy, Check, Cloud, Download, Upload, X, RefreshCw } from 'lucide-react';
import * as fb from '../services/firebaseService';

export const SyncModal = ({ isOpen, onClose }) => {
  const [syncUrl, setSyncUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ tournaments: 0, teams: 0, matches: 0 });
  const [importText, setImportText] = useState('');
  const [customFirebaseText, setCustomFirebaseText] = useState(() => {
    return localStorage.getItem('custom_firebase_config') || '';
  });
  const [firebaseSaved, setFirebaseSaved] = useState(false);

  const handleSaveFirebaseConfig = () => {
    try {
      if (!customFirebaseText.trim()) {
        localStorage.removeItem('custom_firebase_config');
        alert('Custom Firebase config cleared.');
        window.location.reload();
        return;
      }
      const parsed = JSON.parse(customFirebaseText.trim());
      if (parsed.apiKey && (parsed.projectId || parsed.appId)) {
        localStorage.setItem('custom_firebase_config', JSON.stringify(parsed));
        setFirebaseSaved(true);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert('Invalid Firebase configuration object. Must include apiKey and projectId.');
      }
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    try {
      const tourns = JSON.parse(localStorage.getItem('var_data_tournaments') || '[]');
      const teams = JSON.parse(localStorage.getItem('var_data_teams') || '[]');
      const matches = JSON.parse(localStorage.getItem('var_data_matches') || '[]');

      setStats({
        tournaments: tourns.length,
        teams: teams.length,
        matches: matches.length
      });

      // Package full payload
      const payload = {
        t: tourns,
        tm: teams,
        m: matches,
        ts: Date.now()
      };

      // Create compressed base64 payload
      const jsonStr = JSON.stringify(payload);
      const b64 = btoa(encodeURIComponent(jsonStr));
      const fullUrl = `${window.location.origin}/?sync_data=${b64}`;
      setSyncUrl(fullUrl);
    } catch (e) {
      console.error('Error preparing sync payload:', e);
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const tourns = JSON.parse(localStorage.getItem('var_data_tournaments') || '[]');
    const teams = JSON.parse(localStorage.getItem('var_data_teams') || '[]');
    const matches = JSON.parse(localStorage.getItem('var_data_matches') || '[]');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ tournaments: tourns, teams, matches }, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "kallikalam_tournament_backup.json");
    dlAnchor.click();
  };

  const handleManualImport = () => {
    try {
      const parsed = JSON.parse(importText.trim());
      if (parsed.tournaments || parsed.t) {
        const tourns = parsed.tournaments || parsed.t || [];
        const teams = parsed.teams || parsed.tm || [];
        const matches = parsed.matches || parsed.m || [];

        localStorage.setItem('var_data_tournaments', JSON.stringify(tourns));
        localStorage.setItem('var_data_teams', JSON.stringify(teams));
        localStorage.setItem('var_data_matches', JSON.stringify(matches));

        setImportSuccess(`✅ Successfully imported ${tourns.length} tournaments, ${teams.length} teams, ${matches.length} matches!`);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        alert('Invalid data format. Expected tournaments, teams, and matches.');
      }
    } catch (e) {
      alert('Error parsing JSON. Please ensure valid format: ' + e.message);
    }
  };

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(syncUrl)}`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '520px',
        padding: '24px',
        backgroundColor: '#181c24',
        border: '1px solid #334155',
        borderRadius: '12px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={22} color="#10b981" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc' }}>
              Sync Data to Phone / Other Devices
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('qr')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: '800',
              backgroundColor: activeTab === 'qr' ? '#2B5748' : 'transparent',
              color: activeTab === 'qr' ? '#fff' : '#94a3b8',
              border: activeTab === 'qr' ? '1px solid #2B5748' : '1px solid #334155'
            }}
          >
            📱 1-Click Scan to Phone
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: '800',
              backgroundColor: activeTab === 'firebase' ? '#2B5748' : 'transparent',
              color: activeTab === 'firebase' ? '#fff' : '#94a3b8',
              border: activeTab === 'firebase' ? '1px solid #2B5748' : '1px solid #334155'
            }}
          >
            🔥 Firebase Cloud Keys
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: '800',
              backgroundColor: activeTab === 'manual' ? '#2B5748' : 'transparent',
              color: activeTab === 'manual' ? '#fff' : '#94a3b8',
              border: activeTab === 'manual' ? '1px solid #2B5748' : '1px solid #334155'
            }}
          >
            📋 Backup JSON
          </button>
        </div>

        {activeTab === 'qr' ? (
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
              Scan this QR code with your phone camera to instantly transfer all your <strong>{stats.tournaments} Tournaments</strong>, <strong>{stats.teams} Teams</strong>, and <strong>{stats.matches} Scheduled Matches</strong> to your phone!
            </p>

            {/* QR Code Container */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              padding: '16px',
              borderRadius: '12px',
              margin: '0 auto 16px auto',
              width: 'fit-content',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
              <img
                src={qrImageUrl}
                alt="QR Code for Phone Sync"
                style={{ width: '210px', height: '210px', objectFit: 'contain' }}
              />
              <span style={{ color: '#0f172a', fontSize: '0.75rem', fontWeight: '800', marginTop: '8px' }}>
                SCAN WITH PHONE CAMERA
              </span>
            </div>

            {/* Direct Sync URL copy */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                Or Copy Direct Sync Link (Send via WhatsApp / Telegram):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={syncUrl}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    backgroundColor: '#0f131a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#94a3b8',
                    fontSize: '0.75rem'
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'firebase' ? (
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px' }}>
              Paste your Firebase Project Web Configuration JSON from Firebase Console to enable 24/7 background cloud syncing across all devices.
            </p>
            <textarea
              rows={6}
              value={customFirebaseText}
              onChange={(e) => setCustomFirebaseText(e.target.value)}
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "projectId": "your-project-id",\n  "authDomain": "your-project.firebaseapp.com",\n  "storageBucket": "your-project.appspot.com",\n  "appId": "1:..."\n}`}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0f131a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#EAECF0',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                marginBottom: '10px'
              }}
            />
            {firebaseSaved && (
              <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px' }}>
                ✅ Firebase configuration saved! Connecting...
              </div>
            )}
            <button
              onClick={handleSaveFirebaseConfig}
              className="btn-primary"
              style={{ width: '100%', padding: '10px', fontWeight: '800' }}
            >
              Save Firebase Cloud Config
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '14px' }}>
              Export full tournament database to a backup file, or paste data from another device to import.
            </p>

            <button
              onClick={handleExportJson}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px',
                fontWeight: '800'
              }}
            >
              <Download size={16} /> Download Backup JSON ({stats.teams} teams, {stats.matches} matches)
            </button>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '4px' }}>
                Paste JSON to Import on this device:
              </label>
              <textarea
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='Paste backup JSON content here...'
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0f131a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#EAECF0',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  marginBottom: '10px'
                }}
              />
              {importSuccess && (
                <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px' }}>
                  {importSuccess}
                </div>
              )}
              <button
                onClick={handleManualImport}
                disabled={!importText.trim()}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '800'
                }}
              >
                <Upload size={16} /> Import Data to this Device
              </button>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid #334155', paddingTop: '14px', marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
