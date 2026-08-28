import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Shield, UserCheck, Lock, AlertCircle, Mail, UserPlus, LogIn, Eye } from 'lucide-react';

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
        setSuccess('Account created! Logging you in...');
        await login(username, password);
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.username?.[0] || err.response?.data?.error || 'Registration failed.');
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
      setError(`Failed to login as ${user}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 80px)',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            padding: '10px',
            borderRadius: '10px',
            marginBottom: '10px'
          }}>
            <Shield size={28} color="white" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '0.02em' }}>KALLIKALAM</h2>
          <p style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '800', marginTop: '2px', letterSpacing: '0.05em' }}>
            TOURNAMENT MANAGEMENT & MULTI-CAM VAR
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '16px' }}>
          <button
            onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: !isRegister ? '2px solid #3b82f6' : '2px solid transparent',
              color: !isRegister ? '#3b82f6' : '#94a3b8',
              fontWeight: '800',
              fontSize: '0.85rem'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: isRegister ? '2px solid #3b82f6' : '2px solid transparent',
              color: isRegister ? '#3b82f6' : '#94a3b8',
              fontWeight: '800',
              fontSize: '0.85rem'
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#f43f5e',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.8rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.8rem'
          }}>
            <UserCheck size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#cbd5e1' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <UserCheck size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 34px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#cbd5e1' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 34px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#cbd5e1' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 34px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#cbd5e1' }}>
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              >
                <option value="ADMIN">Admin (Full Edit Access)</option>
                <option value="USER">User (View-Only Access)</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '6px', width: '100%', padding: '9px' }}>
            {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            <span>{loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
