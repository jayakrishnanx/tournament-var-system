import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Trophy, Award, Activity, ArrowLeft, RotateCcw, Trash2, LayoutList, GitMerge, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCache, subscribeMatches } from '../services/firebaseService';

export const Bracket = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState(() => getCache('tournaments', []));
  const [selectedTournament, setSelectedTournament] = useState(() => {
    const cached = getCache('tournaments', []);
    return cached.length > 0 ? cached[0].id : '';
  });
  const [tournament, setTournament] = useState(() => {
    const cached = getCache('tournaments', []);
    return cached.length > 0 ? cached[0] : null;
  });
  const [matches, setMatches] = useState(() => {
    const cachedT = getCache('tournaments', []);
    const cachedM = getCache('matches', []);
    const tId = cachedT.length > 0 ? cachedT[0].id : null;
    return tId ? cachedM.filter(m => String(m.tournament) === String(tId)) : cachedM;
  });
  const [teams, setTeams] = useState(() => {
    const cachedT = getCache('tournaments', []);
    const cachedTm = getCache('teams', []);
    const tId = cachedT.length > 0 ? cachedT[0].id : null;
    return tId ? cachedTm.filter(t => String(t.tournament) === String(tId)) : cachedTm;
  });
  const [loading, setLoading] = useState(false);

  // Generator & Reset states for admin
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [bracketGenerating, setBracketGenerating] = useState(false);
  const [bracketResetting, setBracketResetting] = useState(false);

  // View preferences for mobile / desktop
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'tree'
  const [stageFilter, setStageFilter] = useState('ALL'); // 'ALL', 'QF', 'SF', 'F'

  const fetchAll = async (tId) => {
    try {
      const [tRes, mRes, tmRes] = await Promise.all([
        api.get(`/tournaments/tournaments/${tId}/`),
        api.get(`/tournaments/matches/?tournament=${tId}`),
        api.get(`/tournaments/teams/?tournament=${tId}`)
      ]);
      if (tRes.data) setTournament(tRes.data);
      if (mRes.data) setMatches(mRes.data);
      if (tmRes.data) setTeams(tmRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('/tournaments/tournaments/');
        if (res.data?.length > 0) {
          setTournaments(res.data);
          if (!selectedTournament) {
            const firstId = res.data[0].id;
            setSelectedTournament(firstId);
            await fetchAll(firstId);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchAll(selectedTournament);
      const unsub = subscribeMatches(selectedTournament, (liveMatches) => {
        if (liveMatches && liveMatches.length > 0) {
          setMatches(liveMatches);
        }
      });
      return () => unsub();
    }
  }, [selectedTournament]);

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

  const handleAutoSelect = (count) => {
    if (teams.length < count) {
      alert(`Tournament only has ${teams.length} teams. Need at least ${count} teams.`);
      return;
    }
    const autoIds = teams.slice(0, count).map(t => t.id);
    setSelectedTeams(autoIds);
  };

  const handleGenerateBracket = async () => {
    let teamsToUse = [...selectedTeams];

    // If no teams are manually selected, auto-select 8 (if available) or 4
    if (teamsToUse.length === 0) {
      if (teams.length >= 8) {
        teamsToUse = teams.slice(0, 8).map(t => t.id);
        setSelectedTeams(teamsToUse);
      } else if (teams.length >= 4) {
        teamsToUse = teams.slice(0, 4).map(t => t.id);
        setSelectedTeams(teamsToUse);
      } else {
        alert(`Tournament needs at least 4 teams to generate a knockout bracket. Currently has ${teams.length} teams.`);
        return;
      }
    } else if (teamsToUse.length !== 4 && teamsToUse.length !== 8) {
      alert(`Please select exactly 4 or 8 teams (currently ${teamsToUse.length} selected). Use the Auto-Select buttons below for instant selection.`);
      return;
    }

    if (!selectedTournament) {
      alert('No tournament selected. Please select a tournament first.');
      return;
    }

    setBracketGenerating(true);
    try {
      await api.post(`/tournaments/tournaments/${selectedTournament}/generate_bracket/`, {
        team_ids: teamsToUse
      });
      alert('🏆 Knockout Bracket generated successfully!');
      await fetchAll(selectedTournament);
      setSelectedTeams([]);
    } catch (err) {
      console.error('Failed to generate bracket:', err);
      alert('Failed to generate bracket: ' + (err.response?.data?.error || err.response?.data?.detail || err.message));
    } finally {
      setBracketGenerating(false);
    }
  };

  const handleResetBracket = async () => {
    if (!window.confirm('⚠️ Are you sure you want to completely RESET and delete the Knockout Bracket? All knockout fixtures, scores, and results will be permanently removed!')) {
      return;
    }
    setBracketResetting(true);
    try {
      await api.post(`/tournaments/tournaments/${selectedTournament}/reset_bracket/`);
      alert('Knockout Bracket has been reset successfully!');
      fetchAll(selectedTournament);
      setSelectedTeams([]);
    } catch (err) {
      console.warn('Dedicated reset_bracket endpoint error, attempting fallback match deletion...', err);
      try {
        const knockoutMatches = matches.filter(m => m.stage !== 'REGULAR');
        if (knockoutMatches.length > 0) {
          await Promise.all(knockoutMatches.map(m => api.delete(`/tournaments/matches/${m.id}/`)));
          alert('Knockout Bracket has been reset successfully!');
          fetchAll(selectedTournament);
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

  const bracketMatches = matches.filter(m => (m.stage && m.stage !== 'REGULAR') || Boolean(m.bracket_code));
  const hasBracket = bracketMatches.length > 0;
  const getBracketMatch = (code) => bracketMatches.find(m => m.bracket_code === code);
  const hasQuarterFinals = Boolean(getBracketMatch('QF1'));

  const renderBracketNode = (code, labelText, isTree = false) => {
    const m = getBracketMatch(code);
    if (!m) return null;

    let homePlaceholder = 'TBD';
    let awayPlaceholder = 'TBD';
    if (code === 'SF1') {
      homePlaceholder = 'Winner of QF1';
      awayPlaceholder = 'Winner of QF2';
    } else if (code === 'SF2') {
      homePlaceholder = 'Winner of QF3';
      awayPlaceholder = 'Winner of QF4';
    } else if (code === 'F') {
      homePlaceholder = hasQuarterFinals ? 'Winner of SF1' : 'Winner of Semi 1';
      awayPlaceholder = hasQuarterFinals ? 'Winner of SF2' : 'Winner of Semi 2';
    }

    const homeTeamObj = teams.find(t => String(t.id) === String(m.home_team));
    const awayTeamObj = teams.find(t => String(t.id) === String(m.away_team));

    const homeName = m.home_team_details?.name || (homeTeamObj ? homeTeamObj.name : null) || (m.home_team ? 'Team' : homePlaceholder);
    const awayName = m.away_team_details?.name || (awayTeamObj ? awayTeamObj.name : null) || (m.away_team ? 'Team' : awayPlaceholder);

    const isFinished = m.status === 'ENDED';
    const isLive = m.status === 'LIVE' || m.status === 'PAUSED';
    const homeWon = isFinished && m.home_score > m.away_score;
    const awayWon = isFinished && m.away_score > m.home_score;

    return (
      <div
        className="glass-panel"
        style={{
          padding: '12px 14px',
          width: isTree ? '230px' : '100%',
          maxWidth: isTree ? '230px' : '500px',
          margin: isTree ? '0' : '0 auto',
          backgroundColor: '#1D2128',
          border: isLive
            ? '2px solid #ef4444'
            : m.is_next_match
            ? '2px solid #f59e0b'
            : isFinished
            ? '1px solid #3b82f6'
            : '1px solid #334155',
          borderRadius: '10px',
          boxShadow: isLive
            ? '0 0 15px rgba(239, 68, 68, 0.3)'
            : '0 4px 12px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          transition: 'transform 0.2s'
        }}
      >
        {/* Card Header: Stage Title & Live badge */}
        <div style={{
          fontSize: '0.7rem',
          fontWeight: '800',
          color: code === 'F' ? '#f59e0b' : '#10b981',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {code === 'F' ? '🏆 ' : ''}{labelText}
          </span>
          {isLive && (
            <span style={{
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '900',
              fontSize: '0.65rem'
            }}>
              ● LIVE
            </span>
          )}
          {isFinished && (
            <span style={{
              color: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '700',
              fontSize: '0.65rem'
            }}>
              FINAL
            </span>
          )}
        </div>

        {/* Home Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 8px',
          borderRadius: '6px',
          backgroundColor: homeWon ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
          borderLeft: homeWon ? '3px solid #10b981' : '3px solid transparent',
          marginBottom: '4px'
        }}>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: homeWon ? '900' : '600',
            color: homeWon ? '#10b981' : m.home_team ? '#f8fafc' : '#94a3b8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px'
          }}>
            {homeName}
          </span>
          {m.status !== 'SCHEDULED' ? (
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '900',
              color: homeWon ? '#10b981' : '#cbd5e1',
              padding: '0 4px'
            }}>
              {m.home_score}
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>-</span>
          )}
        </div>

        {/* Away Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 8px',
          borderRadius: '6px',
          backgroundColor: awayWon ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
          borderLeft: awayWon ? '3px solid #10b981' : '3px solid transparent'
        }}>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: awayWon ? '900' : '600',
            color: awayWon ? '#10b981' : m.away_team ? '#f8fafc' : '#94a3b8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px'
          }}>
            {awayName}
          </span>
          {m.status !== 'SCHEDULED' ? (
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '900',
              color: awayWon ? '#10b981' : '#cbd5e1',
              padding: '0 4px'
            }}>
              {m.away_score}
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>-</span>
          )}
        </div>

        {/* Footer: Action links */}
        <div style={{
          marginTop: '8px',
          paddingTop: '6px',
          borderTop: '1px solid #2d3748',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
            {m.bracket_code}
          </span>
          <Link
            to={`/matches/${m.id}`}
            style={{
              fontSize: '0.72rem',
              color: '#3b82f6',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            View Match →
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.4rem',
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#f8fafc',
            margin: 0
          }}>
            🏆 Tournament Knockout Bracket
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '3px' }}>
            Single-elimination championship tree (Quarter-Finals, Semi-Finals & Finals).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {tournaments.length > 1 && (
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#1D2128',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: '700'
              }}
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Quick Admin Reset Button in Header if Bracket Exists */}
          {user?.role === 'ADMIN' && hasBracket && (
            <button
              onClick={handleResetBracket}
              disabled={bracketResetting}
              className="btn-danger"
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={13} className={bracketResetting ? 'animate-spin' : ''} />
              {bracketResetting ? 'Resetting...' : 'Reset Bracket'}
            </button>
          )}
        </div>
      </div>

      {/* ADMIN GENERATOR PANEL */}
      {user?.role === 'ADMIN' && teams.length >= 4 && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              ⚙️ Admin Bracket Generator & Manager
            </h3>
            {hasBracket && (
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: '800' }}>
                ACTIVE BRACKET
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8' }}>
              Selected: <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>{selectedTeams.length}</strong> / {teams.length} teams
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {teams.length >= 4 && (
                <button
                  type="button"
                  onClick={() => handleAutoSelect(4)}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                >
                  ⚡ Auto Top 4
                </button>
              )}
              {teams.length >= 8 && (
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

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {teams.map(t => {
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
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#10b981' : '#334155',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem'
                  }}>
                    {isSelected ? orderIndex + 1 : ''}
                  </span>
                  {t.name}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Reset Bracket Button */}
              {hasBracket && (
                <button
                  onClick={handleResetBracket}
                  disabled={bracketResetting}
                  className="btn-danger"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.78rem',
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

              {/* Generate / Regenerate Button */}
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

      {/* VIEW MODE & STAGE TOGGLES (FOR PERFECT MOBILE/DESKTOP ALIGNMENT) */}
      {hasBracket && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Stage Filter Buttons (Mobile Friendly) */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch'
          }}>
            <button
              onClick={() => setStageFilter('ALL')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: stageFilter === 'ALL' ? '#2B5748' : '#1D2128',
                color: stageFilter === 'ALL' ? '#ffffff' : '#94a3b8',
                border: stageFilter === 'ALL' ? '1px solid #10b981' : '1px solid #334155'
              }}
            >
              All Stages
            </button>
            {hasQuarterFinals && (
              <button
                onClick={() => setStageFilter('QF')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  backgroundColor: stageFilter === 'QF' ? '#2B5748' : '#1D2128',
                  color: stageFilter === 'QF' ? '#ffffff' : '#94a3b8',
                  border: stageFilter === 'QF' ? '1px solid #10b981' : '1px solid #334155'
                }}
              >
                ⚽ Quarter-Finals
              </button>
            )}
            <button
              onClick={() => setStageFilter('SF')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: stageFilter === 'SF' ? '#2B5748' : '#1D2128',
                color: stageFilter === 'SF' ? '#ffffff' : '#94a3b8',
                border: stageFilter === 'SF' ? '1px solid #10b981' : '1px solid #334155'
              }}
            >
              🥊 Semi-Finals
            </button>
            <button
              onClick={() => setStageFilter('F')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: stageFilter === 'F' ? '#2B5748' : '#1D2128',
                color: stageFilter === 'F' ? '#ffffff' : '#94a3b8',
                border: stageFilter === 'F' ? '1px solid #10b981' : '1px solid #334155'
              }}
            >
              🏆 Final
            </button>
          </div>

          {/* View Mode Switcher: Mobile List vs Tree Flow */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#1D2128', padding: '3px', borderRadius: '6px', border: '1px solid #334155' }}>
            <button
              onClick={() => setViewMode('list')}
              title="Stacked Stage View (Recommended on Mobile)"
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: viewMode === 'list' ? '#2B5748' : 'transparent',
                color: viewMode === 'list' ? 'white' : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LayoutList size={13} /> Cards
            </button>
            <button
              onClick={() => setViewMode('tree')}
              title="Interactive Bracket Tree"
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: viewMode === 'tree' ? '#2B5748' : 'transparent',
                color: viewMode === 'tree' ? 'white' : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <GitMerge size={13} /> Tree
            </button>
          </div>
        </div>
      )}

      {/* VISUAL BRACKET DISPLAY */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          Loading knockout bracket...
        </div>
      ) : !hasBracket ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
            No Knockout Bracket Active
          </p>
          {user?.role === 'ADMIN' ? (
            <p style={{ fontSize: '0.85rem' }}>
              Select 4 or 8 teams in the Admin Generator above and click <strong>Generate Bracket</strong> to create fixtures.
            </p>
          ) : (
            <p style={{ fontSize: '0.85rem' }}>
              The tournament administrator will publish the single-elimination knockout bracket soon.
            </p>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* RESPONSIVE STACKED / CARDS VIEW (PERFECT FOR MOBILE PHONES & DESKTOPS) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>

          {/* ── Quarter Finals ── */}
          {(stageFilter === 'ALL' || stageFilter === 'QF') && hasQuarterFinals && (
            <div className="glass-panel" style={{ padding: '16px', width: '100%' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '900',
                color: '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
                paddingBottom: '6px',
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>⚽</span> QUARTER-FINALS (Round of 8)
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                width: '100%'
              }}>
                {renderBracketNode('QF1', 'Quarter-Final 1')}
                {renderBracketNode('QF2', 'Quarter-Final 2')}
                {renderBracketNode('QF3', 'Quarter-Final 3')}
                {renderBracketNode('QF4', 'Quarter-Final 4')}
              </div>
            </div>
          )}

          {/* Connector Badge */}
          {stageFilter === 'ALL' && hasQuarterFinals && (
            <div style={{ textAlign: 'center', margin: '-4px 0', color: '#64748b', fontSize: '0.72rem', fontWeight: '800' }}>
              ↓ WINNERS ADVANCE TO SEMI-FINALS ↓
            </div>
          )}

          {/* ── Semi Finals ── */}
          {(stageFilter === 'ALL' || stageFilter === 'SF') && (
            <div className="glass-panel" style={{ padding: '16px', width: '100%' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '900',
                color: '#3b82f6',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
                paddingBottom: '6px',
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🥊</span> SEMI-FINALS (Final 4)
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                width: '100%'
              }}>
                {renderBracketNode('SF1', 'Semi-Final 1')}
                {renderBracketNode('SF2', 'Semi-Final 2')}
              </div>
            </div>
          )}

          {/* Connector Badge */}
          {stageFilter === 'ALL' && (
            <div style={{ textAlign: 'center', margin: '-4px 0', color: '#64748b', fontSize: '0.72rem', fontWeight: '800' }}>
              ↓ WINNERS ADVANCE TO CHAMPIONSHIP FINAL ↓
            </div>
          )}

          {/* ── Championship Final ── */}
          {(stageFilter === 'ALL' || stageFilter === 'F') && (
            <div
              className="glass-panel"
              style={{
                padding: '20px',
                width: '100%',
                background: 'linear-gradient(135deg, rgba(29, 33, 40, 0.98), rgba(43, 87, 72, 0.25))',
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '2rem', animation: 'floatTrophy 3s infinite ease-in-out', display: 'inline-block' }}>🏆</div>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: '900',
                  color: '#f59e0b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginTop: '4px'
                }}>
                  Championship Grand Final
                </div>
              </div>

              <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                {renderBracketNode('F', 'Championship Final')}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* HORIZONTAL TREE FLOW (WITH SMOOTH SCROLLING FOR ALL SCREEN SIZES) */
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: hasQuarterFinals ? '760px' : '520px',
            padding: '16px 8px'
          }}>
            {/* Quarter Finals Column */}
            {hasQuarterFinals && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '0 0 auto' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', textAlign: 'center', marginBottom: '4px' }}>
                  ⚽ Quarter-Finals
                </div>
                {renderBracketNode('QF1', 'Quarter-Final 1', true)}
                {renderBracketNode('QF2', 'Quarter-Final 2', true)}
                {renderBracketNode('QF3', 'Quarter-Final 3', true)}
                {renderBracketNode('QF4', 'Quarter-Final 4', true)}
              </div>
            )}

            {/* Semi Finals Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: hasQuarterFinals ? '80px' : '20px', flex: '0 0 auto' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', textAlign: 'center', marginBottom: '4px' }}>
                🥊 Semi-Finals
              </div>
              {renderBracketNode('SF1', 'Semi-Final 1', true)}
              {renderBracketNode('SF2', 'Semi-Final 2', true)}
            </div>

            {/* Championship Final Column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', flex: '0 0 auto' }}>
              <div style={{ fontSize: '2.2rem', animation: 'floatTrophy 3s infinite ease-in-out' }}>🏆</div>
              <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', textAlign: 'center' }}>
                Championship Final
              </div>
              {renderBracketNode('F', 'Championship Final', true)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatTrophy {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};
