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
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: location.pathname === path ? '#3b82f6' : '#94a3b8',
    backgroundColor: location.pathname === path ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    transition: 'all 0.2s ease',
  });

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      backgroundColor: '#1e293b',
      borderBottom: '1px solid #334155',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex'
          }}>
            <Trophy size={22} color="white" />
          </div>
          <div>
            <span style={{ fontFamily: 'Outfit', fontWeight: '900', fontSize: '1.25rem', color: 'white', display: 'block', lineHeight: 1, letterSpacing: '0.02em' }}>
              KALLI<span style={{ color: '#3b82f6' }}>KALAM</span>
            </span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.08em', fontWeight: '700' }}>
              TOURNAMENT MANAGEMENT & MULTI-CAM VAR
            </span>
          </div>
        </Link>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/" style={navItemStyle('/')}>
              <Activity size={16} /> Dashboard
            </Link>
            <Link to="/tournaments" style={navItemStyle('/tournaments')}>
              <Trophy size={16} /> Tournaments
            </Link>
            <Link to="/teams" style={navItemStyle('/teams')}>
              <Users size={16} /> Teams
            </Link>
            <Link to="/matches" style={navItemStyle('/matches')}>
              <Calendar size={16} /> Matches
            </Link>
          </div>
        )}
      </div>

      <div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{user.username}</div>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: user.role === 'ADMIN' ? 'rgba(244, 63, 94, 0.2)' : user.role === 'SCORER' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                color: user.role === 'ADMIN' ? '#f43f5e' : user.role === 'SCORER' ? '#10b981' : '#8b5cf6',
                border: '1px solid currentColor'
              }}>
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} /> Sign In
          </Link>
        )}
      </div>
    </nav>
  );
};
