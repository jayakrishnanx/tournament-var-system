import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const getInitialUser = () => {
    try {
      const isAdmin = localStorage.getItem('is_admin') === 'true';
      const stored = localStorage.getItem('user');
      if (isAdmin && stored) return JSON.parse(stored);
      if (isAdmin) return { id: 'admin', username: 'admin', role: 'ADMIN' };
    } catch (e) {}
    return { id: 'guest', username: 'Public Spectator', role: 'VIEWER' };
  };

  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      const isAdmin = localStorage.getItem('is_admin') === 'true';
      const token = localStorage.getItem('access_token');
      if (!token || !isAdmin) {
        setUser({ id: 'guest', username: 'Public Spectator', role: 'VIEWER' });
        return;
      }
      try {
        const res = await api.get('/auth/me/');
        if (res.data && res.data.role === 'ADMIN') {
          setUser(res.data);
          localStorage.setItem('is_admin', 'true');
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      } catch (err) {}
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
