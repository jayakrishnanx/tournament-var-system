import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Plus, Shield, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [teamForm, setTeamForm] = useState({ name: '', code: '', tournament: '' });
  const [editTeamForm, setEditTeamForm] = useState({ id: null, name: '', tournament: '' });
  const [playerForm, setPlayerForm] = useState({ name: '', jersey_number: '', position: 'Forward' });
  const { user } = useAuth();

  const fetchTeams = async () => {
    try {
      const [teamsRes, tournsRes] = await Promise.all([
        api.get('/tournaments/teams/'),
        api.get('/tournaments/tournaments/')
      ]);
      setTeams(teamsRes.data);
      setTournaments(tournsRes.data);
      if (tournsRes.data.length > 0 && !teamForm.tournament) {
        setTeamForm(prev => ({ ...prev, tournament: tournsRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tournaments/teams/', teamForm);
      setShowTeamModal(false);
      setTeamForm({ name: '', code: '', tournament: tournaments[0]?.id || '' });
      fetchTeams();
    } catch (err) {
      alert('Error creating team: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenEditTeam = (team) => {
    setEditTeamForm({ id: team.id, name: team.name, tournament: team.tournament });
    setShowEditTeamModal(true);
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/tournaments/teams/${editTeamForm.id}/`, {
        name: editTeamForm.name,
        tournament: editTeamForm.tournament
      });
      setShowEditTeamModal(false);
      fetchTeams();
    } catch (err) {
      alert('Error updating team: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (window.confirm(`Are you sure you want to delete team "${teamName}"? This will also remove all players on the roster.`)) {
      try {
        await api.delete(`/tournaments/teams/${teamId}/`);
        fetchTeams();
      } catch (err) {
        alert('Error deleting team: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tournaments/players/', {
        ...playerForm,
        team: selectedTeam.id
      });
      setShowPlayerModal(false);
      fetchTeams();
    } catch (err) {
      let errorMsg = err.message;
      if (err.response?.data) {
        if (err.response.data.detail) errorMsg = err.response.data.detail;
        else if (err.response.data.non_field_errors) errorMsg = err.response.data.non_field_errors[0];
        else if (typeof err.response.data === 'object') {
            errorMsg = Object.values(err.response.data)[0];
            if (Array.isArray(errorMsg)) errorMsg = errorMsg[0];
        }
      }
      alert('Error adding player: ' + errorMsg);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Teams & Roster Manager</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
            Registered teams across all active tournaments and player rosters.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button onClick={() => setShowTeamModal(true)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={16} /> Add New Team
          </button>
        )}
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No teams registered yet.</div>
      ) : (
        <div className="responsive-grid-2">
          {teams.map(team => {
            const tournamentObj = tournaments.find(t => t.id === team.tournament);
            return (
              <div key={team.id} className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{team.name}</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', backgroundColor: '#1D2128', padding: '4px 8px', borderRadius: '6px' }}>
                      {tournamentObj?.name || 'Tournament'}
                    </span>
                    {user?.role === 'ADMIN' && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleOpenEditTeam(team)}
                          title="Edit Team"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          title="Delete Team"
                          style={{
                            backgroundColor: 'rgba(244, 63, 94, 0.15)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1' }}>Roster ({team.players?.length || 0})</span>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => { setSelectedTeam(team); setShowPlayerModal(true); }}
                        style={{ fontSize: '0.75rem', color: '#10b981', background: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={14} /> Add Player
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {team.players?.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>No players added to squad.</span>
                    ) : (
                      team.players?.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 10px', backgroundColor: '#1D2128', borderRadius: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#f8fafc' }}>#{p.jersey_number} {p.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Team Modal */}
      {showTeamModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>Register New Team</h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Select Tournament</label>
                <select
                  value={teamForm.tournament}
                  onChange={e => setTeamForm({ ...teamForm, tournament: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red Dragons FC"
                  value={teamForm.name}
                  onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowTeamModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={20} color="#3b82f6" /> Edit Team
            </h3>
            <form onSubmit={handleUpdateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Select Tournament</label>
                <select
                  value={editTeamForm.tournament}
                  onChange={e => setEditTeamForm({ ...editTeamForm, tournament: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Team Name</label>
                <input
                  type="text"
                  required
                  value={editTeamForm.name}
                  onChange={e => setEditTeamForm({ ...editTeamForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEditTeamModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showPlayerModal && selectedTeam && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>Add Player to {selectedTeam.name}</h3>
            <form onSubmit={handleAddPlayer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Player Full Name</label>
                <input
                  type="text"
                  required
                  value={playerForm.name}
                  onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Jersey #</label>
                <input
                  type="number"
                  required
                  value={playerForm.jersey_number}
                  onChange={e => setPlayerForm({ ...playerForm, jersey_number: e.target.value === '' ? '' : parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowPlayerModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Player</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
