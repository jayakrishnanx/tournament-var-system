import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Users, Calendar, Shield, LogOut, Activity } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItemStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: location.pathname === path ? '#CF3030' : '#D9D9D9',
    backgroundColor: location.pathname === path ? 'rgba(207, 48, 48, 0.18)' : 'transparent',
    border: location.pathname === path ? '1px solid rgba(207, 48, 48, 0.4)' : '1px solid transparent',
    transition: 'all 0.2s ease',
  });

  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav className="nav-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      backgroundColor: '#141414',
      borderBottom: '1px solid #333333',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
        <Link to={isAdmin ? "/matches" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, #CF3030, #E88A1A)',
            padding: '5px',
            borderRadius: '6px',
            display: 'flex'
          }}>
            <Trophy size={16} color="#141414" />
          </div>
          <div>
            <span style={{ fontFamily: 'Outfit', fontWeight: '900', fontSize: '1rem', color: '#D9D9D9', display: 'block', lineHeight: 1, letterSpacing: '0.02em' }}>
              KALLI<span style={{ color: '#CF3030' }}>KALAM</span>
            </span>
            <span style={{ fontSize: '0.55rem', color: '#E88A1A', letterSpacing: '0.05em', fontWeight: '800' }}>
              LIVE SCOREBOARD
            </span>
          </div>
        </Link>

        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(244, 63, 94, 0.2)',
              color: '#f43f5e',
              border: '1px solid currentColor',
              display: 'inline-block'
            }}>
              👑 ADMIN
            </span>
            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.75rem' }}
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.75rem' }}>
            <Shield size={12} /> Admin Sign In
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '2px' }}>
        {!isAdmin ? (
          <>
            <Link to="/" style={navItemStyle('/')}>
              <Activity size={14} /> Matches & Live Scores
            </Link>
            <Link to="/standings" style={navItemStyle('/standings')}>
              <Trophy size={14} color="#10b981" /> 📊 Points Table
            </Link>
          </>
        ) : (
          <>
            <Link to="/tournaments" style={navItemStyle('/tournaments')}>
              <Trophy size={14} /> Manage Tournaments
            </Link>
            <Link to="/teams" style={navItemStyle('/teams')}>
              <Users size={14} /> Manage Teams
            </Link>
            <Link to="/matches" style={navItemStyle('/matches')}>
              <Calendar size={14} /> Manage Matches
            </Link>
            <Link to="/standings" style={navItemStyle('/standings')}>
              <Trophy size={14} color="#10b981" /> Points Table
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
