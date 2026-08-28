import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Activity, PlusCircle, ArrowRight, Award, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({ top_scorers: [], yellow_cards: [], red_cards: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New Match Form State
  const [selectedTournament, setSelectedTournament] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [mRes, sRes, tRes, tmRes] = await Promise.all([
        api.get('/tournaments/matches/'),
        api.get('/tournaments/matches/stats/'),
        api.get('/tournaments/tournaments/'),
        api.get('/tournaments/teams/')
      ]);
      setMatches(mRes.data);
      setStats(sRes.data || { top_scorers: [], yellow_cards: [], red_cards: [] });
      setTournaments(tRes.data);
      setTeams(tmRes.data);
      if (tRes.data.length > 0 && !selectedTournament) {
        setSelectedTournament(tRes.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!selectedTournament || !homeTeam || !awayTeam) {
      alert('Please select tournament, home team, and away team.');
      return;
    }
    if (homeTeam === awayTeam) {
      alert('Home team and Away team must be different!');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/tournaments/matches/', {
        tournament: selectedTournament,
        home_team: homeTeam,
        away_team: awayTeam,
        status: 'SCHEDULED',
        current_period: 'NOT_STARTED',
        scheduled_time: `${scheduledDate}T00:00:00Z`
      });
      setShowModal(false);
      setHomeTeam('');
      setAwayTeam('');
      fetchData();
      alert('Match successfully scheduled!');
    } catch (err) {
      console.error(err);
      alert('Error scheduling match.');
    } finally {
      setSubmitting(false);
    }
  };

  const tournamentTeams = teams.filter(t => t.tournament === selectedTournament || !selectedTournament);
  const topScorer = stats.top_scorers[0];

  const sortedMatches = [...matches].sort((a, b) => {
    if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
    if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
    if (a.status === 'PAUSED' && b.status !== 'PAUSED') return -1;
    if (a.status !== 'PAUSED' && b.status === 'PAUSED') return 1;
    if (a.status === 'ENDED' && b.status !== 'ENDED') return 1;
    if (a.status !== 'ENDED' && b.status === 'ENDED') return -1;
    return (a.match_number || 0) - (b.match_number || 0);
  });

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>

      {/* Schedule Match Modal for Admin */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
                📅 Schedule New Match
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Select Tournament
                </label>
                <select
                  value={selectedTournament}
                  onChange={e => setSelectedTournament(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Home Team
                </label>
                <select
                  required
                  value={homeTeam}
                  onChange={e => setHomeTeam(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value="">-- Select Home Team --</option>
                  {tournamentTeams.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Away Team
                </label>
                <select
                  required
                  value={awayTeam}
                  onChange={e => setAwayTeam(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value="">-- Select Away Team --</option>
                  {tournamentTeams.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Scheduled Match Date
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1, padding: '9px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1, padding: '9px' }}>
                  {submitting ? 'Scheduling...' : 'Schedule Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Goal Scorer Card (Shown on both Admin and User Dashboards) */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', borderTop: '3px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={18} color="#10b981" /> 🏆 TOURNAMENT TOP GOAL SCORER
          </span>
        </div>
        <div style={{ marginTop: '8px' }}>
          {topScorer ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc' }}>
                  {topScorer.player_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>
                  Team: <strong style={{ color: '#cbd5e1' }}>{topScorer.team_name}</strong>
                </div>
              </div>
              <span style={{ fontWeight: '900', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '4px 12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                ⚽ {topScorer.goals} {topScorer.goals === 1 ? 'Goal' : 'Goals'}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>
              No goals recorded in active matches yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Live & Match Hub */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#3b82f6" /> Live & Scheduled Matches
          </h2>
          <Link to="/standings" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', backgroundColor: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
            📊 View Points Table
          </Link>
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
            {sortedMatches.map((m, idx) => (
              <div key={m.id} className="glass-panel card-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusBadge status={m.status} />
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                        🏆 {m.tournament_name || 'Kakkikalam'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>
                      Match #{m.match_number || (idx + 1)}
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

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
