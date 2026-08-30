import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Users, Calendar, Shield, LogOut, Activity, Award } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isPathActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/matches';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navItemStyle = (path) => {
    const active = isPathActive(path);
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '0.82rem',
      fontWeight: '800',
      color: '#ffffff',
      backgroundColor: active ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
      border: active ? '1px solid #3b82f6' : '1px solid transparent',
      boxShadow: active ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none',
      transition: 'all 0.2s ease',
      textDecoration: 'none'
    };
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav className="nav-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      backgroundColor: '#11151c',
      borderBottom: '1px solid #28303f',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
        <Link to={isAdmin ? "/matches" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, textDecoration: 'none' }}>
          <img
            src="/navbar-logo.png"
            alt="Kalikkalam FC Logo"
            style={{
              height: '36px',
              width: '36px',
              objectFit: 'contain'
            }}
          />
          <div>
            <span style={{ fontFamily: 'Outfit', fontWeight: '900', fontSize: '1rem', color: '#ffffff', display: 'block', lineHeight: 1, letterSpacing: '0.02em' }}>
              KALLI<span style={{ color: '#38bdf8' }}>KALAM</span>
            </span>
            <span style={{ fontSize: '0.55rem', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: '800' }}>
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
              ADMIN
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

      <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        {!isAdmin ? (
          <>
            <Link to="/" style={navItemStyle('/')}>
              <Activity size={14} color="#38bdf8" /> Matches
            </Link>
            <Link to="/bracket" style={navItemStyle('/bracket')}>
              <Trophy size={14} color="#facc15" /> Knockout Bracket
            </Link>
            <Link to="/standings" style={navItemStyle('/standings')}>
              <Award size={14} color="#34d399" /> Points Table
            </Link>
          </>
        ) : (
          <>
            <Link to="/tournaments" style={navItemStyle('/tournaments')}>
              <Trophy size={14} color="#facc15" /> Tournaments
            </Link>
            <Link to="/matches" style={navItemStyle('/matches')}>
              <Calendar size={14} color="#38bdf8" /> Matches
            </Link>
            <Link to="/teams" style={navItemStyle('/teams')}>
              <Users size={14} color="#a78bfa" /> Teams
            </Link>
            <Link to="/bracket" style={navItemStyle('/bracket')}>
              <Trophy size={14} color="#facc15" /> Knockout Bracket
            </Link>
            <Link to="/standings" style={navItemStyle('/standings')}>
              <Award size={14} color="#34d399" /> Points Table
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
