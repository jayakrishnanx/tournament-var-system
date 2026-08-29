import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Activity, PlusCircle, Award, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { subscribeMatches, subscribeTournaments } from '../services/firebaseService';

export const Dashboard = () => {
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({ top_scorers: [], yellow_cards: [], red_cards: [] });
  const [loading, setLoading] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();

  const fetchStaticData = async () => {
    try {
      const [tRes, tmRes] = await Promise.all([
        api.get('/tournaments/tournaments/'),
        api.get('/tournaments/teams/')
      ]);
      setTournaments(tRes.data);
      setTeams(tmRes.data);
      if (tRes.data.length > 0 && !selectedTournament) {
        setSelectedTournament(tRes.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching static data:', err);
    }
  };

  const fetchLiveData = async () => {
    try {
      const url = selectedTournament ? `/tournaments/matches/?tournament=${selectedTournament}` : '/tournaments/matches/';
      const statsUrl = selectedTournament ? `/tournaments/matches/stats/?tournament=${selectedTournament}` : '/tournaments/matches/stats/';
      const [mRes, stRes] = await Promise.all([
        api.get(url),
        api.get(statsUrl)
      ]);
      setMatches(mRes.data);
      setStats(stRes.data);
    } catch (err) {
      console.error('Error fetching live data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaticData();
    fetchLiveData();

    // Active real-time listeners
    const unsubMatches = subscribeMatches(null, (liveMatches) => {
      if (liveMatches && liveMatches.length > 0) {
        setMatches(liveMatches);
      }
    });

    const unsubTourns = subscribeTournaments((liveTourns) => {
      if (liveTourns && liveTourns.length > 0) {
        setTournaments(liveTourns);
      }
    });

    return () => {
      unsubMatches();
      unsubTourns();
    };
  }, []);

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
        scheduled_time: new Date(scheduledDate).toISOString()
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

  const liveMatch = matches.find(m => m.status === 'LIVE' || m.status === 'PAUSED');
  const nextMatch = matches.find(m => m.is_next_match && m.status === 'SCHEDULED') || matches.find(m => m.status === 'SCHEDULED');

  if (user?.role === 'ADMIN') return <Navigate to="/matches" replace />;

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
                  type="datetime-local"
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
            ✨ TOURNAMENT OFFICIAL SPONSORS
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

      {/* 1.5 ACTIVE LIVE MATCH HIGHLIGHT CARD FOR SPECTATORS */}
      {liveMatch && (
        <div className="glass-panel" style={{
          padding: '18px 20px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22), #151a23)',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
          animation: 'pulseLiveBorder 2s infinite'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block', animation: 'blinkLive 1.1s infinite' }}></span>
              🔴 LIVE CAMERA STREAM & MATCH SCOREBOARD
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9aa4b2', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
              Match #{liveMatch.match_number || 'Live'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#EAECF0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span>{liveMatch.home_team_details?.name}</span>
              <span style={{
                backgroundColor: '#ef4444',
                padding: '4px 12px',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '1.2rem',
                fontWeight: '900',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                display: 'inline-block'
              }}>
                {liveMatch.home_score} - {liveMatch.away_score}
              </span>
              <span>{liveMatch.away_team_details?.name}</span>
            </div>

            <Link to={`/matches/${liveMatch.id}`} style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontWeight: '900',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              whiteSpace: 'nowrap',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              textDecoration: 'none'
            }}>
              ▶️ Watch Live Stream
            </Link>
          </div>
          <style>{`
            @keyframes blinkLive {
              0% { opacity: 0.3; }
              50% { opacity: 1; }
              100% { opacity: 0.3; }
            }
            @keyframes pulseLiveBorder {
              0% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.1); }
              50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.25); }
              100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.1); }
            }
          `}</style>
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
            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#FFCB56', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to="/bracket" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800', backgroundColor: '#10b981', borderColor: '#10b981' }}>
              🏆 Knockout Bracket
            </Link>
            <Link to="/standings" className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
              📊 Points Table
            </Link>
          </div>
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
                      <Link to={`/tournaments/${m.tournament}`} style={{ textDecoration: 'none', fontSize: '0.75rem', fontWeight: '800', color: '#2b5748', backgroundColor: 'rgba(43, 87, 72, 0.18)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(43, 87, 72, 0.4)' }}>
                        🏆 {m.tournament_name || 'Tournament'}
                      </Link>
                      {m.stage !== 'REGULAR' && (
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          {m.stage.replace('_', ' ')}
                        </span>
                      )}
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

      {/* 3. TOURNAMENT TOP GOAL SCORERS */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', borderTop: '3px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={18} color="#10b981" /> 🏆 TOURNAMENT TOP 3 GOAL SCORERS
          </span>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stats.top_scorers && stats.top_scorers.length > 0 ? (
            stats.top_scorers.slice(0, 3).map((scorer, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#1D2128',
                borderRadius: '8px',
                border: '1px solid #334155'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '900', color: '#f8fafc' }}>
                      {scorer.player_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                      Team: <strong style={{ color: '#cbd5e1' }}>{scorer.team_name}</strong>
                    </div>
                  </div>
                </div>
                <span style={{ fontWeight: '900', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '4px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  ⚽ {scorer.goals} {scorer.goals === 1 ? 'Goal' : 'Goals'}
                </span>
              </div>
            ))
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
