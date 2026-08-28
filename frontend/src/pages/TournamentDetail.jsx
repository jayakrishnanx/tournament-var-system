import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Trophy, Plus, Users, Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  return dateStr;
};

export const TournamentDetail = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const { user } = useAuth();

  const [teamForm, setTeamForm] = useState({ name: '', code: '' });
  const [matchForm, setMatchForm] = useState({
    home_team: '',
    away_team: '',
    scheduled_date: '2026-08-29'
  });

  const fetchData = async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        api.get(`/tournaments/tournaments/${id}/`),
        api.get(`/tournaments/matches/?tournament=${id}`)
      ]);
      setTournament(tRes.data);
      setMatches(mRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tournaments/teams/', {
        ...teamForm,
        tournament: id
      });
      setShowTeamModal(false);
      setTeamForm({ name: '', code: '' });
      fetchData();
    } catch (err) {
      let msg = 'Failed to add team.';
      if (err.response?.data) {
        const d = err.response.data;
        if (d.non_field_errors?.some(e => e.includes('unique set'))) {
          msg = `A team named "${teamForm.name}" is already registered in this tournament.`;
        } else if (typeof d === 'object') {
          msg = Object.values(d).flat().join(' ');
        } else {
          msg = String(d);
        }
      } else {
        msg = err.message;
      }
      alert(msg);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (matchForm.home_team === matchForm.away_team) {
      alert('Home and Away teams must be different');
      return;
    }
    try {
      await api.post('/tournaments/matches/', {
        tournament: id,
        home_team: matchForm.home_team,
        away_team: matchForm.away_team,
        scheduled_time: `${matchForm.scheduled_date}T00:00:00Z`
      });
      setShowMatchModal(false);
      fetchData();
    } catch (err) {
      alert('Error creating match: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) return <div style={{ padding: '40px', color: '#94a3b8' }}>Loading tournament details...</div>;
  if (!tournament) return <div style={{ padding: '40px', color: '#f43f5e' }}>Tournament not found</div>;

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      <Link to="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', marginBottom: '16px', fontWeight: '600', fontSize: '0.85rem' }}>
        <ArrowLeft size={14} /> Back to Tournaments
      </Link>

      <div className="glass-panel mobile-stack" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{tournament.name}</h1>
              <StatusBadge status={tournament.status} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
              🏆 {tournament.sport} | 📅 {formatDateDDMMYYYY(tournament.start_date)} to {formatDateDDMMYYYY(tournament.end_date)} | 📍 {tournament.location || 'Main Arena'}
            </p>
          </div>

          {user?.role === 'ADMIN' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setShowTeamModal(true)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: '800' }}>
                <Users size={14} /> Add Team
              </button>
              <button onClick={() => setShowMatchModal(true)} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: '800' }}>
                <Calendar size={14} /> Schedule Match
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        {/* Matches List */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px' }}>Match Schedule</h2>
          {matches.length === 0 ? (
            <div className="glass-panel" style={{ padding: '24px', color: '#94a3b8', fontSize: '0.9rem' }}>No matches scheduled yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {matches.map(m => (
                <div key={m.id} className="glass-panel card-hover" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>
                      📅 Date: {formatDateDDMMYYYY(m.scheduled_time)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>
                      {m.home_team_details?.name || 'Home'}
                    </div>

                    <div style={{
                      backgroundColor: '#1D2128',
                      padding: '6px 16px',
                      borderRadius: '8px',
                      margin: '0 16px',
                      fontSize: '1.25rem',
                      fontWeight: '800'
                    }}>
                      {m.home_score} - {m.away_score}
                    </div>

                    <div style={{ flex: 1, textAlign: 'left', fontWeight: '700', fontSize: '1.1rem' }}>
                      {m.away_team_details?.name || 'Away'}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link to={`/matches/${m.id}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                      Open Match Console
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Team Modal */}
      {showTeamModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>Add Team to Tournament</h3>
            <form onSubmit={handleAddTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Barcelona FC"
                  value={teamForm.name}
                  onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowTeamModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Match Modal */}
      {showMatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>Schedule Match</h3>
            <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Home Team</label>
                <select
                  required
                  value={matchForm.home_team}
                  onChange={e => setMatchForm({ ...matchForm, home_team: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                >
                  <option value="">Select Home Team</option>
                  {tournament.teams?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Away Team</label>
                <select
                  required
                  value={matchForm.away_team}
                  onChange={e => setMatchForm({ ...matchForm, away_team: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                >
                  <option value="">Select Away Team</option>
                  {tournament.teams?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Select Match Date</label>
                <select
                  required
                  value={matchForm.scheduled_date}
                  onChange={e => setMatchForm({ ...matchForm, scheduled_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontWeight: '700' }}
                >
                  <option value="2026-08-29">29/08/2026</option>
                  <option value="2026-08-30">30/08/2026</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowMatchModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Schedule Match</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
