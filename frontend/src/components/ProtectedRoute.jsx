import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94a3b8' }}>
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'ADMIN') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#f43f5e' }}>
        <h2>Access Denied</h2>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>You do not have permission to view this page ({allowedRoles.join(', ')} required).</p>
      </div>
    );
  }

  return children;
};
