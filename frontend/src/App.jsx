import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SplashScreen } from './components/SplashScreen';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { Teams } from './pages/Teams';
import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { PublicScoreboard } from './pages/PublicScoreboard';
import { Standings } from './pages/Standings';
import { Bracket } from './pages/Bracket';

function App() {
  return (
    <AuthProvider>
      <SplashScreen>
        <Router>
          <div style={{ minHeight: '100vh', backgroundColor: '#1D2128' }}>
            <Navbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/bracket" element={<Bracket />} />
              <Route path="/standings" element={<Standings />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:id" element={<TournamentDetail />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/matches/:id" element={<MatchDetail />} />
              <Route path="/public/match/:id" element={<PublicScoreboard />} />
              <Route path="/admin-login" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </SplashScreen>
    </AuthProvider>
  );
}

export default App;
