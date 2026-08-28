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

  const fetchMatchDetails = async () => {
    try {
      const [mRes, vRes] = await Promise.all([
        api.get(`/tournaments/matches/${id}/`),
        api.get(`/tournaments/var-incidents/?match=${id}`)
      ]);
      setMatch(mRes.data);
      setElapsedSeconds(mRes.data.timer_seconds_elapsed || 0);
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
            setElapsedSeconds(nextMatch.timer_seconds_elapsed || 0);
            return nextMatch;
          });
        }
        setWsConnected(true);
      },
      (err) => setWsConnected(false)
    );

    const pollInterval = setInterval(() => {
      api.get(`/tournaments/matches/${id}/`).then(mRes => {
        setMatch(prev => {
          if (!prev) return mRes.data;
          const updated = { ...mRes.data };
          if (!prev.is_timer_running && mRes.data.is_timer_running) {
            setElapsedSeconds(mRes.data.timer_seconds_elapsed || 0);
          } else if (Math.abs((prev.timer_seconds_elapsed || 0) - (mRes.data.timer_seconds_elapsed || 0)) > 3) {
            setElapsedSeconds(mRes.data.timer_seconds_elapsed || 0);
          }
          return updated;
        });
      }).catch(() => {});
    }, 1500);

    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, [id]);

  useEffect(() => {
    if (match) {
      setElapsedSeconds(match.timer_seconds_elapsed || 0);
    }
  }, [match?.timer_seconds_elapsed]);

  useEffect(() => {
    let timerInterval = null;
    if (match && match.is_timer_running) {
      timerInterval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [match?.is_timer_running]);

  const handleMatchUpdate = (updatedMatch) => {
    setMatch(updatedMatch);
    setElapsedSeconds(updatedMatch.timer_seconds_elapsed || 0);
  };

  if (loading) return <div style={{ padding: '40px', color: '#94a3b8', textAlign: 'center' }}>Loading match details...</div>;
  if (!match) return <div style={{ padding: '40px', color: '#f43f5e', textAlign: 'center' }}>Match record not found.</div>;

  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
  const matchEvents = match.recent_events || [];
  const goalEvents = matchEvents.filter(e => e.event_type === 'GOAL');

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
              {match.current_period}
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
            <Award size={18} color="#10b981" /> ⚽ Match Goal Scorers & Timeline
          </h3>

          {goalEvents.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#0f172a', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
              No goals recorded in this match yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {goalEvents.map((event, idx) => (
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
                    <span style={{ fontWeight: '900', color: '#10b981', fontSize: '1.1rem' }}>
                      ⚽ {event.match_minute}'
                    </span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#f8fafc' }}>
                        {event.player_name || 'Goal Scored'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {event.team_name}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    GOAL SCORED
                  </span>
                </div>
              ))}
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
