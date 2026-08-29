import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { connectMatchWebSocket } from '../services/websocket';
import { StatusBadge } from '../components/StatusBadge';
import { LiveStreamViewer } from '../components/LiveStreamViewer';
import { Radio, ArrowLeft, Award } from 'lucide-react';

export const PublicScoreboard = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await api.get(`/tournaments/matches/${id}/`);
        setMatch(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();

    const ws = connectMatchWebSocket(
      id,
      (data) => {
        if (data.type === 'match_update') {
          setMatch(prev => prev ? ({ ...prev, ...data.match }) : prev);
        }
        setWsConnected(true);
      },
      () => setWsConnected(false)
    );

    return () => ws.close();
  }, [id]);

  if (loading) return <div style={{ padding: '40px', color: '#94a3b8', textAlign: 'center' }}>Loading live scoreboard...</div>;
  if (!match) return <div style={{ padding: '40px', color: '#f43f5e', textAlign: 'center' }}>Match feed not found.</div>;

  const minutes = Math.floor((match.timer_seconds_elapsed || 0) / 60).toString().padStart(2, '0');
  const seconds = ((match.timer_seconds_elapsed || 0) % 60).toString().padStart(2, '0');
  const clockFormatted = `${minutes}:${seconds}`;

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: '800' }}>
          <ArrowLeft size={16} /> Main Arena Portal
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: wsConnected ? '#10b981' : '#94a3b8', fontWeight: '700' }}>
          <Radio size={14} className={wsConnected ? 'animate-pulse' : ''} />
          <span>{wsConnected ? 'LIVE SCOREBOARD' : 'CONNECTING...'}</span>
        </div>
      </div>

      {/* Live In-Browser Video Stream Player */}
      <LiveStreamViewer
        matchId={id}
        homeTeam={match.home_team_details?.name}
        awayTeam={match.away_team_details?.name}
        homeScore={match.home_score}
        awayScore={match.away_score}
        clockTime={clockFormatted}
        matchStatus={match.status}
      />

      {/* Main Public Stadium Board */}
      <div className="glass-panel" style={{
        padding: '20px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid #334155',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          <StatusBadge status={match.status} />
          <span style={{ backgroundColor: '#1D2128', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', border: '1px solid #334155' }}>
            {match.current_period}
          </span>
        </div>

        <div className="responsive-grid-3" style={{ alignItems: 'center' }}>
          {/* Home Team */}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f8fafc' }}>{match.home_team_details?.name}</h2>
          </div>

          {/* Stadium Score & Timer */}
          <div>
            <div className="digital-score" style={{
              backgroundColor: '#090d16',
              padding: '10px 22px',
              borderRadius: '14px',
              border: '2px solid #3b82f6',
              boxShadow: '0 0 25px rgba(59, 130, 246, 0.3)',
              display: 'inline-block'
            }}>
              {match.home_score} : {match.away_score}
            </div>

            <div style={{ marginTop: '8px', fontSize: '1.3rem', fontWeight: '900', fontFamily: 'monospace', color: '#10b981' }}>
              {clockFormatted}
            </div>
          </div>

          {/* Away Team */}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f8fafc' }}>{match.away_team_details?.name}</h2>
          </div>
        </div>
      </div>

      {/* Live Match Events Ticker */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
          <Award size={18} /> Match Events Ticker
        </h3>

        {(!match.recent_events || match.recent_events.length === 0) ? (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
            No match events logged yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
            {match.recent_events.map(ev => (
              <div key={ev.id} style={{ padding: '10px 14px', backgroundColor: '#1D2128', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#3b82f6', fontWeight: '800', marginRight: '8px' }}>[{ev.match_minute}']</span>
                  <span style={{ color: 'white', fontWeight: '700' }}>{ev.event_type.replace('_', ' ')}</span>
                  {ev.player_name && <span style={{ color: '#10b981', marginLeft: '6px' }}>({ev.player_name})</span>}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(ev.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicScoreboard;
