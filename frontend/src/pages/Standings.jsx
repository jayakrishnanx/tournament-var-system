import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getCache, saveCustomTopScorers, resetCustomTopScorers } from '../services/firebaseService';
import { Award, Pencil } from 'lucide-react';

export const Standings = () => {
  const { user } = useAuth();
  const [standings, setStandings] = useState([]);
  const [tournaments, setTournaments] = useState(() => getCache('tournaments', []));
  const [selectedTournament, setSelectedTournament] = useState(() => {
    const cached = getCache('tournaments', []);
    return cached.length > 0 ? cached[0].id : '';
  });
  const [stats, setStats] = useState({ top_scorers: [], yellow_cards: [], red_cards: [] });
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Edit Top Scorers modal state
  const [showScorersModal, setShowScorersModal] = useState(false);
  const [customScorersForm, setCustomScorersForm] = useState([
    { player_name: '', team_name: '', goals: 0 },
    { player_name: '', team_name: '', goals: 0 },
    { player_name: '', team_name: '', goals: 0 }
  ]);

  const handleResetStandings = async () => {
    if (!selectedTournament) return;
    if (!window.confirm('⚠️ Are you sure you want to RESET the Points Table?\n\nThis will:\n• Clear all goals and match events\n• Reset all regular match scores to 0-0\n• Mark all matches as SCHEDULED again\n\nThis cannot be undone!')) return;
    setResetting(true);
    try {
      const res = await api.post(`/tournaments/tournaments/${selectedTournament}/reset_standings/`);
      alert('✅ ' + res.data.success);
    } catch (err) {
      alert('Failed to reset: ' + (err.response?.data?.error || err.message));
    } finally {
      setResetting(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments/tournaments/');
      if (res.data?.length > 0) {
        setTournaments(res.data);
        if (!selectedTournament) {
          setSelectedTournament(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStandingsAndStats = async () => {
    try {
      const url = selectedTournament
        ? `/tournaments/matches/standings/?tournament=${selectedTournament}`
        : '/tournaments/matches/standings/';
      const statsUrl = selectedTournament
        ? `/tournaments/matches/stats/?tournament=${selectedTournament}`
        : '/tournaments/matches/stats/';

      const [sRes, stRes] = await Promise.all([
        api.get(url),
        api.get(statsUrl)
      ]);
      setStandings(sRes.data);
      if (stRes.data) setStats(stRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    fetchStandingsAndStats();
    const interval = setInterval(fetchStandingsAndStats, 10000);
    return () => clearInterval(interval);
  }, [selectedTournament]);

  const selectedTournObj = tournaments.find(t => String(t.id) === String(selectedTournament)) || tournaments[0];

  const topScorers = React.useMemo(() => {
    if (selectedTournObj && Array.isArray(selectedTournObj.custom_top_scorers) && selectedTournObj.custom_top_scorers.length > 0) {
      const validCustom = selectedTournObj.custom_top_scorers.filter(s => s && s.player_name && s.player_name.trim());
      if (validCustom.length > 0) return validCustom.slice(0, 3);
    }
    if (stats.top_scorers && stats.top_scorers.length > 0) {
      return stats.top_scorers.slice(0, 3);
    }
    return [];
  }, [stats, selectedTournObj]);

  const handleOpenEditScorers = () => {
    const current1 = topScorers[0] || { player_name: '', team_name: '', goals: 0 };
    const current2 = topScorers[1] || { player_name: '', team_name: '', goals: 0 };
    const current3 = topScorers[2] || { player_name: '', team_name: '', goals: 0 };

    setCustomScorersForm([
      { player_name: current1.player_name || '', team_name: current1.team_name || '', goals: current1.goals || 0 },
      { player_name: current2.player_name || '', team_name: current2.team_name || '', goals: current2.goals || 0 },
      { player_name: current3.player_name || '', team_name: current3.team_name || '', goals: current3.goals || 0 }
    ]);
    setShowScorersModal(true);
  };

  const handleSaveCustomScorers = async (e) => {
    e.preventDefault();
    const cleanList = customScorersForm
      .filter(s => s.player_name && s.player_name.trim())
      .map(s => ({
        player_name: s.player_name.trim(),
        team_name: s.team_name.trim() || 'Team',
        goals: parseInt(s.goals, 10) || 0
      }));

    await saveCustomTopScorers(selectedTournament, cleanList);
    setShowScorersModal(false);
    fetchTournaments();
    fetchStandingsAndStats();
    alert('✅ Top 3 Tournament Scorers updated successfully!');
  };

  const handleResetToAutoScorers = async () => {
    if (!window.confirm('Reset Top Scorers back to automatic match goal calculation?')) return;
    await resetCustomTopScorers(selectedTournament);
    setShowScorersModal(false);
    fetchTournaments();
    fetchStandingsAndStats();
    alert('🔄 Top Scorers reset to auto-calculation from completed matches.');
  };

  return (
    <div style={{ padding: '8px 4px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Rules & Tournament Selection Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: 'rgba(43, 87, 72, 0.25)', border: '1px solid #2B5748', color: '#EAECF0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
            🟥 WIN = 3 PTS
          </span>
          <span style={{ backgroundColor: 'rgba(29, 33, 40, 0.8)', border: '1px solid #343a46', color: '#EAECF0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
            🟨 DRAW = 1 PT
          </span>
          <span style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid #618764', color: '#9aa4b2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
            ⬛ LOSS = 0 PTS
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {tournaments.length > 0 && (
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#1D2128',
                border: '1px solid #343a46',
                borderRadius: '4px',
                color: '#EAECF0',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id} style={{ background: '#1D2128' }}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {user?.role === 'ADMIN' && (
            <button
              onClick={handleResetStandings}
              disabled={resetting || !selectedTournament}
              style={{
                padding: '4px 10px',
                backgroundColor: resetting ? '#334155' : '#7f1d1d',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                color: '#fca5a5',
                fontSize: '0.7rem',
                fontWeight: '800',
                cursor: resetting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🔄 {resetting ? 'Resetting...' : 'Reset Points Table'}
            </button>
          )}
        </div>
      </div>

      {/* TOP 3 TOURNAMENT SCORERS (GOLDEN BOOT) PODIUM */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        marginBottom: '20px',
        border: '1px solid rgba(234, 179, 8, 0.35)',
        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.08), #131720)',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="#eab308" />
            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#fef08a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              🏆 TOP 3 TOURNAMENT SCORERS (GOLDEN BOOT)
            </h3>
          </div>
          {user?.role === 'ADMIN' && (
            <button
              onClick={handleOpenEditScorers}
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.18)',
                color: '#fef08a',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Admin: Manually edit top scorers leaderboard"
            >
              <Pencil size={12} /> Edit Top Scorers
            </button>
          )}
        </div>

        {topScorers.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {topScorers.map((scorer, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
              const rankColor = idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#d97706';
              const badgeBg = idx === 0 ? 'rgba(234, 179, 8, 0.18)' : idx === 1 ? 'rgba(148, 163, 184, 0.18)' : 'rgba(217, 119, 6, 0.18)';
              const border = idx === 0 ? '1px solid rgba(234, 179, 8, 0.4)' : idx === 1 ? '1px solid rgba(148, 163, 184, 0.4)' : '1px solid rgba(217, 119, 6, 0.4)';

              return (
                <div key={idx} style={{
                  backgroundColor: '#1D2128',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: border,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '1.4rem' }}>{medal}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scorer.player_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scorer.team_name}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    backgroundColor: badgeBg,
                    color: rankColor,
                    fontSize: '0.82rem',
                    fontWeight: '900',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: border,
                    whiteSpace: 'nowrap'
                  }}>
                    ⚽ {scorer.goals} {scorer.goals === 1 ? 'Goal' : 'Goals'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding: '16px',
            backgroundColor: '#1D2128',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '0.82rem',
            textAlign: 'center',
            border: '1px dashed #334155'
          }}>
            ⚽ Tournament Golden Boot Leaderboard — Scorers will be featured here live as goals are scored!
          </div>
        )}
      </div>

      {/* Standings Table Card */}
      <div className="glass-panel" style={{ padding: '0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9aa4b2', fontSize: '0.8rem' }}>Loading standings...</div>
        ) : standings.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9aa4b2', fontSize: '0.8rem' }}>No team standings available.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1D2128', borderBottom: '1px solid #343a46', color: '#EAECF0', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '22px' }}>#</th>
                <th style={{ padding: '6px 4px' }}>TEAM</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '20px' }}>P</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '20px' }}>W</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '20px' }}>D</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '20px' }}>L</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '24px' }}>GD</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', width: '32px', fontWeight: '900', color: '#2B5748' }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => (
                <tr key={team.team_id} style={{
                  borderBottom: '1px solid #343a46',
                  backgroundColor: idx === 0 ? 'rgba(43, 87, 72, 0.2)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}>
                  <td style={{ padding: '6px 2px', textAlign: 'center', fontWeight: '900', fontSize: '0.75rem', color: idx === 0 ? '#2B5748' : idx === 1 ? '#EAECF0' : idx === 2 ? '#9aa4b2' : '#9aa4b2' }}>
                    {idx === 0 ? '🏆1' : idx === 1 ? '🥈2' : idx === 2 ? '🥉3' : idx + 1}
                  </td>
                  <td style={{ padding: '6px 4px', fontWeight: '800', color: '#EAECF0', fontSize: '0.75rem', wordBreak: 'break-word', lineHeight: 1.2 }}>
                    {team.team_name}
                  </td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', color: '#EAECF0', fontWeight: '600', fontSize: '0.75rem' }}>{team.played}</td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', color: '#2B5748', fontWeight: '700', fontSize: '0.75rem' }}>{team.won}</td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', color: '#9aa4b2', fontWeight: '700', fontSize: '0.75rem' }}>{team.drawn}</td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', color: '#ef4444', fontWeight: '700', fontSize: '0.75rem' }}>{team.lost}</td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', fontWeight: '800', fontSize: '0.75rem', color: team.goal_difference > 0 ? '#2B5748' : team.goal_difference < 0 ? '#ef4444' : '#9aa4b2' }}>
                    {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '900', color: '#2B5748', fontSize: '0.85rem', backgroundColor: 'rgba(43, 87, 72, 0.25)' }}>
                    {team.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Top 3 Scorers Modal for Admin */}
      {showScorersModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            backgroundColor: '#11151c',
            border: '2px solid #eab308',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#eab308" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#fef08a', margin: 0 }}>
                  Edit Top 3 Tournament Scorers
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScorersModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '2px 6px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.4 }}>
              Manually set the Golden Boot top 3 scorers leaderboard for this tournament:
            </p>

            <form onSubmit={handleSaveCustomScorers} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[0, 1, 2].map(rankIdx => {
                const medal = rankIdx === 0 ? '🥇 1st Place (Golden Boot)' : rankIdx === 1 ? '🥈 2nd Place' : '🥉 3rd Place';
                const labelColor = rankIdx === 0 ? '#fef08a' : rankIdx === 1 ? '#cbd5e1' : '#fba444';
                return (
                  <div key={rankIdx} style={{ padding: '10px 12px', backgroundColor: '#181d27', borderRadius: '8px', border: '1px solid #2d3748' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: labelColor, marginBottom: '6px' }}>
                      {medal}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.8fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', marginBottom: '2px' }}>Player Name</label>
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          value={customScorersForm[rankIdx]?.player_name || ''}
                          onChange={e => {
                            const copy = [...customScorersForm];
                            copy[rankIdx] = { ...copy[rankIdx], player_name: e.target.value };
                            setCustomScorersForm(copy);
                          }}
                          style={{ width: '100%', padding: '6px 8px', backgroundColor: '#11151c', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', marginBottom: '2px' }}>Team Name</label>
                        <input
                          type="text"
                          placeholder="e.g. FC Strikers"
                          value={customScorersForm[rankIdx]?.team_name || ''}
                          onChange={e => {
                            const copy = [...customScorersForm];
                            copy[rankIdx] = { ...copy[rankIdx], team_name: e.target.value };
                            setCustomScorersForm(copy);
                          }}
                          style={{ width: '100%', padding: '6px 8px', backgroundColor: '#11151c', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', marginBottom: '2px' }}>Goals</label>
                        <input
                          type="number"
                          min="0"
                          value={customScorersForm[rankIdx]?.goals ?? 0}
                          onChange={e => {
                            const copy = [...customScorersForm];
                            copy[rankIdx] = { ...copy[rankIdx], goals: e.target.value };
                            setCustomScorersForm(copy);
                          }}
                          style={{ width: '100%', padding: '6px 8px', backgroundColor: '#11151c', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleResetToAutoScorers}
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: '700', color: '#f87171' }}
                  title="Reset to automatic match calculation"
                >
                  🔄 Reset Auto
                </button>
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flex: 1, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowScorersModal(false)}
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#eab308', borderColor: '#eab308', color: '#0f172a' }}
                  >
                    💾 Save Scorers
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Standings;
