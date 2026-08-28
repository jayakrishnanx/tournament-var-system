import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, Trophy } from 'lucide-react';

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
    <div style={{ padding: '12px 8px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Rules & Tournament Selection Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800' }}>
            🟩 WIN = 3 PTS
          </span>
          <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800' }}>
            🟨 DRAW = 1 PT
          </span>
          <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800' }}>
            🟥 LOSS = 0 PTS
          </span>
        </div>

        {tournaments.length > 0 && (
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Standings Table Card */}
      <div className="glass-panel" style={{ padding: '0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Loading standings...</div>
        ) : standings.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No team standings available.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '450px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '32px' }}>#</th>
                <th style={{ padding: '8px 8px' }}>TEAM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', width: '28px' }}>P</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', width: '28px' }}>W</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', width: '28px' }}>D</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', width: '28px' }}>L</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px' }}>GD</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', width: '45px', fontWeight: '900', color: '#10b981' }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => (
                <tr key={team.team_id} style={{
                  borderBottom: '1px solid #1e293b',
                  backgroundColor: idx === 0 ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '900', fontSize: '0.8rem', color: idx === 0 ? '#f59e0b' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#94a3b8' }}>
                    {idx === 0 ? '🏆1' : idx === 1 ? '🥈2' : idx === 2 ? '🥉3' : idx + 1}
                  </td>
                  <td style={{ padding: '8px 8px', fontWeight: '800', color: '#f8fafc', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                    {team.team_name}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: '#cbd5e1', fontWeight: '600', fontSize: '0.8rem' }}>{team.played}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: '#10b981', fontWeight: '700', fontSize: '0.8rem' }}>{team.won}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: '#f59e0b', fontWeight: '700', fontSize: '0.8rem' }}>{team.drawn}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: '#ef4444', fontWeight: '700', fontSize: '0.8rem' }}>{team.lost}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '800', fontSize: '0.8rem', color: team.goal_difference > 0 ? '#10b981' : team.goal_difference < 0 ? '#ef4444' : '#94a3b8' }}>
                    {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: '900', color: '#10b981', fontSize: '0.95rem', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
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
