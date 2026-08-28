import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Filter } from 'lucide-react';

export const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get('/tournaments/matches/');
        setMatches(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const filteredMatches = matches.filter(m => {
    if (filterStatus === 'ALL') return true;
    return m.status === filterStatus;
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Match Schedule & Master Console</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
            Live scoring control, timer state, and VAR incident reviews.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
          <Filter size={16} color="#94a3b8" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ backgroundColor: 'transparent', border: 'none', color: 'white', fontWeight: '600', fontSize: '0.85rem' }}
          >
            <option value="ALL" style={{ background: '#1e293b' }}>All Statuses</option>
            <option value="LIVE" style={{ background: '#1e293b' }}>Live Now</option>
            <option value="SCHEDULED" style={{ background: '#1e293b' }}>Scheduled</option>
            <option value="ENDED" style={{ background: '#1e293b' }}>Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading match schedule...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No matches found matching filter.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {filteredMatches.map(m => (
            <div key={m.id} className="glass-panel card-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>
                      📅 Date: {m.scheduled_time ? m.scheduled_time.split('T')[0].split('-').reverse().join('/') : ''}
                    </span>
                  </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>{m.home_team_details?.name}</div>
                  </div>

                  <div style={{
                    backgroundColor: '#0f172a',
                    padding: '8px 20px',
                    borderRadius: '10px',
                    fontSize: '1.75rem',
                    fontWeight: '900',
                    color: '#ffffff',
                    border: '1px solid #334155'
                  }}>
                    {m.home_score} - {m.away_score}
                  </div>

                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>{m.away_team_details?.name}</div>
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Period: <strong>{m.current_period}</strong>
                </span>

                <Link to={`/matches/${m.id}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                  Open Master Console
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
