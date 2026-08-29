import * as fb from './firebaseService';

// Unified Firebase API client that syncs all data to Google Cloud Firestore
const api = {
  get: async (url, config = {}) => {
    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');

    try {
      // 1. Tournaments list or detail
      if (cleanUrl === '/tournaments/tournaments') {
        const data = await fb.getTournaments();
        const allTeams = await fb.getTeams();
        const enriched = data.map(t => ({
          ...t,
          teams: allTeams.filter(tm => String(tm.tournament) === String(t.id) || (!tm.tournament && data.length === 1))
        }));
        return { data: enriched, status: 200 };
      }
      const tournMatch = cleanUrl.match(/^\/tournaments\/tournaments\/([^/]+)$/);
      if (tournMatch) {
        const tId = tournMatch[1];
        const data = await fb.getTournament(tId);
        if (data) {
          const [teams, matches] = await Promise.all([
            fb.getTeams(tId),
            fb.getMatches(tId)
          ]);
          data.teams = teams;
          data.matches = matches;
          return { data, status: 200 };
        }
        return { data: null, status: 404 };
      }

      // 2. Standings
      if (cleanUrl === '/tournaments/matches/standings') {
        const tourId = params.get('tournament');
        if (tourId) {
          const data = await fb.calculateStandings(tourId);
          return { data, status: 200 };
        }
        const allTourns = await fb.getTournaments();
        if (allTourns.length > 0) {
          const data = await fb.calculateStandings(allTourns[0].id);
          return { data, status: 200 };
        }
        return { data: [], status: 200 };
      }

      // 3. Match Stats / Top Scorers
      if (cleanUrl === '/tournaments/matches/stats') {
        return { data: { top_scorers: [], yellow_cards: [], red_cards: [] }, status: 200 };
      }

      // 4. Teams list or detail
      if (cleanUrl === '/tournaments/teams') {
        const tourId = params.get('tournament');
        const data = await fb.getTeams(tourId);
        return { data, status: 200 };
      }

      // 5. Matches list or detail
      if (cleanUrl === '/tournaments/matches') {
        const tourId = params.get('tournament');
        const stage = params.get('stage');
        const data = await fb.getMatches(tourId, stage);
        return { data, status: 200 };
      }
      const matchMatch = cleanUrl.match(/^\/tournaments\/matches\/([^/]+)$/);
      if (matchMatch) {
        const mId = matchMatch[1];
        const data = await fb.getMatch(mId);
        return { data: data || null, status: data ? 200 : 404 };
      }

      // 6. Auth / Me
      if (cleanUrl === '/auth/me') {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          return { data: JSON.parse(userStr), status: 200 };
        }
        return { data: { id: 'admin', username: 'admin', role: 'ADMIN' }, status: 200 };
      }

      return { data: [], status: 200 };
    } catch (err) {
      console.warn(`Firebase get error for ${url}:`, err);
      return { data: [], status: 200 };
    }
  },

  post: async (url, payload = {}, config = {}) => {
    const cleanUrl = url.replace(/\/+$/, '');

    try {
      // 1. Create Tournament
      if (cleanUrl === '/tournaments/tournaments') {
        const data = await fb.createTournament(payload);
        return { data, status: 201 };
      }

      // 2. Create Team
      if (cleanUrl === '/tournaments/teams') {
        const data = await fb.createTeam(payload);
        return { data, status: 201 };
      }

      // 3. Create Player
      if (cleanUrl === '/tournaments/players') {
        const data = await fb.addPlayer(payload);
        return { data, status: 201 };
      }

      // 4. Create Match
      if (cleanUrl === '/tournaments/matches') {
        const data = await fb.createMatch(payload);
        return { data, status: 201 };
      }

      // 5. Generate Knockout Bracket
      const bracketMatch = cleanUrl.match(/^\/tournaments\/tournaments\/([^/]+)\/generate_bracket$/);
      if (bracketMatch) {
        const tId = bracketMatch[1];
        const teamIds = payload.team_ids || [];
        const data = await fb.generateKnockoutBracket(tId, teamIds);
        return { data, status: 200 };
      }

      // 6. Set Next Match
      const nextMatch = cleanUrl.match(/^\/tournaments\/matches\/([^/]+)\/set_next$/);
      if (nextMatch) {
        const mId = nextMatch[1];
        const data = await fb.setNextMatch(mId);
        return { data, status: 200 };
      }

      // 7. Clear All Matches
      if (cleanUrl === '/tournaments/matches/clear_all') {
        const tId = payload.tournament || null;
        await fb.clearAllMatches(tId);
        return { data: { success: true }, status: 200 };
      }

      // 8. Login endpoint
      if (cleanUrl === '/auth/token') {
        const token = 'firebase_token_' + Date.now();
        localStorage.setItem('access_token', token);
        return {
          data: {
            access: token,
            refresh: token,
            user: { id: 'admin', username: payload.username || 'admin', role: 'ADMIN' }
          },
          status: 200
        };
      }

      return { data: payload, status: 200 };
    } catch (err) {
      console.error(`Firebase post error for ${url}:`, err);
      throw err;
    }
  },

  patch: async (url, payload = {}, config = {}) => {
    const cleanUrl = url.replace(/\/+$/, '');

    try {
      const matchMatch = cleanUrl.match(/^\/tournaments\/matches\/([^/]+)$/);
      if (matchMatch) {
        const mId = matchMatch[1];
        const data = await fb.updateMatch(mId, payload);
        return { data, status: 200 };
      }

      const teamMatch = cleanUrl.match(/^\/tournaments\/teams\/([^/]+)$/);
      if (teamMatch) {
        const tmId = teamMatch[1];
        const data = await fb.updateTeam(tmId, payload);
        return { data, status: 200 };
      }

      const playerMatch = cleanUrl.match(/^\/tournaments\/players\/([^/]+)$/);
      if (playerMatch) {
        const pId = playerMatch[1];
        const data = await fb.updatePlayer(pId, payload);
        return { data, status: 200 };
      }

      const tournMatch = cleanUrl.match(/^\/tournaments\/tournaments\/([^/]+)$/);
      if (tournMatch) {
        const tId = tournMatch[1];
        const data = await fb.updateTournament(tId, payload);
        return { data, status: 200 };
      }

      return { data: payload, status: 200 };
    } catch (err) {
      console.error(`Firebase patch error for ${url}:`, err);
      throw err;
    }
  },

  delete: async (url, config = {}) => {
    const cleanUrl = url.replace(/\/+$/, '');

    try {
      const tournMatch = cleanUrl.match(/^\/tournaments\/tournaments\/([^/]+)$/);
      if (tournMatch) {
        await fb.deleteTournament(tournMatch[1]);
        return { data: { success: true }, status: 204 };
      }

      const teamMatch = cleanUrl.match(/^\/tournaments\/teams\/([^/]+)$/);
      if (teamMatch) {
        await fb.deleteTeam(teamMatch[1]);
        return { data: { success: true }, status: 204 };
      }

      const playerMatch = cleanUrl.match(/^\/tournaments\/players\/([^/]+)$/);
      if (playerMatch) {
        await fb.deletePlayer(playerMatch[1]);
        return { data: { success: true }, status: 204 };
      }

      const matchMatch = cleanUrl.match(/^\/tournaments\/matches\/([^/]+)$/);
      if (matchMatch) {
        await fb.deleteMatch(matchMatch[1]);
        return { data: { success: true }, status: 204 };
      }

      return { data: { success: true }, status: 204 };
    } catch (err) {
      console.error(`Firebase delete error for ${url}:`, err);
      throw err;
    }
  }
};

export default api;
