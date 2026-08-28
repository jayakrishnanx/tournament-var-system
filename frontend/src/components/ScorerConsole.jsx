import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Play, Pause, Plus, Minus, RotateCcw, Award, Flag, Clock } from 'lucide-react';

export const ScorerConsole = ({ match, onUpdate }) => {
  const [selectedTeam, setSelectedTeam] = useState(match.home_team);
  const [eventType, setEventType] = useState('GOAL');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [loading, setLoading] = useState(false);

  // Active Real-Time Match Clock Ticker State
  const [elapsedSeconds, setElapsedSeconds] = useState(match.timer_seconds_elapsed || 0);

  useEffect(() => {
    setElapsedSeconds(match.timer_seconds_elapsed || 0);
  }, [match.timer_seconds_elapsed]);

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
    if (window.confirm('Reset match clock back to 00:00?')) {
      setLoading(true);
      try {
        const res = await api.post(`/tournaments/matches/${match.id}/timer/`, { action: 'RESET' });
        setElapsedSeconds(0);
        if (onUpdate) onUpdate(res.data);
      } catch (err) {
        alert('Error resetting timer: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
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

  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Rapid Score Touch Controls */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} color="#10b981" /> Official Scorer Dashboard - Rapid Score Adjust
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Home Team Score Controls */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#f8fafc', marginBottom: '4px' }}>
              {match.home_team_details?.name}
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#3b82f6', marginBottom: '16px' }}>
              {match.home_score}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleScoreUpdate(match.home_team, 1)}
                disabled={loading}
                className="btn-success"
                style={{ flex: 2, padding: '12px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={18} /> +1 Goal
              </button>
              <button
                onClick={() => handleScoreUpdate(match.home_team, -1)}
                disabled={loading}
                className="btn-secondary"
                style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <Minus size={18} />
              </button>
            </div>
          </div>

          {/* Away Team Score Controls */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#f8fafc', marginBottom: '4px' }}>
              {match.away_team_details?.name}
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#3b82f6', marginBottom: '16px' }}>
              {match.away_score}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleScoreUpdate(match.away_team, 1)}
                disabled={loading}
                className="btn-success"
                style={{ flex: 2, padding: '12px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={18} /> +1 Goal
              </button>
              <button
                onClick={() => handleScoreUpdate(match.away_team, -1)}
                disabled={loading}
                className="btn-secondary"
                style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <Minus size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Match Clock & Period Manager */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#10b981" /> Official Real-Time Match Clock & Period Control
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '20px 28px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', fontWeight: '700' }}>
              MATCH CLOCK {match.is_timer_running ? '🟢 [RUNNING]' : '🔴 [PAUSED]'}
            </span>
            <span style={{ fontSize: '2.75rem', fontWeight: '900', fontFamily: 'monospace', color: match.is_timer_running ? '#10b981' : '#f8fafc' }}>
              {minutes}:{seconds}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {match.is_timer_running ? (
              <button
                onClick={() => handleTimerToggle('PAUSE')}
                disabled={loading}
                className="btn-danger"
                style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Pause size={20} /> Pause Clock
              </button>
            ) : (
              <button
                onClick={() => handleTimerToggle('START')}
                disabled={loading}
                className="btn-success"
                style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Play size={20} /> Start / Resume Clock
              </button>
            )}

            <button
              onClick={handleResetTimer}
              disabled={loading}
              className="btn-secondary"
              title="Reset Clock to 00:00"
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={18} /> Reset 00:00
            </button>
          </div>
        </div>
      </div>

      {/* 3. Event Logger (Cards, Fouls, Subs) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flag size={18} color="#f59e0b" /> Match Event Recorder
        </h3>

        <form onSubmit={handleRecordEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Select Team</label>
            <select
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
            >
              <option value={match.home_team}>{match.home_team_details?.name}</option>
              <option value={match.away_team}>{match.away_team_details?.name}</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Event Type</label>
            <select
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
            >
              <option value="GOAL">⚽ Goal Scored</option>
              <option value="YELLOW_CARD">🟨 Yellow Card</option>
              <option value="RED_CARD">🟥 Red Card</option>
              <option value="FOUL">⚠️ Foul</option>
              <option value="SUBSTITUTION">🔄 Substitution</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Player (Optional)</label>
            <select
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
            >
              <option value="">Select Player</option>
              {currentPlayers.map(p => (
                <option key={p.id} value={p.id}>#{p.jersey_number} {p.name} ({p.position})</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 18px' }}>
            Record Event
          </button>
        </form>
      </div>

      {/* 4. Live Match Event Timeline Feed */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px' }}>
          Recent Event Timeline ({match.recent_events?.length || 0})
        </h3>

        {(!match.recent_events || match.recent_events.length === 0) ? (
          <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
            No events recorded yet for this match.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {match.recent_events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <div>
                  <span style={{ fontWeight: '800', color: '#3b82f6', marginRight: '10px' }}>[{ev.match_minute}']</span>
                  <span style={{ fontWeight: '700', color: 'white' }}>{ev.event_type.replace('_', ' ')}</span>
                  {ev.team_name && <span style={{ color: '#94a3b8', marginLeft: '8px' }}>- {ev.team_name}</span>}
                  {ev.player_name && <span style={{ color: '#10b981', marginLeft: '8px' }}>({ev.player_name})</span>}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(ev.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
