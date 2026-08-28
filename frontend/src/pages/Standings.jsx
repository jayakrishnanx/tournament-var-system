import React, { useState, useEffect } from 'react';
import api from '../services/api';

export const Standings = () => {
  const [standings, setStandings] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [loading, setLoading] = useState(true);

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
    const interval = setInterval(fetchStandings, 3000);
    return () => clearInterval(interval);
  }, [selectedTournament]);

  return (
    <div style={{ padding: '8px 4px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Rules & Tournament Selection Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: 'rgba(254, 127, 45, 0.2)', border: '1px solid #FE7F2D', color: '#FE7F2D', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
            🟧 WIN = 3 PTS
          </span>
          <span style={{ backgroundColor: 'rgba(35, 61, 77, 0.6)', border: '1px solid #233D4D', color: '#EAECF0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
            🟦 DRAW = 1 PT
          </span>
          <span style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid #000000', color: '#a3b3c2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
            ⬛ LOSS = 0 PTS
          </span>
        </div>

        {tournaments.length > 0 && (
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            style={{
              padding: '3px 6px',
              backgroundColor: '#233D4D',
              border: '1px solid #2e4f64',
              borderRadius: '4px',
              color: '#EAECF0',
              fontSize: '0.7rem',
              fontWeight: '700'
            }}
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id} style={{ background: '#233D4D' }}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Standings Table Card */}
      <div className="glass-panel" style={{ padding: '0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#a3b3c2', fontSize: '0.8rem' }}>Loading standings...</div>
        ) : standings.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#a3b3c2', fontSize: '0.8rem' }}>No team standings available.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#233D4D', borderBottom: '1px solid #2e4f64', color: '#EAECF0', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '22px' }}>#</th>
                <th style={{ padding: '6px 4px' }}>TEAM</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '20px' }}>P</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '20px' }}>W</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '20px' }}>D</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '20px' }}>L</th>
                <th style={{ padding: '6px 2px', textAlign: 'center', width: '24px' }}>GD</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', width: '32px', fontWeight: '900', color: '#FE7F2D' }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => (
                <tr key={team.team_id} style={{
                  borderBottom: '1px solid #2e4f64',
                  backgroundColor: idx === 0 ? 'rgba(254, 127, 45, 0.15)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}>
                  <td style={{ padding: '6px 2px', textAlign: 'center', fontWeight: '900', fontSize: '0.75rem', color: idx === 0 ? '#FE7F2D' : idx === 1 ? '#EAECF0' : idx === 2 ? '#d6671c' : '#a3b3c2' }}>
                    {idx === 0 ? '🏆1' : idx === 1 ? '🥈2' : idx === 2 ? '🥉3' : idx + 1}
                  </td>
                  <td style={{ padding: '6px 4px', fontWeight: '800', color: '#EAECF0', fontSize: '0.75rem', wordBreak: 'break-word', lineHeight: 1.2 }}>
                    {team.team_name}
                  </td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', color: '#EAECF0', fontWeight: '600', fontSize: '0.75rem' }}>{team.played}</td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', color: '#FE7F2D', fontWeight: '700', fontSize: '0.75rem' }}>{team.won}</td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', color: '#a3b3c2', fontWeight: '700', fontSize: '0.75rem' }}>{team.drawn}</td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', color: '#ef4444', fontWeight: '700', fontSize: '0.75rem' }}>{team.lost}</td>
                  <td style={{ padding: '6px 2px', textAlign: 'center', fontWeight: '800', fontSize: '0.75rem', color: team.goal_difference > 0 ? '#FE7F2D' : team.goal_difference < 0 ? '#ef4444' : '#a3b3c2' }}>
                    {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '900', color: '#FE7F2D', fontSize: '0.85rem', backgroundColor: 'rgba(254, 127, 45, 0.2)' }}>
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
