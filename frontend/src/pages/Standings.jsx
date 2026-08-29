import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Standings = () => {
  const { user } = useAuth();
  const [standings, setStandings] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

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

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await api.get('/tournaments/tournaments/');
        setTournaments(res.data);
        if (res.data.length > 0) {
          setSelectedTournament(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTournaments();
  }, []);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const url = selectedTournament
          ? `/tournaments/matches/standings/?tournament=${selectedTournament}`
          : '/tournaments/matches/standings/';
        const res = await api.get(url);
        setStandings(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
    const interval = setInterval(fetchStandings, 10000);
    return () => clearInterval(interval);
  }, [selectedTournament]);

  return (
    <div style={{ padding: '8px 4px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Rules & Tournament Selection Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
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
                padding: '3px 6px',
                backgroundColor: '#1D2128',
                border: '1px solid #343a46',
                borderRadius: '4px',
                color: '#EAECF0',
                fontSize: '0.7rem',
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
    </div>
  );
};
