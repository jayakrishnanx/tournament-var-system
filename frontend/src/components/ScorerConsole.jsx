import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Play, Pause, Plus, Minus, RotateCcw, Flag, Clock, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ScorerConsole = ({ match, onUpdate }) => {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState(match.home_team);
  const [eventType, setEventType] = useState('GOAL');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [loading, setLoading] = useState(false);

  // States for updating recorded events
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventType, setEditEventType] = useState('GOAL');
  const [editSelectedTeam, setEditSelectedTeam] = useState('');
  const [editSelectedPlayer, setEditSelectedPlayer] = useState('');
  const [editMinute, setEditMinute] = useState(0);
  const [editSecond, setEditSecond] = useState(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(match.computed_elapsed_seconds || match.timer_seconds_elapsed || 0);

  useEffect(() => {
    setElapsedSeconds(match.computed_elapsed_seconds || match.timer_seconds_elapsed || 0);
  }, [match.computed_elapsed_seconds, match.timer_seconds_elapsed]);

  useEffect(() => {
    let timerInterval = null;
    if (match.is_timer_running) {
      timerInterval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [match.is_timer_running]);

  if (user?.role !== 'ADMIN') {
    return null;
  }

  const homePlayers = match.home_team_details?.players || [];
  const awayPlayers = match.away_team_details?.players || [];
  const currentPlayers = selectedTeam === match.home_team ? homePlayers : awayPlayers;

  const handleScoreUpdate = async (teamId, delta) => {
    setLoading(true);
    try {
      const res = await api.post(`/tournaments/matches/${match.id}/score/`, {
        team_id: teamId,
        delta: delta
      });
      if (onUpdate) onUpdate(res.data);
    } catch (err) {
      alert('Error updating score: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTimerToggle = async (action) => {
    setLoading(true);
    try {
      const res = await api.post(`/tournaments/matches/${match.id}/timer/`, { action });
      if (onUpdate) onUpdate(res.data);
    } catch (err) {
      alert('Error toggling timer: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetTimer = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/tournaments/matches/${match.id}/timer/`, { action: 'RESET' });
      setElapsedSeconds(0);
      if (onUpdate) onUpdate(res.data);
      alert('🔄 Match timer and score reset to 0.');
    } catch (err) {
      alert('Error resetting timer: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRecordEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/tournaments/matches/${match.id}/event/`, {
        event_type: eventType,
        team_id: selectedTeam,
        player_id: selectedPlayer || null,
        details: { logged_by: 'Scorer Official Console' }
      });
      const mRes = await api.get(`/tournaments/matches/${match.id}/`);
      if (onUpdate) onUpdate(mRes.data);
    } catch (err) {
      alert('Error recording event: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const startEditEvent = (ev) => {
    setEditingEventId(ev.id);
    setEditEventType(ev.event_type);
    setEditSelectedTeam(ev.team || '');
    setEditSelectedPlayer(ev.player || '');
    setEditMinute(ev.match_minute);
    setEditSecond(ev.match_second || 0);
  };

  const handleUpdateEvent = async (eventId) => {
    setLoading(true);
    try {
      await api.patch(`/tournaments/events/${eventId}/`, {
        event_type: editEventType,
        team: editSelectedTeam || null,
        player: editSelectedPlayer || null,
        match_minute: parseInt(editMinute) || 0,
        match_second: parseInt(editSecond) || 0
      });
      setEditingEventId(null);
      const mRes = await api.get(`/tournaments/matches/${match.id}/`);
      if (onUpdate) onUpdate(mRes.data);
      alert('Event updated successfully!');
    } catch (err) {
      alert('Error updating event: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event? This will update scores automatically!')) {
      setLoading(true);
      try {
        await api.delete(`/tournaments/events/${eventId}/`);
        const mRes = await api.get(`/tournaments/matches/${match.id}/`);
        if (onUpdate) onUpdate(mRes.data);
        alert('Event deleted successfully!');
      } catch (err) {
        alert('Error deleting event: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* 1. MATCH CLOCK CONTROLS (PLACED AT VERY TOP FOR 1-TOUCH ACCESSIBILITY) */}
      <div className="glass-panel" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={16} color="#10b981" />
            <div>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', fontWeight: '800', letterSpacing: '0.05em' }}>
                MATCH CLOCK {match.is_timer_running ? '🟢 RUNNING' : '🔴 PAUSED'}
              </span>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', fontFamily: 'monospace', color: match.is_timer_running ? '#10b981' : '#f8fafc', lineHeight: 1 }}>
                {minutes}:{seconds}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {match.is_timer_running ? (
              <button
                onClick={() => handleTimerToggle('PAUSE')}
                disabled={loading}
                className="btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800' }}
              >
                <Pause size={14} /> Pause
              </button>
            ) : (
              <button
                onClick={() => handleTimerToggle('START')}
                disabled={loading}
                className="btn-success"
                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800' }}
              >
                <Play size={14} /> Start Clock
              </button>
            )}

            {match.status !== 'ENDED' && (
              <button
                onClick={() => handleTimerToggle('FINISH')}
                disabled={loading}
                style={{
                  backgroundColor: '#2B5748',
                  color: '#EAECF0',
                  fontWeight: '900',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #2B5748',
                  touchAction: 'manipulation'
                }}
              >
                🏁 Finish Match
              </button>
            )}

            <button
              onClick={handleResetTimer}
              disabled={loading}
              className="btn-secondary"
              title="Reset Clock & Score"
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', touchAction: 'manipulation' }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* 2. RAPID SCORE ADJUST BUTTONS (SIDE-BY-SIDE IN 1 ROW ON MOBILE) */}
      <div className="glass-panel" style={{ padding: '12px 14px' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ⚡ Rapid Score Adjust
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* Home Team */}
          <div style={{ backgroundColor: '#1D2128', padding: '10px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {match.home_team_details?.name}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#3b82f6', margin: '2px 0' }}>
              {match.home_score}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleScoreUpdate(match.home_team, 1)}
                disabled={loading}
                className="btn-success"
                style={{ flex: 2, padding: '6px 4px', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', fontWeight: '800' }}
              >
                <Plus size={14} /> +1 Goal
              </button>
              <button
                onClick={() => handleScoreUpdate(match.home_team, -1)}
                disabled={loading}
                className="btn-secondary"
                style={{ flex: 1, padding: '6px 4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <Minus size={14} />
              </button>
            </div>
          </div>

          {/* Away Team */}
          <div style={{ backgroundColor: '#1D2128', padding: '10px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {match.away_team_details?.name}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#3b82f6', margin: '2px 0' }}>
              {match.away_score}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleScoreUpdate(match.away_team, 1)}
                disabled={loading}
                className="btn-success"
                style={{ flex: 2, padding: '6px 4px', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', fontWeight: '800' }}
              >
                <Plus size={14} /> +1 Goal
              </button>
              <button
                onClick={() => handleScoreUpdate(match.away_team, -1)}
                disabled={loading}
                className="btn-secondary"
                style={{ flex: 1, padding: '6px 4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <Minus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EVENT RECORDER (CARDS & FOULS) */}
      <div className="glass-panel" style={{ padding: '12px 14px' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📋 Record Card / Event
        </h4>

        <form onSubmit={handleRecordEvent} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <select
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              style={{ padding: '6px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
            >
              <option value={match.home_team}>{match.home_team_details?.name}</option>
              <option value={match.away_team}>{match.away_team_details?.name}</option>
            </select>

            <select
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              style={{ padding: '6px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
            >
              <option value="GOAL">⚽ Goal</option>
              <option value="YELLOW_CARD">🟨 Yellow Card</option>
              <option value="RED_CARD">🟥 Red Card</option>
              <option value="SUBSTITUTION">🔄 Substitution</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <select
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
              style={{ flex: 1, padding: '6px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
            >
              <option value="">Select Player (Optional)</option>
              {currentPlayers.map(p => (
                <option key={p.id} value={p.id}>#{p.jersey_number} {p.name}</option>
              ))}
            </select>

            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '800' }}>
              Log Event
            </button>
          </div>
        </form>
      </div>

      {/* 4. Match Events & Cards Timeline Feed */}
      <div className="glass-panel" style={{ padding: '12px 14px' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📋 Recorded Match Events ({match.recent_events?.length || 0})
        </h4>

        {(!match.recent_events || match.recent_events.length === 0) ? (
          <div style={{ padding: '10px', color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', backgroundColor: '#1D2128', borderRadius: '6px' }}>
            No match events or cards recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {match.recent_events.map((ev, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                backgroundColor: '#1D2128',
                borderRadius: '8px',
                border: '1px solid #334155'
              }}>
                {editingEventId === ev.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px', fontWeight: '800' }}>TEAM</label>
                        <select
                          value={editSelectedTeam}
                          onChange={e => {
                            setEditSelectedTeam(e.target.value);
                            setEditSelectedPlayer('');
                          }}
                          style={{ width: '100%', padding: '6px', backgroundColor: '#181818', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
                        >
                          <option value="">No Team</option>
                          <option value={match.home_team}>{match.home_team_details?.name}</option>
                          <option value={match.away_team}>{match.away_team_details?.name}</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px', fontWeight: '800' }}>EVENT TYPE</label>
                        <select
                          value={editEventType}
                          onChange={e => setEditEventType(e.target.value)}
                          style={{ width: '100%', padding: '6px', backgroundColor: '#181818', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
                        >
                          <option value="GOAL">⚽ Goal</option>
                          <option value="YELLOW_CARD">🟨 Yellow Card</option>
                          <option value="RED_CARD">🟥 Red Card</option>
                          <option value="SUBSTITUTION">🔄 Substitution</option>
                          <option value="FOUL">📋 Foul</option>
                          <option value="VAR_DECISION">🖥️ VAR Decision</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '6px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px', fontWeight: '800' }}>PLAYER</label>
                        <select
                          value={editSelectedPlayer}
                          onChange={e => setEditSelectedPlayer(e.target.value)}
                          style={{ width: '100%', padding: '6px', backgroundColor: '#181818', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
                        >
                          <option value="">Select Player (Optional)</option>
                          {(editSelectedTeam === match.home_team ? homePlayers : awayPlayers).map(p => (
                            <option key={p.id} value={p.id}>#{p.jersey_number} {p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px', fontWeight: '800' }}>TIME (MIN:SEC)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <input
                            type="number"
                            value={editMinute}
                            onChange={e => setEditMinute(e.target.value)}
                            style={{ width: '100%', padding: '5px', backgroundColor: '#181818', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.75rem', textAlign: 'center' }}
                            placeholder="Min"
                          />
                          <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>:</span>
                          <input
                            type="number"
                            value={editSecond}
                            onChange={e => setEditSecond(e.target.value)}
                            style={{ width: '100%', padding: '5px', backgroundColor: '#181818', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.75rem', textAlign: 'center' }}
                            placeholder="Sec"
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button type="button" onClick={() => handleUpdateEvent(ev.id)} className="btn-success" style={{ flex: 1, padding: '5px', fontSize: '0.75rem', fontWeight: '800' }}>
                        💾 Save Changes
                      </button>
                      <button type="button" onClick={() => setEditingEventId(null)} className="btn-secondary" style={{ flex: 1, padding: '5px', fontSize: '0.75rem' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', color: '#3b82f6', fontSize: '0.75rem' }}>
                        {ev.event_type === 'GOAL' ? '⚽' : ev.event_type === 'YELLOW_CARD' ? '🟨' : ev.event_type === 'RED_CARD' ? '🟥' : '🔄'} {ev.match_minute}:{String(ev.match_second || 0).padStart(2, '0')}
                      </span>
                      <div>
                        <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.75rem' }}>
                          {ev.player_name || ev.event_type.replace('_', ' ')}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', marginLeft: '6px' }}>
                          ({ev.team_name || 'No Team'})
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => startEditEvent(ev)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '800', padding: '2px 4px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '800', padding: '2px 4px' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
