import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Trophy, Plus, Users, Calendar, ArrowLeft, Trash2, RotateCcw, Pencil } from 'lucide-react';
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
    scheduled_date: new Date().toISOString().split('T')[0]
  });

  const [selectedTeams, setSelectedTeams] = useState([]);
  const [bracketGenerating, setBracketGenerating] = useState(false);
  const [bracketResetting, setBracketResetting] = useState(false);
  const [activeTab, setActiveTab] = useState('SCHEDULE'); // SCHEDULE or BRACKET

  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  const [editMatchForm, setEditMatchForm] = useState({
    id: null,
    home_team: '',
    away_team: '',
    scheduled_date: ''
  });

  const handleAutoSelect = (count) => {
    if (!tournament?.teams || tournament.teams.length < count) {
      alert(`Tournament only has ${tournament?.teams?.length || 0} teams. Need at least ${count} teams.`);
      return;
    }
    const autoIds = tournament.teams.slice(0, count).map(t => t.id);
    setSelectedTeams(autoIds);
  };

  const handleGenerateBracket = async () => {
    let teamsToUse = [...selectedTeams];

    if (teamsToUse.length === 0) {
      if (tournament?.teams?.length >= 8) {
        teamsToUse = tournament.teams.slice(0, 8).map(t => t.id);
        setSelectedTeams(teamsToUse);
      } else if (tournament?.teams?.length >= 4) {
        teamsToUse = tournament.teams.slice(0, 4).map(t => t.id);
        setSelectedTeams(teamsToUse);
      } else {
        alert(`Tournament needs at least 4 teams to generate a knockout bracket.`);
        return;
      }
    } else if (teamsToUse.length !== 4 && teamsToUse.length !== 8) {
      alert(`Please select exactly 4 or 8 teams (currently ${teamsToUse.length} selected). Use the Auto-Select buttons for instant selection.`);
      return;
    }

    setBracketGenerating(true);
    try {
      await api.post(`/tournaments/tournaments/${id}/generate_bracket/`, {
        team_ids: teamsToUse
      });
      alert('🏆 Knockout Bracket generated successfully!');
      await fetchData();
      setSelectedTeams([]);
    } catch (err) {
      console.error('Failed to generate bracket:', err);
      alert('Failed to generate bracket: ' + (err.response?.data?.error || err.response?.data?.detail || err.message));
    } finally {
      setBracketGenerating(false);
    }
  };

  const handleResetBracket = async () => {
    if (!window.confirm('⚠️ Are you sure you want to completely RESET and delete the Knockout Bracket? All knockout fixtures and scores will be permanently removed!')) {
      return;
    }
    setBracketResetting(true);
    try {
      await api.post(`/tournaments/tournaments/${id}/reset_bracket/`);
      alert('Knockout Bracket has been reset successfully!');
      fetchData();
      setSelectedTeams([]);
    } catch (err) {
      console.warn('Dedicated reset_bracket endpoint error, attempting fallback match deletion...', err);
      try {
        const knockoutMatches = matches.filter(m => m.stage !== 'REGULAR');
        if (knockoutMatches.length > 0) {
          await Promise.all(knockoutMatches.map(m => api.delete(`/tournaments/matches/${m.id}/`)));
          alert('Knockout Bracket has been reset successfully!');
          fetchData();
          setSelectedTeams([]);
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback deletion error:', fallbackErr);
      }
      alert('Failed to reset bracket: ' + (err.response?.data?.error || err.response?.data?.detail || err.message));
    } finally {
      setBracketResetting(false);
    }
  };

  const handleToggleTeamSelection = (teamId) => {
    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else {
        if (prev.length >= 8) {
          alert('You can select a maximum of 8 teams.');
          return prev;
        }
        return [...prev, teamId];
      }
    });
  };

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

  const handleEditMatch = (m) => {
    const dateStr = m.scheduled_time ? m.scheduled_time.split('T')[0] : '';
    setEditMatchForm({
      id: m.id,
      home_team: m.home_team ? String(m.home_team) : '',
      away_team: m.away_team ? String(m.away_team) : '',
      scheduled_date: dateStr
    });
    setShowEditMatchModal(true);
  };

  const handleUpdateMatch = async (e) => {
    e.preventDefault();
    if (editMatchForm.home_team === editMatchForm.away_team) {
      alert('Home and Away teams must be different');
      return;
    }
    try {
      await api.patch(`/tournaments/matches/${editMatchForm.id}/`, {
        home_team: editMatchForm.home_team,
        away_team: editMatchForm.away_team,
        scheduled_time: `${editMatchForm.scheduled_date}T00:00:00Z`
      });
      setShowEditMatchModal(false);
      fetchData();
    } catch (err) {
      alert('Error updating match: ' + (err.response?.data?.detail || err.message));
    }
  };

  const bracketMatches = matches.filter(m => m.stage !== 'REGULAR');
  const hasBracket = bracketMatches.length > 0;
  const getBracketMatch = (code) => bracketMatches.find(m => m.bracket_code === code);

  const renderBracketNode = (code, labelText) => {
    const m = getBracketMatch(code);
    if (!m) return null;
    
    // For placeholders, derive the label text indicating which match winner goes here
    let homePlaceholder = 'TBD';
    let awayPlaceholder = 'TBD';
    if (code === 'SF1') {
      homePlaceholder = 'Winner of QF1';
      awayPlaceholder = 'Winner of QF2';
    } else if (code === 'SF2') {
      homePlaceholder = 'Winner of QF3';
      awayPlaceholder = 'Winner of QF4';
    } else if (code === 'F') {
      homePlaceholder = 'Winner of SF1';
      awayPlaceholder = 'Winner of SF2';
    }

    const homeName = m.home_team_details?.name || homePlaceholder;
    const awayName = m.away_team_details?.name || awayPlaceholder;
    
    const isFinished = m.status === 'ENDED';
    const homeWon = isFinished && m.home_score > m.away_score;
    const awayWon = isFinished && m.away_score > m.home_score;
    
    return (
      <div className="glass-panel" style={{
        padding: '10px 12px',
        width: '200px',
        backgroundColor: '#1D2128',
        border: m.status === 'LIVE' || m.status === 'PAUSED' ? '2px solid #ef4444' : m.is_next_match ? '2px solid #f59e0b' : '1px solid #334155',
        borderRadius: '8px',
        position: 'relative'
      }}>
        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{labelText}</span>
          {(m.status === 'LIVE' || m.status === 'PAUSED') && <span style={{ color: '#ef4444' }}>● LIVE</span>}
        </div>
        
        {/* Home Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #2d3748' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: homeWon ? '800' : '500', color: homeWon ? '#10b981' : m.home_team ? '#f8fafc' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
            {homeName}
          </span>
          {m.status !== 'SCHEDULED' && (
            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: homeWon ? '#10b981' : '#cbd5e1' }}>
              {m.home_score}
            </span>
          )}
        </div>
        
        {/* Away Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: awayWon ? '800' : '500', color: awayWon ? '#10b981' : m.away_team ? '#f8fafc' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
            {awayName}
          </span>
          {m.status !== 'SCHEDULED' && (
            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: awayWon ? '#10b981' : '#cbd5e1' }}>
              {m.away_score}
            </span>
          )}
        </div>
      </div>
    );
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

      {/* 1.7 ADMIN KNOCKOUT BRACKET GENERATOR */}
      {user?.role === 'ADMIN' && tournament.teams && tournament.teams.length >= 4 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderTop: '3px solid #10b981' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '8px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🏆 Knockout Bracket Generator (Admin Only)
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '14px' }}>
            Select exactly **4 teams** (for Semi-Finals) or **8 teams** (for Quarter-Finals) to build the single-elimination tournament tree automatically.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {tournament.teams.map(t => {
              const isSelected = selectedTeams.includes(t.id);
              const orderIndex = selectedTeams.indexOf(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => handleToggleTeamSelection(t.id)}
                  type="button"
                  style={{
                    backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#1D2128',
                    border: isSelected ? '1px solid #10b981' : '1px solid #334155',
                    color: isSelected ? '#10b981' : '#cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#10b981' : '#334155',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem'
                  }}>
                    {isSelected ? orderIndex + 1 : ''}
                  </span>
                  {t.name}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8' }}>
              Selected: <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>{selectedTeams.length}</strong> / {tournament.teams.length} teams
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {tournament.teams.length >= 4 && (
                <button
                  type="button"
                  onClick={() => handleAutoSelect(4)}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                >
                  ⚡ Auto Top 4
                </button>
              )}
              {tournament.teams.length >= 8 && (
                <button
                  type="button"
                  onClick={() => handleAutoSelect(8)}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                >
                  ⚡ Auto Top 8
                </button>
              )}
              {selectedTeams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTeams([])}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#ef4444' }}
                >
                  ↺ Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {hasBracket && (
                <button
                  onClick={handleResetBracket}
                  disabled={bracketResetting}
                  className="btn-danger"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={13} className={bracketResetting ? 'animate-spin' : ''} />
                  {bracketResetting ? 'Clearing...' : 'Reset Knockout Bracket'}
                </button>
              )}
              <button
                onClick={handleGenerateBracket}
                disabled={bracketGenerating}
                className="btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: '900',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={13} className={bracketGenerating ? 'animate-spin' : ''} />
                {bracketGenerating ? 'Generating Bracket...' : hasBracket ? '🏆 Regenerate Knockout Bracket' : '🏆 Generate Knockout Bracket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TABBED MATCH SCHEDULE & BRACKET VIEWS */}
      <div>
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '16px', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('SCHEDULE')}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'SCHEDULE' ? '3px solid #2B5748' : '3px solid transparent',
              color: activeTab === 'SCHEDULE' ? '#2B5748' : '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📅 Match Schedule ({matches.length})
          </button>
          
          {hasBracket && (
            <button
              onClick={() => setActiveTab('BRACKET')}
              style={{
                padding: '10px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'BRACKET' ? '3px solid #10b981' : '3px solid transparent',
                color: activeTab === 'BRACKET' ? '#10b981' : '#94a3b8',
                fontSize: '0.9rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🏆 Tournament Bracket Tree
            </button>
          )}
        </div>

        {activeTab === 'SCHEDULE' ? (
          <div>
            {matches.length === 0 ? (
              <div className="glass-panel" style={{ padding: '24px', color: '#94a3b8', fontSize: '0.9rem' }}>No matches scheduled yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {matches.map(m => (
                  <div key={m.id} className="glass-panel card-hover" style={{
                    padding: '20px',
                    border: m.status === 'LIVE' || m.status === 'PAUSED'
                      ? '2px solid #ef4444'
                      : m.is_next_match
                        ? '2px solid #f59e0b'
                        : '1px solid #334155'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <StatusBadge status={m.status} />
                        {m.stage !== 'REGULAR' && (
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            {m.stage.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>
                        📅 Date: {formatDateDDMMYYYY(m.scheduled_time)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>
                        {m.home_team_details?.name || (m.stage !== 'REGULAR' ? 'TBD' : 'Home')}
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
                        {m.away_team_details?.name || (m.stage !== 'REGULAR' ? 'TBD' : 'Away')}
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleEditMatch(m)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Pencil size={13} /> Edit Match
                        </button>
                      )}
                      <Link to={`/matches/${m.id}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', marginLeft: 'auto' }}>
                        Open Match Console
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* BRACKET TREE RENDERING */
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center', justifyContent: 'center', minWidth: '700px', padding: '20px 10px' }}>
              {/* Quarter Finals */}
              {getBracketMatch('QF1') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {renderBracketNode('QF1', 'Quarter-Final 1')}
                  {renderBracketNode('QF2', 'Quarter-Final 2')}
                  {renderBracketNode('QF3', 'Quarter-Final 3')}
                  {renderBracketNode('QF4', 'Quarter-Final 4')}
                </div>
              )}
              
              {/* Semi Finals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '110px' }}>
                {renderBracketNode('SF1', 'Semi-Final 1')}
                {renderBracketNode('SF2', 'Semi-Final 2')}
              </div>
              
              {/* Final */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '2.5rem', animation: 'floatTrophy 3s infinite ease-in-out' }}>🏆</div>
                {renderBracketNode('F', 'Championship Final')}
              </div>
              
              <style>{`
                @keyframes floatTrophy {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-8px); }
                }
              `}</style>
            </div>
          </div>
        )}
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
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Match Date</label>
                <input
                  type="date"
                  required
                  value={matchForm.scheduled_date}
                  onChange={e => setMatchForm({ ...matchForm, scheduled_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontWeight: '700', colorScheme: 'dark' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowMatchModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Schedule Match</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {showEditMatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={18} color="#3b82f6" /> Edit Match
            </h3>
            <form onSubmit={handleUpdateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Home Team</label>
                <select
                  required
                  value={editMatchForm.home_team}
                  onChange={e => setEditMatchForm({ ...editMatchForm, home_team: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                >
                  <option value="">Select Home Team</option>
                  {tournament.teams?.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Away Team</label>
                <select
                  required
                  value={editMatchForm.away_team}
                  onChange={e => setEditMatchForm({ ...editMatchForm, away_team: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                >
                  <option value="">Select Away Team</option>
                  {tournament.teams?.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Match Date</label>
                <input
                  type="date"
                  required
                  value={editMatchForm.scheduled_date}
                  onChange={e => setEditMatchForm({ ...editMatchForm, scheduled_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1D2128', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontWeight: '700', colorScheme: 'dark' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEditMatchModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
