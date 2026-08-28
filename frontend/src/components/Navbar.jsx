import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Users, Calendar, Video, Shield, LogOut, Activity } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: location.pathname === path ? '#3b82f6' : '#94a3b8',
    backgroundColor: location.pathname === path ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
    transition: 'all 0.2s ease',
  });

  return (
    <nav className="nav-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      backgroundColor: '#1e293b',
      borderBottom: '1px solid #334155',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            padding: '5px',
            borderRadius: '6px',
            display: 'flex'
          }}>
            <Trophy size={16} color="white" />
          </div>
          <div>
            <span style={{ fontFamily: 'Outfit', fontWeight: '900', fontSize: '1rem', color: 'white', display: 'block', lineHeight: 1, letterSpacing: '0.02em' }}>
              KALLI<span style={{ color: '#3b82f6' }}>KALAM</span>
            </span>
            <span style={{ fontSize: '0.55rem', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: '700' }}>
              MULTI-CAM VAR
            </span>
          </div>
        </Link>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'white', lineHeight: 1.1 }}>{user.username}</div>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: '800',
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: user.role === 'ADMIN' ? 'rgba(244, 63, 94, 0.2)' : user.role === 'SCORER' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                color: user.role === 'ADMIN' ? '#f43f5e' : user.role === 'SCORER' ? '#10b981' : '#8b5cf6',
                border: '1px solid currentColor',
                display: 'inline-block'
              }}>
                {user.role}
              </span>
            </div>
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
            <Shield size={12} /> Sign In
          </Link>
        )}
      </div>

      {user && (
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <Link to="/" style={navItemStyle('/')}>
            <Activity size={15} /> Dashboard
          </Link>
          <Link to="/tournaments" style={navItemStyle('/tournaments')}>
            <Trophy size={15} /> Tournaments
          </Link>
          <Link to="/teams" style={navItemStyle('/teams')}>
            <Users size={15} /> Teams
          </Link>
          <Link to="/matches" style={navItemStyle('/matches')}>
            <Calendar size={15} /> Matches
          </Link>
        </div>
      )}
    </nav>
  );
};
