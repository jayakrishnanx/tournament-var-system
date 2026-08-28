import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, UserCheck, Lock, AlertCircle, LogIn } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Invalid username or password.');
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '28px' }}>
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
            ADMIN MANAGEMENT PORTAL
          </p>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#cbd5e1' }}>
              Admin Username
            </label>
            <div style={{ position: 'relative' }}>
              <UserCheck size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
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

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#cbd5e1' }}>
              Admin Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '8px', width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
            <LogIn size={16} />
            <span>{loading ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
