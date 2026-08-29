import React, { useState, useEffect } from 'react';
import { Video, Play, Square, Check, ExternalLink, Link as LinkIcon, Radio } from 'lucide-react';
import api from '../services/api';
import { parseEmbedUrl } from './LiveStreamEmbedPlayer';

export const AdminStreamManager = ({ match, onUpdate }) => {
  const [streamUrl, setStreamUrl] = useState(match?.stream_url || '');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (match?.stream_url !== undefined) {
      setStreamUrl(match.stream_url || '');
    }
  }, [match?.stream_url]);

  const handleSaveStream = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const updated = await api.patch(`/tournaments/matches/${match.id}/`, {
        stream_url: streamUrl.trim(),
        is_live_streaming: Boolean(streamUrl.trim())
      });
      if (onUpdate) onUpdate(updated.data);
      setSuccessMsg('✅ Live stream broadcast link updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Error updating live stream: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleClearStream = async () => {
    if (!window.confirm('Are you sure you want to turn off this live stream?')) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/tournaments/matches/${match.id}/`, {
        stream_url: '',
        is_live_streaming: false
      });
      setStreamUrl('');
      if (onUpdate) onUpdate(updated.data);
      setSuccessMsg('⏹️ Live stream removed.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Error clearing stream: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const parsed = parseEmbedUrl(streamUrl);
  const isStreamActive = Boolean(match?.stream_url);

  return (
    <div className="glass-panel" style={{
      padding: '18px 20px',
      marginBottom: '20px',
      border: isStreamActive ? '2px solid #ef4444' : '1px solid #334155',
      borderRadius: '12px',
      backgroundColor: '#131720',
      boxShadow: isStreamActive ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={20} color={isStreamActive ? '#ef4444' : '#10b981'} className={isStreamActive ? 'animate-pulse' : ''} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
              📹 MATCH LIVE STREAM BROADCASTER (YOUTUBE / TWITCH)
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Stream from your phone via YouTube Live or Twitch — all spectators watch inside the website scoreboard!
            </span>
          </div>
        </div>

        {isStreamActive && (
          <span style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: '900',
            padding: '4px 10px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            ● BROADCAST ACTIVE
          </span>
        )}
      </div>

      <form onSubmit={handleSaveStream} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '700', marginBottom: '6px' }}>
            YouTube Live Link or Twitch URL:
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="e.g. https://www.youtube.com/live/xxxx or https://youtu.be/xxxx"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '10px 14px',
                backgroundColor: '#1D2128',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.88rem'
              }}
            />
            <button
              type="submit"
              disabled={saving || !streamUrl.trim()}
              className="btn-primary"
              style={{
                padding: '10px 18px',
                fontSize: '0.85rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ef4444',
                borderColor: '#ef4444'
              }}
            >
              <Play size={16} /> {saving ? 'Saving...' : 'Set Live Stream'}
            </button>
            {isStreamActive && (
              <button
                type="button"
                onClick={handleClearStream}
                className="btn-secondary"
                style={{
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}
              >
                <Square size={14} /> End Stream
              </button>
            )}
          </div>
        </div>

        {parsed && (
          <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} /> Valid {parsed.type.toUpperCase()} stream detected!
          </div>
        )}

        {successMsg && (
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '800' }}>
            {successMsg}
          </div>
        )}
      </form>
    </div>
  );
};

export default AdminStreamManager;
