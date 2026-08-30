import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Plus, Trash2, Pencil, X, UserPlus, FileText, Check, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Team modals
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', code: '', tournament: '' });
  const [editTeamForm, setEditTeamForm] = useState({ id: null, name: '', tournament: '' });

  // Player modals & state
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [playerInputMode, setPlayerInputMode] = useState('rows'); // 'rows' | 'bulk'
  const [playerRows, setPlayerRows] = useState([{ name: '' }, { name: '' }, { name: '' }]);
  const [bulkText, setBulkText] = useState('');
  const [editPlayerForm, setEditPlayerForm] = useState({ id: null, name: '', jersey_number: '', position: '' });
  const [addingPlayers, setAddingPlayers] = useState(false);
  const [updatingPlayer, setUpdatingPlayer] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [editError, setEditError] = useState('');

  const rowInputRefs = useRef([]);
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

  useEffect(() => { fetchTeams(); }, []);

  // ─── Team handlers ────────────────────────────────────────────────────────
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

  const handleClearAllTeams = async () => {
    if (!window.confirm('⚠️ WARNING: Are you sure you want to delete ALL teams and their rosters? This will wipe all teams clean.')) return;
    try {
      await api.post('/tournaments/teams/clear_all', {});
      fetchTeams();
      alert('✅ All teams and rosters cleared successfully!');
    } catch (err) {
      alert('Error clearing teams: ' + err.message);
    }
  };

  // ─── Multi-player add handlers ────────────────────────────────────────────
  const openAddPlayersModal = (team) => {
    setSelectedTeam(team);
    setPlayerRows([{ name: '' }, { name: '' }, { name: '' }]);
    setBulkText('');
    setPlayerInputMode('rows');
    setPlayerError('');
    setShowPlayerModal(true);
  };

  const handleAddPlayerRow = () => {
    setPlayerRows(prev => [...prev, { name: '' }]);
    setTimeout(() => {
      if (rowInputRefs.current[playerRows.length]) {
        rowInputRefs.current[playerRows.length]?.focus();
      }
    }, 50);
  };

  const handleAddMultipleRows = (count = 5) => {
    const newRows = Array.from({ length: count }, () => ({ name: '' }));
    setPlayerRows(prev => [...prev, ...newRows]);
  };

  const handleRemovePlayerRow = (idx) => {
    setPlayerRows(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ name: '' }]));
  };

  const handlePlayerRowChange = (idx, value) => {
    setPlayerRows(prev => prev.map((r, i) => i === idx ? { name: value } : r));
  };

  const handleRowKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx === playerRows.length - 1) {
        handleAddPlayerRow();
      } else if (rowInputRefs.current[idx + 1]) {
        rowInputRefs.current[idx + 1].focus();
      }
    }
  };

  const parseBulkNames = () => {
    if (!bulkText.trim()) return [];
    return bulkText
      .split(/[\n,]+/)
      .map(name => name.replace(/^\d+[\.\)\-]?\s*/, '').trim()) // remove leading numbering like "1. ", "1 - "
      .filter(name => name.length > 0);
  };

  const handleConvertBulkToRows = () => {
    const names = parseBulkNames();
    if (names.length === 0) {
      setPlayerError('Please paste at least one player name.');
      return;
    }
    setPlayerRows(names.map(name => ({ name })));
    setPlayerInputMode('rows');
    setPlayerError('');
  };

  const handleAddPlayers = async (e) => {
    e.preventDefault();
    setPlayerError('');

    let namesToAdd = [];
    if (playerInputMode === 'rows') {
      namesToAdd = playerRows.map(r => r.name.trim()).filter(n => n !== '');
    } else {
      namesToAdd = parseBulkNames();
    }

    if (namesToAdd.length === 0) {
      setPlayerError('Please enter at least one valid player name.');
      return;
    }

    setAddingPlayers(true);
    const payload = namesToAdd.map(name => ({
      name,
      team: selectedTeam.id
    }));

    try {
      await api.post('/tournaments/players/', payload);
      setShowPlayerModal(false);
      await fetchTeams();
    } catch (bulkErr) {
      console.warn('Bulk player add error, trying one-by-one fallback:', bulkErr);
      const errors = [];
      for (const item of payload) {
        try {
          await api.post('/tournaments/players/', item);
        } catch (err) {
          let msg = err.message;
          if (err.response?.data) {
            if (err.response.data.detail) msg = err.response.data.detail;
            else if (err.response.data.name) msg = err.response.data.name[0];
            else if (typeof err.response.data === 'object') {
              msg = Object.values(err.response.data)[0];
              if (Array.isArray(msg)) msg = msg[0];
            }
          }
          errors.push(`"${item.name}": ${msg}`);
        }
      }

      if (errors.length > 0) {
        setPlayerError('Some players could not be added:\n' + errors.join('\n'));
      } else {
        setShowPlayerModal(false);
      }
      await fetchTeams();
    } finally {
      setAddingPlayers(false);
    }
  };

  // ─── Edit player handlers ──────────────────────────────────────────────────
  const openEditPlayer = (player) => {
    setEditPlayerForm({
      id: player.id,
      name: player.name,
      jersey_number: player.jersey_number ?? '',
      position: player.position ?? ''
    });
    setEditError('');
    setShowEditPlayerModal(true);
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    if (!editPlayerForm.name.trim()) {
      setEditError('Player name is required.');
      return;
    }
    setUpdatingPlayer(true);
    setEditError('');
    try {
      await api.patch(`/tournaments/players/${editPlayerForm.id}/`, {
        name: editPlayerForm.name.trim(),
        jersey_number: editPlayerForm.jersey_number ? parseInt(editPlayerForm.jersey_number, 10) : null,
        position: editPlayerForm.position.trim()
      });
      setShowEditPlayerModal(false);
      fetchTeams();
    } catch (err) {
      let msg = err.response?.data?.detail || err.response?.data?.name?.[0] || err.message;
      setEditError('Error updating player: ' + msg);
    } finally {
      setUpdatingPlayer(false);
    }
  };

  // ─── Delete player handler ─────────────────────────────────────────────────
  const handleDeletePlayer = async (playerId, playerName) => {
    if (window.confirm(`Remove "${playerName}" from the roster?`)) {
      try {
        await api.delete(`/tournaments/players/${playerId}/`);
        fetchTeams();
      } catch (err) {
        alert('Error deleting player: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  // ─── Shared styles ─────────────────────────────────────────────────────────
  const overlayStyle = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    backdropFilter: 'blur(4px)', padding: '16px'
  };
  const inputStyle = {
    width: '100%', padding: '10px 14px', backgroundColor: '#1D2128',
    border: '1px solid #334155', borderRadius: '8px', color: 'white',
    boxSizing: 'border-box', outline: 'none', fontSize: '0.9rem'
  };

  const detectedBulkCount = parseBulkNames().length;
  const activeRowsCount = playerRows.filter(r => r.name.trim()).length;

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Teams &amp; Roster Manager</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
            Registered teams across all active tournaments and player rosters.
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowTeamModal(true)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={16} /> Add New Team
            </button>
            {teams.length > 0 && (
              <button
                onClick={handleClearAllTeams}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
                title="Wipe all registered teams and rosters"
              >
                <Trash2 size={15} /> Clear All Teams
              </button>
            )}
          </div>
        )}
      </div>

      {/* Teams grid */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No teams registered yet.</div>
      ) : (
        <div className="responsive-grid-2">
          {teams.map(team => {
            const tournamentObj = tournaments.find(t => t.id === team.tournament);
            return (
              <div key={team.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                {/* Team header row */}
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
                          style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          title="Delete Team"
                          style={{ backgroundColor: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Roster */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={15} color="#94a3b8" /> Roster ({team.players?.length || 0})
                    </span>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => openAddPlayersModal(team)}
                        style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '4px 10px', transition: 'all 0.2s' }}
                      >
                        <UserPlus size={14} /> Add Players
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto', paddingRight: '2px' }}>
                    {team.players?.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed #334155' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>No players added to squad yet.</span>
                      </div>
                    ) : (
                      team.players?.map((p, idx) => (
                        <div key={p.id || `${p.name}_${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '8px 12px', backgroundColor: '#1D2128', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            {p.jersey_number !== null && p.jersey_number !== undefined && p.jersey_number !== '' && (
                              <span style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.3)' }}>
                                #{p.jersey_number}
                              </span>
                            )}
                            <span style={{ fontWeight: '600', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.name}
                            </span>
                            {p.position && (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', backgroundColor: '#0f172a', padding: '1px 5px', borderRadius: '4px' }}>
                                {p.position}
                              </span>
                            )}
                          </div>
                          {user?.role === 'ADMIN' && (
                            <div style={{ display: 'flex', gap: '6px', marginLeft: '8px', flexShrink: 0 }}>
                              <button
                                onClick={() => openEditPlayer(p)}
                                title="Edit Player Name"
                                style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '5px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600' }}
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeletePlayer(p.id, p.name)}
                                title="Remove Player"
                                style={{ backgroundColor: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '5px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          )}
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

      {/* ── Add Team Modal ─────────────────────────────────────────────────── */}
      {showTeamModal && (
        <div style={overlayStyle}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px' }}>Register New Team</h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Select Tournament</label>
                <select value={teamForm.tournament} onChange={e => setTeamForm({ ...teamForm, tournament: e.target.value })} style={inputStyle}>
                  {tournaments.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Team Name</label>
                <input type="text" required placeholder="e.g. Red Dragons FC" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowTeamModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Team Modal ────────────────────────────────────────────────── */}
      {showEditTeamModal && (
        <div style={overlayStyle}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={20} color="#3b82f6" /> Edit Team
            </h3>
            <form onSubmit={handleUpdateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Select Tournament</label>
                <select value={editTeamForm.tournament} onChange={e => setEditTeamForm({ ...editTeamForm, tournament: e.target.value })} style={inputStyle}>
                  {tournaments.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>Team Name</label>
                <input type="text" required value={editTeamForm.name} onChange={e => setEditTeamForm({ ...editTeamForm, name: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEditTeamModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Players Modal (Multi-add with Row & Bulk Paste modes) ─────────── */}
      {showPlayerModal && selectedTeam && (
        <div style={overlayStyle}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                <UserPlus size={20} color="#10b981" /> Add Players to {selectedTeam.name}
              </h3>
              <button
                onClick={() => setShowPlayerModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', backgroundColor: '#111827', padding: '4px', borderRadius: '8px', marginBottom: '16px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setPlayerInputMode('rows')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: playerInputMode === 'rows' ? '#10b981' : 'transparent',
                  color: playerInputMode === 'rows' ? '#0f172a' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                <Users size={15} /> Row by Row
              </button>
              <button
                type="button"
                onClick={() => setPlayerInputMode('bulk')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: playerInputMode === 'bulk' ? '#10b981' : 'transparent',
                  color: playerInputMode === 'bulk' ? '#0f172a' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                <Sparkles size={15} /> Bulk Paste Roster
              </button>
            </div>

            {playerError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem', marginBottom: '12px', whiteSpace: 'pre-line' }}>
                {playerError}
              </div>
            )}

            <form onSubmit={handleAddPlayers} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {playerInputMode === 'rows' ? (
                /* ── Mode 1: Dynamic Rows ────────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Tip: Press <kbd style={{ backgroundColor: '#1E293B', padding: '2px 5px', borderRadius: '4px', border: '1px solid #475569', color: '#38bdf8' }}>Enter</kbd> to jump or add the next player.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddMultipleRows(5)}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                    >
                      + Add 5 Rows
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', marginBottom: '12px' }}>
                    {playerRows.map((row, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', width: '22px', textAlign: 'right', fontWeight: '700' }}>
                          {idx + 1}.
                        </span>
                        <input
                          ref={el => rowInputRefs.current[idx] = el}
                          type="text"
                          placeholder={`Player ${idx + 1} full name`}
                          value={row.name}
                          onChange={e => handlePlayerRowChange(idx, e.target.value)}
                          onKeyDown={e => handleRowKeyDown(e, idx)}
                          autoFocus={idx === 0}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        {playerRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePlayerRow(idx)}
                            title="Remove row"
                            style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '6px', padding: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={handleAddPlayerRow}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', padding: '6px 12px' }}
                    >
                      <Plus size={14} /> Add Another Player Row
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Mode 2: Bulk Textarea ───────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>
                    Paste player names (one per line or separated by commas):
                  </label>
                  <textarea
                    rows={8}
                    placeholder={"Lionel Messi\nCristiano Ronaldo\nKylian Mbappe\nLuka Modric\nKevin De Bruyne"}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '160px', fontFamily: 'inherit', lineHeight: '1.5' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: detectedBulkCount > 0 ? '#10b981' : '#94a3b8', fontWeight: '700' }}>
                      {detectedBulkCount > 0 ? `✨ ${detectedBulkCount} player${detectedBulkCount !== 1 ? 's' : ''} detected` : 'No player names entered yet'}
                    </span>
                    {detectedBulkCount > 0 && (
                      <button
                        type="button"
                        onClick={handleConvertBulkToRows}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                      >
                        Convert to Rows →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button type="button" onClick={() => setShowPlayerModal(false)} className="btn-secondary">Cancel</button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={addingPlayers || (playerInputMode === 'rows' ? activeRowsCount === 0 : detectedBulkCount === 0)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {addingPlayers ? (
                    'Adding Players…'
                  ) : (
                    <>
                      <Check size={16} />
                      {playerInputMode === 'rows'
                        ? `Add ${activeRowsCount || ''} Player${activeRowsCount !== 1 ? 's' : ''}`
                        : `Add ${detectedBulkCount || ''} Player${detectedBulkCount !== 1 ? 's' : ''}`
                      }
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Player Modal ──────────────────────────────────────────────── */}
      {showEditPlayerModal && (
        <div style={overlayStyle}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                <Pencil size={18} color="#3b82f6" /> Edit Player Details
              </h3>
              <button
                onClick={() => setShowEditPlayerModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem', marginBottom: '14px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdatePlayer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Player Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cristiano Ronaldo"
                  value={editPlayerForm.name}
                  onChange={e => setEditPlayerForm({ ...editPlayerForm, name: e.target.value })}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    placeholder="e.g. 7"
                    value={editPlayerForm.jersey_number}
                    onChange={e => setEditPlayerForm({ ...editPlayerForm, jersey_number: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                    Position
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Forward, GK"
                    value={editPlayerForm.position}
                    onChange={e => setEditPlayerForm({ ...editPlayerForm, position: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowEditPlayerModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={updatingPlayer} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> {updatingPlayer ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

