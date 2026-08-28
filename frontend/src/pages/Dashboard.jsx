import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Activity, PlusCircle, Award, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({ top_scorers: [], yellow_cards: [], red_cards: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <Navigate to="/matches" replace />;
  }

  const fetchData = async () => {
    try {
      const url = selectedTournament ? `/tournaments/matches/?tournament=${selectedTournament}` : '/tournaments/matches/';
      const statsUrl = selectedTournament ? `/tournaments/matches/stats/?tournament=${selectedTournament}` : '/tournaments/matches/stats/';

      const [mRes, tRes, tmRes, stRes] = await Promise.all([
        api.get(url),
        api.get('/tournaments/tournaments/'),
        api.get('/tournaments/teams/'),
        api.get(statsUrl)
      ]);
      setMatches(mRes.data);
      setTournaments(tRes.data);
      setTeams(tmRes.data);
      setStats(stRes.data);
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
  }, [selectedTournament]);

  const handleScheduleMatch = async (e) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam) {
      alert('Please select both Home and Away teams');
      return;
    }
    if (homeTeam === awayTeam) {
      alert('Home and Away teams must be different');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/tournaments/matches/', {
        tournament: selectedTournament,
        home_team: homeTeam,
        away_team: awayTeam,
        scheduled_time: `${scheduledDate}T00:00:00Z`
      });
      setShowModal(false);
      setHomeTeam('');
      setAwayTeam('');
      fetchData();
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
    if (a.is_next_match && !b.is_next_match && a.status === 'SCHEDULED') return -1;
    if (!a.is_next_match && b.is_next_match && b.status === 'SCHEDULED') return 1;
    if (a.status === 'ENDED' && b.status !== 'ENDED') return 1;
    if (a.status !== 'ENDED' && b.status === 'ENDED') return -1;
    return (a.match_number || 0) - (b.match_number || 0);
  });

  const nextMatch = matches.find(m => m.is_next_match && m.status === 'SCHEDULED') || matches.find(m => m.status === 'SCHEDULED');

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>

      {/* Schedule Match Modal for Admin */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Schedule New Match</h3>
            <form onSubmit={handleScheduleMatch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Home Team</label>
                <select
                  value={homeTeam}
                  onChange={e => setHomeTeam(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value="">Select Home Team</option>
                  {tournamentTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Away Team</label>
                <select
                  value={awayTeam}
                  onChange={e => setAwayTeam(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value="">Select Away Team</option>
                  {tournamentTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
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

      {/* 1. OFFICIAL SPONSORS BANNER (SPECTATORS ONLY) */}
      {user?.role !== 'ADMIN' && (
        <div className="glass-panel" style={{ padding: '14px 16px', marginBottom: '20px', borderTop: '3px solid #2B5748' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#2B5748', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', textAlign: 'center' }}>
            ✨ OFFICIAL TOURNAMENT SPONSORS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', alignItems: 'center' }}>
            {/* Sponsor Logo 1: Quick Mix */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #ffffff',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '85px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
            }}>
              <img
                src="/sponsors/sponsor1.png"
                alt="Quick Mix"
                style={{ height: '100%', width: '100%', maxHeight: '76px', objectFit: 'contain' }}
              />
            </div>

            {/* Sponsor Logo 2: NEO */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #ffffff',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '85px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
            }}>
              <img
                src="/sponsors/sponsor2.png"
                alt="NEO"
                style={{ height: '100%', width: '100%', maxHeight: '76px', objectFit: 'contain' }}
              />
            </div>

            {/* Sponsor Logo 3: N N STEELS */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #ffffff',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '85px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
            }}>
              <img
                src="/sponsors/sponsor3.png"
                alt="N N STEELS"
                style={{ height: '100%', width: '100%', maxHeight: '84px', objectFit: 'contain', transform: 'scale(1.15)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. UPCOMING NEXT MATCH HIGHLIGHT CARD FOR SPECTATORS */}
      {nextMatch && (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(43, 87, 72, 0.25), #1D2128)',
          border: '1px solid rgba(43, 87, 72, 0.4)',
          borderLeft: '4px solid #2B5748'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#2B5748', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📌 UPCOMING NEXT MATCH
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9aa4b2' }}>
              Match #{nextMatch.match_number}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#EAECF0' }}>
              {nextMatch.home_team_details?.name} <span style={{ color: '#2B5748', margin: '0 6px' }}>VS</span> {nextMatch.away_team_details?.name}
            </div>

            <Link to={`/matches/${nextMatch.id}`} style={{
              backgroundColor: '#2B5748',
              color: '#EAECF0',
              fontWeight: '900',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap'
            }}>
              Watch Next Match
            </Link>
          </div>
        </div>
      )}

      {/* 3. MAIN LIVE & SCHEDULED MATCHES */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#2B5748" /> Live & Scheduled Matches
          </h2>
          <Link to="/standings" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
            📊 View Points Table
          </Link>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#9aa4b2' }}>
            Loading match schedule...
          </div>
        ) : matches.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#9aa4b2' }}>
            <p style={{ fontSize: '0.95rem', color: '#EAECF0', fontWeight: '700' }}>No active matches scheduled yet.</p>
          </div>
        ) : (
          <div className="responsive-grid-2">
            {sortedMatches.map((m, idx) => (
              <div key={m.id} className="glass-panel card-hover" style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: m.status === 'LIVE' || m.status === 'PAUSED'
                  ? '2px solid #ef4444'
                  : m.is_next_match
                    ? '2px solid #f59e0b'
                    : '1px solid #334155'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusBadge status={m.status} />
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#2B5748', backgroundColor: 'rgba(43, 87, 72, 0.18)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(43, 87, 72, 0.4)' }}>
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

                    {m.status === 'SCHEDULED' ? (
                      <div style={{
                        backgroundColor: 'rgba(43, 87, 72, 0.15)',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        color: '#2B5748',
                        border: '1px solid rgba(43, 87, 72, 0.3)',
                        flexShrink: 0
                      }}>
                        VS
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: '#1D2128',
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
                    )}

                    <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word', fontSize: '0.95rem', fontWeight: '800', color: 'white' }}>
                      {m.away_team_details?.name || 'Away Team'}
                    </div>
                  </div>
                </div>

                {m.status !== 'SCHEDULED' && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to={`/matches/${m.id}`} className="btn-primary" style={{ width: '100%', textAlign: 'center', padding: '8px 12px', fontSize: '0.85rem', fontWeight: '800' }}>
                      Watch Live Scoreboard & Cameras
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. TOURNAMENT TOP GOAL SCORER (POSITION #3 THIRD) */}
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

    </div>
  );
};
