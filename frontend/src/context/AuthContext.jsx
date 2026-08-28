import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUser({ id: 'guest', username: 'Official Operator', role: 'ADMIN' });
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me/');
        setUser(res.data);
      } catch (err) {
        console.error('Session restore failed:', err);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser({ id: 'guest', username: 'Official Operator', role: 'ADMIN' });
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
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
