import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, Trophy, Info } from 'lucide-react';

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
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>

      {/* Rules Summary Pills */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800' }}>
          🟩 WIN = 3 PTS
        </span>
        <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800' }}>
          🟨 DRAW = 1 PT
        </span>
        <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800' }}>
          🟥 LOSS = 0 PTS
        </span>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading tournament standings...</div>
        ) : standings.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No team standings available yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '60px' }}>#</th>
                <th style={{ padding: '12px 16px' }}>Team</th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>P</th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>W</th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>D</th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>L</th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>GF</th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>GA</th>
                <th style={{ padding: '12px 12px', textAlign: 'center' }}>GD</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '900', color: '#10b981' }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => (
                <tr key={team.team_id} style={{
                  borderBottom: '1px solid #1e293b',
                  backgroundColor: idx === 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '900', color: idx === 0 ? '#f59e0b' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#94a3b8' }}>
                    {idx === 0 ? '🏆 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '800', color: '#f8fafc', fontSize: '0.95rem' }}>
                    {team.team_name}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', color: '#cbd5e1', fontWeight: '600' }}>{team.played}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', color: '#10b981', fontWeight: '700' }}>{team.won}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', color: '#f59e0b', fontWeight: '700' }}>{team.drawn}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>{team.lost}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', color: '#cbd5e1' }}>{team.goals_for}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', color: '#94a3b8' }}>{team.goals_against}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: '800', color: team.goal_difference > 0 ? '#10b981' : team.goal_difference < 0 ? '#ef4444' : '#94a3b8' }}>
                    {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '900', color: '#10b981', fontSize: '1.1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
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
