import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { HlsPlayer } from './HlsPlayer';
import { StatusBadge } from './StatusBadge';
import { ShieldAlert, Play, Pause, Rewind, FastForward, CheckCircle, XCircle, Film, RotateCcw, Maximize2 } from 'lucide-react';

export const VarOperatorStation = ({ match, incidents = [], onUpdate }) => {
  const [recordings, setRecordings] = useState([]);
  const [selectedMp4Url, setSelectedMp4Url] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);

  // Fetch recorded MP4 video files for this match
  const fetchRecordings = async () => {
    try {
      const res = await api.get(`/tournaments/matches/recordings/?match=${match.id}`);
      const recs = res.data.recordings || [];
      setRecordings(recs);
      if (recs.length > 0 && !selectedMp4Url) {
        setSelectedMp4Url(recs[recs.length - 1].url);
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
    }
  };

  useEffect(() => {
    if (match?.id) fetchRecordings();
  }, [match?.id]);

  useEffect(() => {
    if (selectedMp4Url && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [selectedMp4Url]);

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
    }
  };

  const resetZoom = () => {
    setZoomScale(1.0);
    setPanPos({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomScale > 1.0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomScale > 1.0) {
      setPanPos({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDecision = async (incidentId, decisionStatus) => {
    if (!incidentId) {
      alert('Please select an incident to resolve');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/tournaments/var-incidents/${incidentId}/`, {
        status: decisionStatus,
        review_notes: reviewNotes
      });

      await api.post(`/tournaments/matches/${match.id}/event/`, {
        event_type: 'VAR_DECISION',
        team_id: match.home_team,
        details: {
          incident_id: incidentId,
          decision: decisionStatus,
          review_notes: reviewNotes,
          operator_role: 'VAR_OPERATOR'
        }
      });

      alert(`VAR Decision recorded: ${decisionStatus}`);
      setSelectedIncident(null);
      setReviewNotes('');

      const mRes = await api.get(`/tournaments/matches/${match.id}/`);
      if (onUpdate) onUpdate(mRes.data);
    } catch (err) {
      alert('Error submitting VAR decision: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const streamHost = window.location.hostname || 'localhost';
  const matchCode = match?.match_code || (match?.match_number ? `match${match.match_number}` : 'match1');

  return (
    <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid #f43f5e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={22} color="#f43f5e" /> 3-Camera VAR Review & Digital Zoom Replay Station
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
            Live WebRTC feeds + Interactive Digital Zoom Magnifier (1x to 4x) for line calls & fouls.
          </p>
        </div>
      </div>

      {/* Dedicated Match Video Folder Info Box */}
      <div style={{ backgroundColor: '#0f172a', padding: '16px 20px', borderRadius: '10px', border: '1px solid #3b82f6', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📁 MATCH DEDICATED FOLDER: <code style={{ backgroundColor: '#1e293b', padding: '2px 8px', borderRadius: '4px', color: '#3b82f6' }}>./recordings/{matchCode}/</code>
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            All 3 camera video streams auto-record into this match folder
          </span>
        </div>

        <div className="responsive-grid-3" style={{ fontSize: '0.75rem' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
            <span style={{ color: '#f8fafc', fontWeight: '700', display: 'block' }}>📹 Cam 1 Common URL:</span>
            <code style={{ color: '#10b981', wordBreak: 'break-all', display: 'block', fontWeight: '800' }}>rtmp://{streamHost}:1935/live/cam1</code>
            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Set once in phone for ALL matches</span>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
            <span style={{ color: '#f8fafc', fontWeight: '700', display: 'block' }}>📹 Cam 2 Common URL:</span>
            <code style={{ color: '#10b981', wordBreak: 'break-all', display: 'block', fontWeight: '800' }}>rtmp://{streamHost}:1935/live/cam2</code>
            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Set once in phone for ALL matches</span>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
            <span style={{ color: '#f8fafc', fontWeight: '700', display: 'block' }}>📹 Cam 3 Common URL:</span>
            <code style={{ color: '#10b981', wordBreak: 'break-all', display: 'block', fontWeight: '800' }}>rtmp://{streamHost}:1935/live/cam3</code>
            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Set once in phone for ALL matches</span>
          </div>
        </div>
      </div>

      {/* 1. Live WebRTC 3-Camera Monitor */}
      <div className="responsive-grid-3" style={{ marginBottom: '24px' }}>
        <HlsPlayer src={`http://${streamHost}:8888/live/cam1/index.m3u8`} fallbackUrl={`http://${streamHost}:8888/${matchCode}/cam1/index.m3u8`} label="CAM 1 (Left Angle)" />
        <HlsPlayer src={`http://${streamHost}:8888/live/cam2/index.m3u8`} fallbackUrl={`http://${streamHost}:8888/${matchCode}/cam2/index.m3u8`} label="CAM 2 (Main Center)" />
        <HlsPlayer src={`http://${streamHost}:8888/live/cam3/index.m3u8`} fallbackUrl={`http://${streamHost}:8888/${matchCode}/cam3/index.m3u8`} label="CAM 3 (Right Angle)" />
      </div>

      {/* 2. Instant Replay, Rewind & Zoom Magnifier Console */}
      <div style={{ backgroundColor: '#090d16', padding: '20px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={18} color="#3b82f6" /> MP4 Replay & Digital Zoom Magnifier ({recordings.length} Recordings)
          </h3>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={fetchRecordings} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              🔄 Refresh Files
            </button>
            <select
              value={selectedMp4Url}
              onChange={e => setSelectedMp4Url(e.target.value)}
              style={{ padding: '8px 12px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
            >
              {recordings.map((r, idx) => (
                <option key={idx} value={r.url}>{r.rel_path.replace('.mp4.mp4', '.mp4')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Video Player Container */}
        {selectedMp4Url ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              ref={videoContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                overflow: 'hidden',
                borderRadius: '8px',
                backgroundColor: 'black',
                position: 'relative',
                maxHeight: '460px',
                cursor: zoomScale > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
            >
              <video
                ref={videoRef}
                src={selectedMp4Url}
                controls
                preload="metadata"
                muted
                playsInline
                style={{
                  width: '100%',
                  maxHeight: '460px',
                  display: 'block',
                  transform: `scale(${zoomScale}) translate(${panPos.x / zoomScale}px, ${panPos.y / zoomScale}px)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                }}
              />

              {/* Digital Zoom Overlay Badge */}
              {zoomScale > 1.0 && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(244, 63, 94, 0.95)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '900',
                  pointerEvents: 'none',
                  zIndex: 10,
                  boxShadow: '0 0 10px rgba(244, 63, 94, 0.5)'
                }}>
                  MAGNIFIED {Math.round(zoomScale * 100)}% (Click & Drag to Pan)
                </div>
              )}
            </div>

            {/* Controls Toolbar: Instant Rewind (-5s/-10s), Slow-Mo, and Zoom Magnifier */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155', flexWrap: 'wrap', gap: '12px' }}>
              {/* 1. Instant Rewind & Fast Forward Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleSeek(-10)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: '700' }}>
                  <Rewind size={16} /> -10s Rewind
                </button>
                <button onClick={() => handleSeek(-5)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: '700' }}>
                  <RotateCcw size={16} /> -5s Rewind
                </button>
                <button onClick={() => handleSeek(5)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: '700' }}>
                  +5s
                </button>
                <button onClick={() => handleSeek(10)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: '700' }}>
                  <FastForward size={16} /> +10s
                </button>
              </div>

              {/* 2. Digital Zoom Magnifier Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#f43f5e', marginRight: '4px' }}>🔍 ZOOM MAGNIFIER:</span>
                {[1.0, 1.5, 2.0, 3.0, 4.0].map(z => (
                  <button
                    key={z}
                    onClick={() => { setZoomScale(z); if (z === 1.0) setPanPos({ x: 0, y: 0 }); }}
                    className={zoomScale === z ? 'btn-danger' : 'btn-secondary'}
                    style={{ padding: '4px 10px', fontSize: '0.8rem', fontWeight: '800' }}
                  >
                    {z}x
                  </button>
                ))}
                {zoomScale > 1.0 && (
                  <button onClick={resetZoom} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <Maximize2 size={12} /> Reset
                  </button>
                )}
              </div>

              {/* 3. Slow Motion Speed Controls */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0.25, 0.5, 1.0].map(rate => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={playbackRate === rate ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '800' }}
                  >
                    {rate === 0.25 ? '0.25x Super Slow' : rate === 0.5 ? '0.5x Slow' : '1.0x Realtime'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
            No recorded MP4 files found. Streams auto-record as soon as camera publishes.
          </div>
        )}
      </div>

      {/* 3. VAR Incident List & Decision Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
        {/* Incident Queue */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px', color: '#f8fafc' }}>
            Pending Incident Queue ({incidents.filter(i => i.status === 'PENDING' || i.status === 'UNDER_REVIEW').length})
          </h3>

          {incidents.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: '#0f172a', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
              No VAR incidents flagged for review.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {incidents.map(inc => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  style={{
                    padding: '12px',
                    backgroundColor: selectedIncident?.id === inc.id ? 'rgba(244, 63, 94, 0.15)' : '#0f172a',
                    border: `1px solid ${selectedIncident?.id === inc.id ? '#f43f5e' : '#334155'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f8fafc' }}>{inc.event_type}</div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Timestamp: {Math.floor(inc.timestamp_seconds / 60)}m {inc.timestamp_seconds % 60}s
                    </span>
                  </div>
                  <StatusBadge status={inc.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decision Submission Panel */}
        <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px', color: '#f8fafc' }}>
            Render VAR Referee Decision
          </h3>

          {selectedIncident ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Selected: <strong style={{ color: '#f43f5e' }}>{selectedIncident.event_type}</strong> (at {Math.floor(selectedIncident.timestamp_seconds / 60)}m {selectedIncident.timestamp_seconds % 60}s)
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Review Notes / Justification</label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="e.g. Offside confirmed after 3-angle slow-mo review..."
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => handleDecision(selectedIncident.id, 'CONFIRMED')}
                  disabled={submitting}
                  className="btn-success"
                  style={{ padding: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle size={16} /> Confirm Original Call
                </button>

                <button
                  onClick={() => handleDecision(selectedIncident.id, 'OVERTURNED')}
                  disabled={submitting}
                  className="btn-danger"
                  style={{ padding: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  <XCircle size={16} /> Overturn Decision
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              Select a pending incident from the queue on the left to review and render decision.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
