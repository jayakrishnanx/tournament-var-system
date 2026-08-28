import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { connectMatchWebSocket } from '../services/websocket';
import { StatusBadge } from '../components/StatusBadge';
import { ScorerConsole } from '../components/ScorerConsole';
import { VarOperatorStation } from '../components/VarOperatorStation';
import { ArrowLeft, Radio, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MatchDetail = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [varIncidents, setVarIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const { user } = useAuth();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const getCalculatedSeconds = (m) => {
    if (!m) return 0;
    if (typeof m.computed_elapsed_seconds === 'number') {
      return m.computed_elapsed_seconds;
    }
    let base = m.timer_seconds_elapsed || 0;
    if (m.is_timer_running && m.timer_last_updated_at) {
      let lastStr = m.timer_last_updated_at;
      if (typeof lastStr === 'string' && !lastStr.endsWith('Z') && !lastStr.includes('+')) {
        lastStr += 'Z';
      }
      const last = new Date(lastStr).getTime();
      const now = Date.now();
      if (!isNaN(last) && now > last) {
        const diff = Math.floor((now - last) / 1000);
        return base + diff;
      }
    }
    return base;
  };

  const fetchMatchDetails = async () => {
    try {
      const [mRes, vRes] = await Promise.all([
        api.get(`/tournaments/matches/${id}/`),
        api.get(`/tournaments/var-incidents/?match=${id}`)
      ]);
      setMatch(mRes.data);
      setElapsedSeconds(getCalculatedSeconds(mRes.data));
      setVarIncidents(vRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();

    const ws = connectMatchWebSocket(
      id,
      (data) => {
        if (data.type === 'match_update') {
          setMatch(prev => {
            const nextMatch = prev ? ({ ...prev, ...data.match }) : data.match;
            setElapsedSeconds(getCalculatedSeconds(nextMatch));
            return nextMatch;
          });
        }
        setWsConnected(true);
      },
      (err) => setWsConnected(false)
    );

    const pollInterval = setInterval(() => {
      api.get(`/tournaments/matches/${id}/`).then(mRes => {
        setMatch(mRes.data);
        setElapsedSeconds(getCalculatedSeconds(mRes.data));
      }).catch(() => {});
    }, 1500);

    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, [id]);

  useEffect(() => {
    setElapsedSeconds(getCalculatedSeconds(match));
    const timerInterval = setInterval(() => {
      setElapsedSeconds(getCalculatedSeconds(match));
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [match]);

  const handleMatchUpdate = (updatedMatch) => {
    setMatch(updatedMatch);
    setElapsedSeconds(getCalculatedSeconds(updatedMatch));
  };

  const renderEventIcon = (type) => {
    switch (type) {
      case 'GOAL': return '⚽';
      case 'YELLOW_CARD': return '🟨';
      case 'RED_CARD': return '🟥';
      case 'SUBSTITUTION': return '🔄';
      default: return '📋';
    }
  };

  const renderEventLabel = (type) => {
    switch (type) {
      case 'GOAL': return { text: 'GOAL SCORED', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' };
      case 'YELLOW_CARD': return { text: 'YELLOW CARD', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' };
      case 'RED_CARD': return { text: 'RED CARD', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' };
      case 'SUBSTITUTION': return { text: 'SUBSTITUTION', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)' };
      default: return { text: type, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)' };
    }
  };

  if (loading) return <div style={{ padding: '40px', color: '#94a3b8', textAlign: 'center' }}>Loading match details...</div>;
  if (!match) return <div style={{ padding: '40px', color: '#f43f5e', textAlign: 'center' }}>Match record not found.</div>;

  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
  const matchEvents = match.recent_events || [];

  return (
    <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontWeight: '700', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} /> Back to Live Matches
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: wsConnected ? '#10b981' : '#94a3b8' }}>
          <Radio size={12} className={wsConnected ? 'animate-pulse' : ''} />
          <span>{wsConnected ? 'LIVE SCORE SYNC ACTIVE' : 'RECONNECTING...'}</span>
        </div>
      </div>

      {/* Main Scoreboard Header */}
      <div className="glass-panel" style={{
        padding: '16px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <StatusBadge status={match.status} />
            <span style={{ backgroundColor: '#0f172a', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', border: '1px solid #334155' }}>
              {elapsedSeconds >= 300 ? '2nd Half' : (match.current_period === '1ST_HALF' ? '1st Half' : match.current_period)}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Match #{match.match_number || match.match_code}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', gap: '6px', width: '100%' }}>
          {/* Home Team (Left Side) */}
          <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc', lineHeight: 1.2 }}>
              {match.home_team_details?.name}
            </h2>
          </div>

          {/* Master Score Display & Active Clock (Center) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div className="digital-score" style={{
              backgroundColor: '#090d16',
              padding: '6px 14px',
              borderRadius: '10px',
              border: '2px solid #3b82f6',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
              fontSize: '1.6rem',
              fontWeight: '900'
            }}>
              {match.home_score} : {match.away_score}
            </div>
            <div style={{ marginTop: '4px', fontSize: '1rem', fontWeight: '900', fontFamily: 'monospace', color: match.is_timer_running ? '#10b981' : '#f8fafc' }}>
              {minutes}:{seconds}
            </div>
          </div>

          {/* Away Team (Right Side) */}
          <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc', lineHeight: 1.2 }}>
              {match.away_team_details?.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Conditional Rendering: User View (Goal Scorers & Timeline) vs Admin View (Scorer & VAR Station) */}
      {user?.role !== 'ADMIN' ? (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
            <Award size={18} color="#3b82f6" /> 📋 Live Match Events & Cards Timeline
          </h3>

          {matchEvents.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#0f172a', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
              No match events or cards recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matchEvents.map((event, idx) => {
                const badge = renderEventLabel(event.event_type);
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '900', fontSize: '1.1rem' }}>
                        {renderEventIcon(event.event_type)} {event.match_minute}'
                      </span>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#f8fafc' }}>
                          {event.player_name || 'Match Event'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {event.team_name}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: badge.color, backgroundColor: badge.bg, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${badge.border}` }}>
                      {badge.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '24px' }}>
            <ScorerConsole match={match} onUpdate={handleMatchUpdate} />
          </div>
          <div>
            <VarOperatorStation match={match} incidents={varIncidents} onUpdate={fetchMatchDetails} />
          </div>
        </>
      )}
    </div>
  );
};
