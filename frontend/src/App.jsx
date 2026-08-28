import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { Teams } from './pages/Teams';
import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { PublicScoreboard } from './pages/PublicScoreboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/tournaments" element={
              <ProtectedRoute>
                <Tournaments />
              </ProtectedRoute>
            } />

            <Route path="/tournaments/:id" element={
              <ProtectedRoute>
                <TournamentDetail />
              </ProtectedRoute>
            } />

            <Route path="/teams" element={
              <ProtectedRoute>
                <Teams />
              </ProtectedRoute>
            } />

            <Route path="/matches" element={
              <ProtectedRoute>
                <Matches />
              </ProtectedRoute>
            } />

            <Route path="/matches/:id" element={
              <ProtectedRoute>
                <MatchDetail />
              </ProtectedRoute>
            } />

            <Route path="/public/match/:id" element={<PublicScoreboard />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
