import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { connectMatchWebSocket } from '../services/websocket';
import { StatusBadge } from '../components/StatusBadge';
import { ScorerConsole } from '../components/ScorerConsole';
import { LiveStreamBroadcaster } from '../components/LiveStreamBroadcaster';
import { LiveStreamViewer } from '../components/LiveStreamViewer';
import { LiveStreamEmbedPlayer } from '../components/LiveStreamEmbedPlayer';
import { AdminStreamManager } from '../components/AdminStreamManager';
import { calculateMatchElapsed } from '../services/firebaseService';
import { ArrowLeft, Radio, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MatchDetail = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const { user } = useAuth();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchMatchDetails = async () => {
    try {
      const mRes = await api.get(`/tournaments/matches/${id}/`);
      setMatch(mRes.data);
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
          setMatch(prev => prev ? ({ ...prev, ...data.match }) : data.match);
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
    const updateTimer = () => {
      if (match) {
        setElapsedSeconds(calculateMatchElapsed(match));
      }
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [match]);

  const handleMatchUpdate = (updatedMatch) => {
    setMatch(updatedMatch);
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
  const clockFormatted = `${minutes}:${seconds}`;
  const matchEvents = match.recent_events || [];
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <Link to={isAdmin ? "/matches" : "/"} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontWeight: '800', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> {isAdmin ? 'Back to Matches' : 'Back to Live Scoreboard'}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: wsConnected ? '#10b981' : '#94a3b8', fontWeight: '700' }}>
          <Radio size={14} className={wsConnected ? 'animate-pulse' : ''} />
          <span>{wsConnected ? 'LIVE CLOUD SYNC ACTIVE' : 'CONNECTING...'}</span>
        </div>
      </div>

      {/* 1. ADMIN LIVE BROADCASTER (CAMERA STREAM) */}
      {isAdmin && (
        <LiveStreamBroadcaster
          matchId={id}
          homeTeam={match.home_team_details?.name}
          awayTeam={match.away_team_details?.name}
          score={`${match.home_score} - ${match.away_score}`}
        />
      )}

      {/* 2. SPECTATOR LIVE STREAM VIEWER */}
      {!isAdmin && (
        match.stream_url ? (
          <LiveStreamEmbedPlayer
            streamUrl={match.stream_url}
            homeTeam={match.home_team_details?.name}
            awayTeam={match.away_team_details?.name}
            homeScore={match.home_score}
            awayScore={match.away_score}
            clockTime={clockFormatted}
            matchStatus={match.status}
          />
        ) : (
          <LiveStreamViewer
            matchId={id}
            homeTeam={match.home_team_details?.name}
            awayTeam={match.away_team_details?.name}
            homeScore={match.home_score}
            awayScore={match.away_score}
            clockTime={clockFormatted}
            matchStatus={match.status}
          />
        )
      )}

      {/* 3. Main Scoreboard Header */}
      <div className="glass-panel" style={{
        padding: '16px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <StatusBadge status={match.status} />
            <span style={{ backgroundColor: '#1D2128', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', border: '1px solid #334155' }}>
              {elapsedSeconds >= 300 ? '2nd Half' : (match.current_period === '1ST_HALF' ? '1st Half' : match.current_period)}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>
            Match #{match.match_number || match.match_code}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', gap: '6px', width: '100%' }}>
          {/* Home Team (Left Side) */}
          <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#f8fafc', lineHeight: 1.2 }}>
              {match.home_team_details?.name}
            </h2>
          </div>

          {/* Master Score Display & Active Clock (Center) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div className="digital-score" style={{
              backgroundColor: '#090d16',
              padding: '6px 16px',
              borderRadius: '10px',
              border: '2px solid #3b82f6',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
              fontSize: '1.8rem',
              fontWeight: '900'
            }}>
              {match.home_score} : {match.away_score}
            </div>
            <div style={{ marginTop: '4px', fontSize: '1rem', fontWeight: '900', fontFamily: 'monospace', color: match.is_timer_running ? '#10b981' : '#f8fafc' }}>
              {clockFormatted}
            </div>
          </div>

          {/* Away Team (Right Side) */}
          <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#f8fafc', lineHeight: 1.2 }}>
              {match.away_team_details?.name}
            </h2>
          </div>
        </div>
      </div>

      {/* 4. Controls: Admin Scorer Console vs Spectator Timeline */}
      {isAdmin ? (
        <div style={{ marginBottom: '24px' }}>
          <ScorerConsole match={match} onUpdate={handleMatchUpdate} />
          <div style={{ marginTop: '20px' }}>
            <AdminStreamManager match={match} onUpdate={handleMatchUpdate} />
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
            <Award size={18} color="#3b82f6" /> 📋 Live Match Events & Cards Timeline
          </h3>

          {matchEvents.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#1D2128', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
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
                    backgroundColor: '#1D2128',
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
      )}
    </div>
  );
};

export default MatchDetail;
