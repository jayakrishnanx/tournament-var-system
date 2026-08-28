import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Trophy, Award, Activity, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Bracket = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generator states for admin
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [bracketGenerating, setBracketGenerating] = useState(false);

  const fetchAll = async (tId) => {
    setLoading(true);
    try {
      const [tRes, mRes, tmRes] = await Promise.all([
        api.get(`/tournaments/tournaments/${tId}/`),
        api.get(`/tournaments/matches/?tournament=${tId}`),
        api.get(`/tournaments/teams/?tournament=${tId}`)
      ]);
      setTournament(tRes.data);
      setMatches(mRes.data);
      setTeams(tmRes.data);
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
        setTournaments(res.data);
        if (res.data.length > 0) {
          const firstId = res.data[0].id;
          setSelectedTournament(firstId);
          await fetchAll(firstId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchAll(selectedTournament);
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

  const handleGenerateBracket = async () => {
    if (selectedTeams.length !== 4 && selectedTeams.length !== 8) {
      alert('Please select exactly 4 or 8 teams to generate the bracket.');
      return;
    }
    if (!window.confirm(`Are you sure you want to generate a new Knockout Bracket with these ${selectedTeams.length} teams? This will clear any existing knockout fixtures!`)) {
      return;
    }
    setBracketGenerating(true);
    try {
      await api.post(`/tournaments/tournaments/${selectedTournament}/generate_bracket/`, {
        team_ids: selectedTeams
      });
      alert('🏆 Knockout Bracket generated successfully!');
      fetchAll(selectedTournament);
      setSelectedTeams([]);
    } catch (err) {
      alert('Failed to generate bracket: ' + (err.response?.data?.error || err.message));
    } finally {
      setBracketGenerating(false);
    }
  };

  const bracketMatches = matches.filter(m => m.stage !== 'REGULAR');
  const hasBracket = bracketMatches.length > 0;
  const getBracketMatch = (code) => bracketMatches.find(m => m.bracket_code === code);

  const renderBracketNode = (code, labelText) => {
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
        padding: '12px 14px',
        width: '210px',
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
          <span style={{ fontSize: '0.75rem', fontWeight: homeWon ? '800' : '600', color: homeWon ? '#10b981' : m.home_team ? '#f8fafc' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '145px' }}>
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
          <span style={{ fontSize: '0.75rem', fontWeight: awayWon ? '800' : '600', color: awayWon ? '#10b981' : m.away_team ? '#f8fafc' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '145px' }}>
            {awayName}
          </span>
          {m.status !== 'SCHEDULED' && (
            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: awayWon ? '#10b981' : '#cbd5e1' }}>
              {m.away_score}
            </span>
          )}
        </div>

        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #2d3748', display: 'flex', justifyContent: 'flex-end' }}>
          <Link to={`/matches/${m.id}`} style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: '700' }}>
            View Match →
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏆 Tournament Knockout Bracket
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
            Single-elimination championship tree (Quarter-Finals, Semi-Finals & Finals).
          </p>
        </div>

        {tournaments.length > 1 && (
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1D2128',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: '700'
            }}
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ADMIN GENERATOR PANEL */}
      {user?.role === 'ADMIN' && teams.length >= 4 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', borderTop: '3px solid #10b981' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '6px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚙️ Admin Bracket Generator
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '14px' }}>
            Select exactly <strong>4 teams</strong> (for Semi-Finals) or <strong>8 teams</strong> (for Quarter-Finals) to automatically create or regenerate the tournament tree.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8' }}>
              Selected: <strong style={{ color: '#f8fafc' }}>{selectedTeams.length}</strong> / {teams.length} teams
            </span>
            <button
              onClick={handleGenerateBracket}
              disabled={bracketGenerating || (selectedTeams.length !== 4 && selectedTeams.length !== 8)}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: '900',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: (selectedTeams.length === 4 || selectedTeams.length === 8) ? 1 : 0.5
              }}
            >
              🏆 {bracketGenerating ? 'Generating...' : 'Generate / Reset Knockout Bracket'}
            </button>
          </div>
        </div>
      )}

      {/* VISUAL BRACKET TREE */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          Loading bracket details...
        </div>
      ) : !hasBracket ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ fontSize: '1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '6px' }}>
            No Knockout Bracket generated yet for this tournament.
          </p>
          {user?.role === 'ADMIN' ? (
            <p style={{ fontSize: '0.85rem' }}>
              Select 4 or 8 teams above and click <strong>Generate Knockout Bracket</strong> to create it!
            </p>
          ) : (
            <p style={{ fontSize: '0.85rem' }}>
              The tournament administrator will publish the knockout bracket soon.
            </p>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', justifyContent: 'center', minWidth: '720px', padding: '20px 10px' }}>
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

            {/* Championship Final */}
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
  );
};
