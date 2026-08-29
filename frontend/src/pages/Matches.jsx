import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Filter, PlusCircle, X, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  
  // New Match Form State
  const [selectedTournament, setSelectedTournament] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);

  // Edit Match State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, home_team: '', away_team: '', scheduled_date: '', tournament: null });
  
  const { user } = useAuth();

  const fetchMatches = async () => {
    try {
      const [mRes, tRes, tmRes] = await Promise.all([
        api.get('/tournaments/matches/'),
        api.get('/tournaments/tournaments/'),
        api.get('/tournaments/teams/')
      ]);
      setMatches(mRes.data);
      setTournaments(tRes.data);
      setTeams(tmRes.data);
      if (tRes.data.length > 0 && !selectedTournament) {
        setSelectedTournament(tRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
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
        scheduled_time: new Date(scheduledDate).toISOString()
      });
      setShowModal(false);
      setHomeTeam('');
      setAwayTeam('');
      fetchMatches();
      alert('Match successfully scheduled!');
    } catch (err) {
      console.error(err);
      alert('Error scheduling match. Please check team selections.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetNextMatch = async (matchId) => {
    try {
      const res = await api.post(`/tournaments/matches/${matchId}/set_next/`);
      fetchMatches();
      if (res.data?.is_next_match) {
        alert('📌 Match successfully set as UPCOMING NEXT MATCH!');
      } else {
        alert('📌 Next match selection removed.');
      }
    } catch (err) {
      console.error('Failed to set next match:', err);
      alert('Failed to set as next match: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenEdit = (m) => {
    setEditForm({
      id: m.id,
      home_team: m.home_team ? String(m.home_team) : '',
      away_team: m.away_team ? String(m.away_team) : '',
      scheduled_date: m.scheduled_time ? new Date(m.scheduled_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      tournament: m.tournament
    });
    setShowEditModal(true);
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match schedule?')) return;
    try {
      await api.delete(`/tournaments/matches/${matchId}/`);
      fetchMatches();
      alert('Match deleted successfully.');
    } catch (err) {
      alert('Error deleting match: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleClearAllMatches = async () => {
    if (!window.confirm('⚠️ WARNING: Are you sure you want to delete ALL match schedules? This will wipe the match schedule clean.')) return;
    try {
      await api.post('/tournaments/matches/clear_all', {});
      fetchMatches();
      alert('✅ All match schedules cleared successfully!');
    } catch (err) {
      alert('Error clearing matches: ' + err.message);
    }
  };

  const tournamentTeams = teams.filter(t => t.tournament === selectedTournament || !selectedTournament);
  const editModalTeams = teams.filter(t => t.tournament === editForm.tournament);

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

  const filteredMatches = sortedMatches.filter(m => {
    if (filterStatus === 'ALL') return true;
    return m.status === filterStatus;
  });

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Matches & Live Scoring</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
            Real-time score updates, VAR multi-cam feed & match control.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {user?.role === 'ADMIN' && (
            <>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
                style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}
              >
                <PlusCircle size={16} /> Schedule New Match
              </button>
              {matches.length > 0 && (
                <button
                  onClick={handleClearAllMatches}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    padding: '7px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                  title="Wipe all scheduled matches"
                >
                  <Trash2 size={15} /> Clear All Matches
                </button>
              )}
            </>
          )}

          <Link to="/bracket" className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800', backgroundColor: '#10b981', borderColor: '#10b981' }}>
            🏆 Knockout Bracket
          </Link>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#1D2128',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
          >
            <option value="ALL" style={{ background: '#1D2128' }}>All Statuses</option>
            <option value="LIVE" style={{ background: '#1D2128' }}>Live Now</option>
            <option value="SCHEDULED" style={{ background: '#1D2128' }}>Scheduled</option>
            <option value="ENDED" style={{ background: '#1D2128' }}>Completed</option>
          </select>
        </div>
      </div>

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
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#1D2128' }}>{t.name}</option>
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
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value="">-- Select Home Team --</option>
                  {tournamentTeams.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#1D2128' }}>{t.name}</option>
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
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value="">-- Select Away Team --</option>
                  {tournamentTeams.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#1D2128' }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Scheduled Match Date
                </label>
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

      {loading ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading match schedule...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No matches found matching filter.</div>
      ) : (
        <div className="responsive-grid-2">
          {filteredMatches.map((m, idx) => (
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
                    <Link to={`/tournaments/${m.tournament}`} style={{ textDecoration: 'none', fontSize: '0.75rem', fontWeight: '800', color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      🏆 {m.tournament_name || 'Tournament'}
                    </Link>
                    {m.stage !== 'REGULAR' && (
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        {m.stage.replace('_', ' ')}
                      </span>
                    )}
                    {m.is_next_match && (
                      <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#FFCB56', backgroundColor: 'rgba(255, 203, 86, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255, 203, 86, 0.5)' }}>
                        📌 NEXT MATCH
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

                {(user?.role === 'ADMIN' || m.status !== 'SCHEDULED') && (
                  <div style={{ paddingTop: '14px', borderTop: '1px solid #343a46', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {user?.role === 'ADMIN' && m.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleSetNextMatch(m.id)}
                          style={{
                            backgroundColor: m.is_next_match ? '#2B5748' : 'rgba(43, 87, 72, 0.18)',
                            color: m.is_next_match ? '#EAECF0' : '#2B5748',
                            border: '1px solid #2B5748',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          {m.is_next_match ? '📌 Next Match Active (Unset)' : '📌 Set as Next Match'}
                        </button>
                      )}
                      {user?.role === 'ADMIN' && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '800' }}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMatch(m.id)}
                            title="Delete Match"
                            style={{
                              backgroundColor: 'rgba(244, 63, 94, 0.15)',
                              color: '#f43f5e',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '0.75rem'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>

                    <Link to={`/matches/${m.id}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', marginLeft: 'auto' }}>
                      {user?.role === 'ADMIN' ? 'Open Master Console' : 'Watch Live Scoreboard'}
                    </Link>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Match Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={18} color="#3b82f6" /> Edit Match
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>Home Team</label>
                <select
                  required
                  value={editForm.home_team}
                  onChange={e => setEditForm({ ...editForm, home_team: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value="">-- Select Home Team --</option>
                  {editModalTeams.map(t => (
                    <option key={t.id} value={String(t.id)} style={{ background: '#1D2128' }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>Away Team</label>
                <select
                  required
                  value={editForm.away_team}
                  onChange={e => setEditForm({ ...editForm, away_team: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value="">-- Select Away Team --</option>
                  {editModalTeams.map(t => (
                    <option key={t.id} value={String(t.id)} style={{ background: '#1D2128' }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>Match Date</label>
                <input
                  type="datetime-local"
                  required
                  value={editForm.scheduled_date}
                  onChange={e => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ flex: 1, padding: '9px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '9px' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
