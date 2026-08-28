import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Trophy, Plus, Calendar, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    sport_type: 'Soccer / Football',
    sport: 'Soccer / Football',
    location: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'UPCOMING'
  });

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments/tournaments/');
      setTournaments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        sport_type: formData.sport_type || formData.sport || 'Soccer / Football'
      };
      await api.post('/tournaments/tournaments/', payload);
      setShowModal(false);
      fetchTournaments();
    } catch (err) {
      alert('Error creating tournament: ' + JSON.stringify(err.response?.data || err.message));
    }
  };

  const handleDelete = async (e, tournamentId, tournamentName) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete tournament "${tournamentName}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/tournaments/tournaments/${tournamentId}/`);
        fetchTournaments();
      } catch (err) {
        alert('Error deleting tournament: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Tournaments</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
            Manage upcoming, ongoing, and completed sports championships.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button onClick={() => setShowModal(true)} className="btn-primary hide-on-mobile">
            <Plus size={16} /> Create Tournament
          </button>
        )}
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading tournaments...</div>
      ) : tournaments.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No tournaments created yet.</div>
      ) : (
        <div className="responsive-grid-2">
          {tournaments.map(t => (
            <div key={t.id} className="glass-panel card-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <Link to={`/tournaments/${t.id}`} style={{ textDecoration: 'none', color: 'white' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{t.name}</h2>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={t.status} />
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={(e) => handleDelete(e, t.id, t.name)}
                        title="Delete Tournament"
                        style={{
                          backgroundColor: 'rgba(244, 63, 94, 0.15)',
                          color: '#f43f5e',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trophy size={14} color="#3b82f6" /> {t.sport}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#10b981" /> {t.location || 'Stadium Main Arena'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#8b5cf6" /> {t.start_date} to {t.end_date}
                  </span>
                </div>
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1' }}>
                <span>Teams: {t.teams?.length || 0}</span>
                <Link to={`/tournaments/${t.id}`} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                  Manage Tournament
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '20px' }}>Create New Tournament</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Tournament Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Sport</label>
                  <input
                    type="text"
                    required
                    value={formData.sport}
                    onChange={e => setFormData({ ...formData, sport: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Tournament</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
