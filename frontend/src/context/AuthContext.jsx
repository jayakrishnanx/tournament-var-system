import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ id: 'guest', username: 'Public Spectator', role: 'VIEWER' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const isAdmin = localStorage.getItem('is_admin') === 'true';
      const token = localStorage.getItem('access_token');
      if (!token || !isAdmin) {
        setUser({ id: 'guest', username: 'Public Spectator', role: 'VIEWER' });
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me/');
        if (res.data && res.data.role === 'ADMIN') {
          setUser(res.data);
        } else {
          setUser({ id: 'guest', username: 'Public Spectator', role: 'VIEWER' });
        }
      } catch (err) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('is_admin');
        setUser({ id: 'guest', username: 'Public Spectator', role: 'VIEWER' });
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login/', { username, password });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    if (res.data.user && res.data.user.role === 'ADMIN') {
      localStorage.setItem('is_admin', 'true');
    } else {
      localStorage.removeItem('is_admin');
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('is_admin');
    setUser({ id: 'guest', username: 'Public Spectator', role: 'VIEWER' });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
