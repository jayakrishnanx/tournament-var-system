import React, { useEffect } from 'react';
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
import { PhoneBroadcaster } from './pages/PhoneBroadcaster';

function App() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const syncData = params.get('sync_data');
      if (syncData) {
        const jsonStr = decodeURIComponent(atob(syncData));
        const parsed = JSON.parse(jsonStr);
        if (parsed.t || parsed.tournaments) {
          const tourns = parsed.t || parsed.tournaments || [];
          const teams = parsed.tm || parsed.teams || [];
          const matches = parsed.m || parsed.matches || [];

          localStorage.setItem('var_data_tournaments', JSON.stringify(tourns));
          localStorage.setItem('var_data_teams', JSON.stringify(teams));
          localStorage.setItem('var_data_matches', JSON.stringify(matches));

          // Clean url
          window.history.replaceState({}, document.title, window.location.pathname);
          alert(`🎉 Sync Complete!\n\nImported ${tourns.length} Tournaments, ${teams.length} Teams, and ${matches.length} Matches from your laptop!`);
          window.location.reload();
        }
      }
    } catch (e) {
      console.error('Error handling sync_data parameter:', e);
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', backgroundColor: '#1D2128' }}>
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/camera/:camId" element={<PhoneBroadcaster />} />
            <Route path="/broadcast/:camId" element={<PhoneBroadcaster />} />
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
    </AuthProvider>
  );
}

export default App;
