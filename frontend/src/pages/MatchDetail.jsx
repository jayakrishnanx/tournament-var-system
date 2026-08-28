import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { connectMatchWebSocket } from '../services/websocket';
import { StatusBadge } from '../components/StatusBadge';
import { ScorerConsole } from '../components/ScorerConsole';
import { VarOperatorStation } from '../components/VarOperatorStation';
import { Play, Pause, Plus, Minus, ArrowLeft, Radio, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MatchDetail = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [varIncidents, setVarIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const { user } = useAuth();

  // Active Real-Time Match Clock Ticker State for Scoreboard Header
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

    return () => {
      ws.close();
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

  if (loading) return <div style={{ padding: '40px', color: '#94a3b8', textAlign: 'center' }}>Loading Master Admin Console...</div>;
  if (!match) return <div style={{ padding: '40px', color: '#f43f5e', textAlign: 'center' }}>Match record not found.</div>;

  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/matches" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: '700' }}>
          <ArrowLeft size={16} /> Back to Matches List
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: wsConnected ? '#10b981' : '#94a3b8' }}>
          <Radio size={14} className={wsConnected ? 'animate-pulse' : ''} />
          <span>{wsConnected ? 'LIVE WEBSOCKET SYNC ACTIVE' : 'RECONNECTING WEBSOCKET...'}</span>
        </div>
      </div>

      {/* Main Scoreboard Header */}
      <div className="glass-panel" style={{
        padding: '28px',
        marginBottom: '32px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <StatusBadge status={match.status} />
            <span style={{ backgroundColor: '#0f172a', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', border: '1px solid #334155' }}>
              {match.current_period}
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Tournament Match #{match.id}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '32px', textAlign: 'center' }}>
          {/* Home Team */}
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#f8fafc' }}>{match.home_team_details?.name}</h2>
          </div>

          {/* Master Score Display & Active Clock */}
          <div>
            <div className="digital-score" style={{
              backgroundColor: '#090d16',
              padding: '16px 40px',
              borderRadius: '16px',
              border: '2px solid #3b82f6',
              boxShadow: '0 0 25px rgba(59, 130, 246, 0.25)'
            }}>
              {match.home_score} : {match.away_score}
            </div>
            <div style={{ marginTop: '12px', fontSize: '1.75rem', fontWeight: '900', fontFamily: 'monospace', color: match.is_timer_running ? '#10b981' : '#f8fafc' }}>
              {minutes}:{seconds}
            </div>
          </div>

          {/* Away Team */}
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#f8fafc' }}>{match.away_team_details?.name}</h2>
          </div>
        </div>
      </div>

      {/* 1. Master Scorer Controls (Score +1/-1, Clock Start/Pause, Event Logger) */}
      <div style={{ marginBottom: '32px' }}>
        <ScorerConsole match={match} onUpdate={handleMatchUpdate} />
      </div>

      {/* 2. 3-Camera VAR Station (Live WebRTC, MP4 Replay, Rewind & 4x Zoom Magnifier) */}
      <div>
        <VarOperatorStation match={match} incidents={varIncidents} onUpdate={fetchMatchDetails} />
      </div>
    </div>
  );
};
