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
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Matches & Live Scoring</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
            Real-time score updates, VAR multi-cam feed & match control.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
          >
            <option value="ALL" style={{ background: '#1e293b' }}>All Statuses</option>
            <option value="LIVE" style={{ background: '#1e293b' }}>Live Now</option>
            <option value="SCHEDULED" style={{ background: '#1e293b' }}>Scheduled</option>
            <option value="ENDED" style={{ background: '#1e293b' }}>Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading match schedule...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No matches found matching filter.</div>
      ) : (
        <div className="responsive-grid-2">
          {filteredMatches.map(m => (
            <div key={m.id} className="glass-panel card-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>
                      📅 Date: {m.scheduled_time ? m.scheduled_time.split('T')[0].split('-').reverse().join('/') : ''}
                    </span>
                  </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0', gap: '6px' }}>
                  <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word', fontSize: '0.95rem', fontWeight: '800', color: 'white' }}>
                    {m.home_team_details?.name}
                  </div>

                  <div style={{
                    backgroundColor: '#0f172a',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '1.3rem',
                    fontWeight: '900',
                    color: '#ffffff',
                    border: '1px solid #334155',
                    flexShrink: 0
                  }}>
                    {m.home_score} - {m.away_score}
                  </div>

                  <div style={{ flex: 1, textAlign: 'center', wordBreak: 'break-word', fontSize: '0.95rem', fontWeight: '800', color: 'white' }}>
                    {m.away_team_details?.name}
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
