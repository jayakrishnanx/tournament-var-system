import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Activity, PlusCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get('/tournaments/matches/');
        setMatches(res.data);
      } catch (err) {
        console.error('Error fetching matches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const liveMatches = matches.filter(m => m.status === 'LIVE' || m.status === 'PAUSED');
  const scheduledMatches = matches.filter(m => m.status === 'SCHEDULED');
  const endedMatches = matches.filter(m => m.status === 'ENDED');

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="glass-panel mobile-stack" style={{
        padding: '20px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeft: '4px solid #3b82f6'
      }}>
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {user?.role === 'ADMIN' ? 'Tournament Operations Control Center' : 'Kallikalam Live Match Hub'}
          </span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '2px' }}>
            {user?.role === 'ADMIN' ? 'Welcome back, Admin!' : 'Live Championship Matches & Real-Time Scoreboard'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
            {user?.role === 'ADMIN' ? 'Real-Time Sync & 3-Camera VAR active.' : 'Follow instant scores, active timers, and live 3-camera match feeds.'}
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <Link to="/tournaments" className="btn-primary" style={{ marginTop: '8px' }}>
            <PlusCircle size={16} /> New Tournament
          </Link>
        )}
      </div>

      {/* Main Live & Match Hub */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#3b82f6" /> Live & Scheduled Matches
          </h2>
          {user?.role === 'ADMIN' && (
            <Link to="/tournaments" style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Manage Tournaments <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            Loading match schedule...
          </div>
        ) : matches.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            <p style={{ fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700' }}>No active matches scheduled yet.</p>
          </div>
        ) : (
          <div className="responsive-grid-2">
            {matches.map(m => (
              <div key={m.id} className="glass-panel card-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>
                      Period: <strong>{m.current_period}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0', gap: '6px' }}>
                    <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word', fontSize: '0.95rem', fontWeight: '800', color: 'white' }}>
                      {m.home_team_details?.name || 'Home Team'}
                    </div>

                    <div style={{
                      backgroundColor: '#0f172a',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '1.4rem',
                      fontWeight: '900',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      flexShrink: 0
                    }}>
                      {m.home_score} - {m.away_score}
                    </div>

                    <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word', fontSize: '0.95rem', fontWeight: '800', color: 'white' }}>
                      {m.away_team_details?.name || 'Away Team'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    ⏱️ {Math.floor(m.timer_seconds_elapsed / 60)}m {m.timer_seconds_elapsed % 60}s
                  </span>
                  <Link to={`/matches/${m.id}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                    {user?.role === 'ADMIN' ? 'Open Master Console' : 'Watch Live Scoreboard & Cameras'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
