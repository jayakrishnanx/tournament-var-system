import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Trophy, Users, ArrowRight, Activity, PlusCircle, Award, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [stats, setStats] = useState({ top_scorers: [], yellow_cards: [], red_cards: [] });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, mRes, sRes] = await Promise.all([
          api.get('/tournaments/tournaments/'),
          api.get('/tournaments/matches/'),
          api.get('/tournaments/matches/stats/')
        ]);
        setTournaments(tRes.data);
        const live = mRes.data.filter(m => m.status === 'LIVE' || m.status === 'PAUSED');
        setLiveMatches(live.length > 0 ? live : mRes.data.slice(0, 4));
        setStats(sRes.data || { top_scorers: [], yellow_cards: [], red_cards: [] });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleQuickDemoSetup = async () => {
    try {
      setLoading(true);
      const tRes = await api.post('/tournaments/tournaments/', {
        name: 'KALLIKALAM CHAMPIONSHIP 2026',
        sport_type: 'Soccer / Football',
        location: 'Kallikalam Arena',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        status: 'ONGOING'
      });
      const tId = tRes.data.id;
      const alphaRes = await api.post('/tournaments/teams/', { tournament: tId, name: 'Team Alpha', coach_name: 'Coach Alpha' });
      const betaRes = await api.post('/tournaments/teams/', { tournament: tId, name: 'Team Beta', coach_name: 'Coach Beta' });
      await api.post('/tournaments/matches/', {
        tournament: tId,
        home_team: alphaRes.data.id,
        away_team: betaRes.data.id,
        match_code: 'match1',
        status: 'LIVE',
        current_period: '1st Half',
        timer_seconds_elapsed: 0
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Error creating demo match. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  const topScorer = stats.top_scorers[0];
  const yellowLeader = stats.yellow_cards[0];
  const redLeader = stats.red_cards[0];

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
            {user?.role === 'ADMIN' ? `Welcome back, Admin!` : 'Live Championship Matches & Real-Time Scoreboard'}
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

      {/* Top Metrics Row - Player Statistics & Disciplinary Highlights */}
      <div className="responsive-grid-2" style={{ marginBottom: '24px' }}>
        {/* 1. Top Goal Scorer */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Highest Goal Scorer</span>
            <Award size={18} color="#10b981" />
          </div>
          <div style={{ marginTop: '8px' }}>
            {topScorer ? (
              <>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                  {topScorer.player_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', marginTop: '2px' }}>
                  {topScorer.team_name} ({topScorer.goals} {topScorer.goals === 1 ? 'Goal' : 'Goals'})
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginTop: '4px' }}>
                No goals recorded yet
              </div>
            )}
          </div>
        </div>

        {/* 2. Yellow Cards Leader */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Yellow Cards</span>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div style={{ marginTop: '8px' }}>
            {yellowLeader ? (
              <>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                  {yellowLeader.player_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '700', marginTop: '2px' }}>
                  {yellowLeader.team_name} ({yellowLeader.yellow_cards} {yellowLeader.yellow_cards === 1 ? 'Yellow' : 'Yellows'})
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginTop: '4px' }}>
                No yellow cards issued
              </div>
            )}
          </div>
        </div>

        {/* 3. Red Cards Leader */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Red Cards</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <div style={{ marginTop: '8px' }}>
            {redLeader ? (
              <>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                  {redLeader.player_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '700', marginTop: '2px' }}>
                  {redLeader.team_name} ({redLeader.red_cards} {redLeader.red_cards === 1 ? 'Red' : 'Reds'})
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginTop: '4px' }}>
                No red cards issued
              </div>
            )}
          </div>
        </div>

        {/* 4. Live Matches */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '3px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Live Matches</span>
            <Activity size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px' }}>
            {liveMatches.filter(m => m.status === 'LIVE').length}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="responsive-grid-2">
        {/* Live & Featured Matches */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Live & Upcoming Matches</h2>
            <Link to="/matches" style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading matches...</div>
          ) : liveMatches.length === 0 ? (
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ marginBottom: '16px', fontSize: '1rem', color: '#f8fafc', fontWeight: '700' }}>No active matches created yet.</p>
              <button
                onClick={handleQuickDemoSetup}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: '800' }}
              >
                <PlusCircle size={18} /> Initialize Kallikalam Championship & Demo Match 1
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {liveMatches.map(m => (
                <div key={m.id} className="glass-panel card-hover" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Period: <strong>{m.current_period}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>
                      {m.home_team_details?.name || 'Home Team'}
                    </div>

                    <div style={{
                      backgroundColor: '#0f172a',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      margin: '0 20px',
                      fontSize: '1.5rem',
                      fontWeight: '900',
                      letterSpacing: '0.1em'
                    }}>
                      {m.home_score} - {m.away_score}
                    </div>

                    <div style={{ flex: 1, textAlign: 'left', fontWeight: '700', fontSize: '1.1rem' }}>
                      {m.away_team_details?.name || 'Away Team'}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      ⏱️ {Math.floor(m.timer_seconds_elapsed / 60)}m {m.timer_seconds_elapsed % 60}s
                    </span>
                    <Link to={`/matches/${m.id}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                      Open Match Console
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detailed Leaderboard & Disciplinary Section */}
          <div style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px' }}>Player Leaderboard & Discipline</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Top Scorers List */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚽ Top Goal Scorers
                </h3>
                {stats.top_scorers.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No goals recorded in matches yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.top_scorers.slice(0, 5).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.player_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.team_name}</div>
                        </div>
                        <span style={{ fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                          {item.goals} {item.goals === 1 ? 'Goal' : 'Goals'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Yellow Cards List */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🟨 Yellow Cards Issued
                </h3>
                {stats.yellow_cards.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No yellow cards issued.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.yellow_cards.slice(0, 5).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.player_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.team_name}</div>
                        </div>
                        <span style={{ fontWeight: '800', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                          {item.yellow_cards} 🟨
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Red Cards List */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🟥 Red Cards Issued
                </h3>
                {stats.red_cards.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No red cards issued.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.red_cards.slice(0, 5).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.player_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.team_name}</div>
                        </div>
                        <span style={{ fontWeight: '800', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                          {item.red_cards} 🟥
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tournaments */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Tournaments</h2>
            <Link to="/tournaments" style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tournaments.slice(0, 4).map(t => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="glass-panel card-hover" style={{ padding: '16px', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>{t.name}</h3>
                  <StatusBadge status={t.status} />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                  🏆 {t.sport} | 👥 {t.teams?.length || 0} Teams
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
