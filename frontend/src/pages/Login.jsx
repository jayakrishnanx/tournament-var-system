import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Shield, UserCheck, Lock, AlertCircle, Mail, UserPlus, LogIn } from 'lucide-react';

export const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isRegister) {
      try {
        await api.post('/auth/register/', { username, email, password, role });
        setSuccess('Account registered successfully! Logging you in...');
        await login(username, password);
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.username?.[0] || err.response?.data?.error || 'Registration failed. Try a different username.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await login(username, password);
        navigate('/');
      } catch (err) {
        setError('Invalid username or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleQuickLogin = async (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
    setLoading(true);
    try {
      await login(user, pass);
      navigate('/');
    } catch (err) {
      setError(`Failed to login as ${user}. Make sure server is running.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordlessAccess = () => {
    navigate('/');
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 80px)',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '12px'
          }}>
            <Shield size={32} color="white" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '0.02em' }}>KALLIKALAM</h2>
          <p style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: '800', marginTop: '4px', letterSpacing: '0.05em' }}>
            TOURNAMENT MANAGEMENT & MULTI-CAM VAR
          </p>

          <button
            onClick={handlePasswordlessAccess}
            style={{
              marginTop: '16px',
              width: '100%',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: '900',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            🚀 Open App Now (No Password Needed)
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '20px' }}>
          <button
            onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: !isRegister ? '2px solid #3b82f6' : '2px solid transparent',
              color: !isRegister ? '#3b82f6' : '#94a3b8',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: isRegister ? '2px solid #3b82f6' : '2px solid transparent',
              color: isRegister ? '#3b82f6' : '#94a3b8',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#f43f5e',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.85rem'
          }}>
            <UserCheck size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <UserCheck size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value="ADMIN">System Administrator (Full Access)</option>
                <option value="SCORER">Official Scorer</option>
                <option value="VAR_OPERATOR">VAR Operator</option>
                <option value="SPECTATOR">Viewer / Spectator</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '8px', width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            <span>{loading ? 'Processing...' : (isRegister ? 'Create Free Account' : 'Sign In')}</span>
          </button>
        </form>

        {/* 1-Click Quick Demo Accounts */}
        {!isRegister && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '10px', textAlign: 'center', fontWeight: '700' }}>
              ⚡ 1-CLICK QUICK LOGIN DEMO ACCOUNTS
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                onClick={() => handleQuickLogin('admin', 'admin123')}
                style={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6', color: '#3b82f6', padding: '8px 4px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
              >
                👑 Admin
              </button>
              <button
                onClick={() => handleQuickLogin('scorer', 'scorer123')}
                style={{ backgroundColor: '#1e293b', border: '1px solid #10b981', color: '#10b981', padding: '8px 4px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
              >
                ⚽ Scorer
              </button>
              <button
                onClick={() => handleQuickLogin('var', 'var123')}
                style={{ backgroundColor: '#1e293b', border: '1px solid #8b5cf6', color: '#8b5cf6', padding: '8px 4px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📹 VAR Op
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
