import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Users, Calendar, Shield, LogOut, Activity, Award, Smartphone } from 'lucide-react';
import { SyncModal } from './SyncModal';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSyncModal, setShowSyncModal] = useState(false);

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
    fontWeight: '800',
    color: location.pathname === path ? '#2B5748' : '#EAECF0',
    backgroundColor: location.pathname === path ? 'rgba(43, 87, 72, 0.18)' : 'transparent',
    border: location.pathname === path ? '1px solid rgba(43, 87, 72, 0.4)' : '1px solid transparent',
    transition: 'all 0.2s ease',
  });

  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      <SyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
      <nav className="nav-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: '#181818',
        borderBottom: '1px solid #343a46',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <Link to={isAdmin ? "/matches" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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
              <span style={{ fontFamily: 'Outfit', fontWeight: '900', fontSize: '1rem', color: '#EAECF0', display: 'block', lineHeight: 1, letterSpacing: '0.02em' }}>
                KALLI<span style={{ color: '#2B5748' }}>KALAM</span>
              </span>
              <span style={{ fontSize: '0.55rem', color: '#2B5748', letterSpacing: '0.05em', fontWeight: '800' }}>
                LIVE SCOREBOARD
              </span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => setShowSyncModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                fontSize: '0.75rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="Sync your laptop data to phone"
            >
              <Smartphone size={14} /> Sync with Phone
            </button>

            {isAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
        </div>

      <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        {!isAdmin ? (
          <>
            <Link to="/" style={navItemStyle('/')}>
              <Activity size={14} /> Matches
            </Link>
            <Link to="/bracket" style={{ ...navItemStyle('/bracket'), backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', fontWeight: '800' }}>
              <Trophy size={14} color="#10b981" /> 🏆 Knockout Bracket
            </Link>
            <Link to="/standings" style={navItemStyle('/standings')}>
              <Award size={14} color="#10b981" /> Points Table
            </Link>
          </>
        ) : (
          <>
            <Link to="/tournaments" style={navItemStyle('/tournaments')}>
              <Trophy size={14} /> Tournaments
            </Link>
            <Link to="/matches" style={navItemStyle('/matches')}>
              <Calendar size={14} /> Matches
            </Link>
            <Link to="/teams" style={navItemStyle('/teams')}>
              <Users size={14} /> Teams
            </Link>
            <Link to="/bracket" style={{ ...navItemStyle('/bracket'), backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', fontWeight: '800' }}>
              <Trophy size={14} color="#10b981" /> 🏆 Knockout Bracket
            </Link>
            <Link to="/standings" style={navItemStyle('/standings')}>
              <Award size={14} color="#10b981" /> Points Table
            </Link>
          </>
        )}
      </div>
    </nav>
    </>
  );
};
