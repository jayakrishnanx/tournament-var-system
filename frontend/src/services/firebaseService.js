import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Helper to generate unique IDs
export const generateId = () => {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

// ==========================================
// Instant In-Memory & Local Storage Cache (0ms)
// ==========================================
const getCache = (key, defaultVal = []) => {
  try {
    const raw = localStorage.getItem(`var_data_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setCache = (key, data) => {
  try {
    localStorage.setItem(`var_data_${key}`, JSON.stringify(data));
  } catch (e) {}
};

// ==========================================
// 1. TOURNAMENTS (0ms instant return)
// ==========================================

export const getTournaments = async () => {
  const cached = getCache('tournaments', []);
  
  // Non-blocking background sync with Firestore if online
  (async () => {
    try {
      const snap = await getDocs(collection(db, 'tournaments'));
      if (snap && snap.docs.length > 0) {
        const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        remote.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
        setCache('tournaments', remote);
      }
    } catch (e) {}
  })();

  return cached;
};

export const subscribeTournaments = (callback) => {
  const cached = getCache('tournaments', []);
  callback(cached);

  try {
    return onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      if (snapshot && snapshot.docs.length > 0) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
        setCache('tournaments', data);
        callback(data);
      }
    }, () => callback(cached));
  } catch (e) {
    return () => {};
  }
};

export const getTournament = async (id) => {
  const cached = getCache('tournaments', []);
  const item = cached.find(t => t.id === id);
  return item || null;
};

export const createTournament = async (data) => {
  const newId = generateId();
  const newTourn = {
    id: newId,
    ...data,
    created_at: new Date().toISOString()
  };

  const cached = getCache('tournaments', []);
  const updated = [newTourn, ...cached];
  setCache('tournaments', updated);

  // Background sync
  try {
    setDoc(doc(db, 'tournaments', newId), {
      ...data,
      created_at: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}

  return newTourn;
};

export const updateTournament = async (id, data) => {
  const cached = getCache('tournaments', []);
  const updated = cached.map(t => t.id === id ? { ...t, ...data } : t);
  setCache('tournaments', updated);

  try {
    updateDoc(doc(db, 'tournaments', id), data).catch(() => {});
  } catch (e) {}
  return { id, ...data };
};

export const deleteTournament = async (id) => {
  const cached = getCache('tournaments', []);
  setCache('tournaments', cached.filter(t => t.id !== id));

  try {
    deleteDoc(doc(db, 'tournaments', id)).catch(() => {});
  } catch (e) {}
  return true;
};

// ==========================================
// 2. TEAMS & PLAYERS (0ms instant return)
// ==========================================

export const getTeams = async (tournamentId = null) => {
  const cached = getCache('teams', []);
  const filtered = tournamentId ? cached.filter(t => t.tournament === tournamentId) : cached;

  // Background sync
  (async () => {
    try {
      const snap = await getDocs(collection(db, 'teams'));
      if (snap && snap.docs.length > 0) {
        const teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCache('teams', teams);
      }
    } catch (e) {}
  })();

  return filtered;
};

export const subscribeTeams = (tournamentId, callback) => {
  const cached = getCache('teams', []);
  const filtered = tournamentId ? cached.filter(t => t.tournament === tournamentId) : cached;
  callback(filtered);

  try {
    return onSnapshot(collection(db, 'teams'), (snapshot) => {
      if (snapshot && snapshot.docs.length > 0) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setCache('teams', data);
        const res = tournamentId ? data.filter(t => t.tournament === tournamentId) : data;
        callback(res);
      }
    }, () => callback(filtered));
  } catch (e) {
    return () => {};
  }
};

export const createTeam = async (data) => {
  const newId = generateId();
  const newTeam = {
    id: newId,
    ...data,
    players: [],
    created_at: new Date().toISOString()
  };

  const cached = getCache('teams', []);
  setCache('teams', [...cached, newTeam]);

  try {
    setDoc(doc(db, 'teams', newId), {
      ...data,
      created_at: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}

  return newTeam;
};

export const updateTeam = async (id, data) => {
  const cached = getCache('teams', []);
  const updated = cached.map(t => t.id === id ? { ...t, ...data } : t);
  setCache('teams', updated);

  try {
    updateDoc(doc(db, 'teams', id), data).catch(() => {});
  } catch (e) {}
  return { id, ...data };
};

export const deleteTeam = async (teamId) => {
  const cached = getCache('teams', []);
  setCache('teams', cached.filter(t => t.id !== teamId));

  try {
    deleteDoc(doc(db, 'teams', teamId)).catch(() => {});
  } catch (e) {}
  return true;
};

export const addPlayer = async (data) => {
  const newId = generateId();
  const newPlayer = { id: newId, ...data };

  const cached = getCache('teams', []);
  const updated = cached.map(t => {
    if (t.id === data.team) {
      return { ...t, players: [...(t.players || []), newPlayer] };
    }
    return t;
  });
  setCache('teams', updated);

  try {
    setDoc(doc(db, 'players', newId), {
      ...data,
      created_at: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}

  return newPlayer;
};

export const updatePlayer = async (id, data) => {
  const cached = getCache('teams', []);
  const updated = cached.map(t => ({
    ...t,
    players: (t.players || []).map(p => p.id === id ? { ...p, ...data } : p)
  }));
  setCache('teams', updated);

  try {
    updateDoc(doc(db, 'players', id), data).catch(() => {});
  } catch (e) {}
  return { id, ...data };
};

export const deletePlayer = async (id) => {
  const cached = getCache('teams', []);
  const updated = cached.map(t => ({
    ...t,
    players: (t.players || []).filter(p => p.id !== id)
  }));
  setCache('teams', updated);

  try {
    deleteDoc(doc(db, 'players', id)).catch(() => {});
  } catch (e) {}
  return true;
};

// ==========================================
// 3. MATCHES & EVENTS (0ms instant return)
// ==========================================

export const getMatches = async (tournamentId = null) => {
  const cached = getCache('matches', []);
  const filtered = tournamentId ? cached.filter(m => m.tournament === tournamentId) : cached;

  // Background sync
  (async () => {
    try {
      const snap = await getDocs(collection(db, 'matches'));
      if (snap && snap.docs.length > 0) {
        const teamsCached = getCache('teams', []);
        const teamMap = {};
        teamsCached.forEach(t => { teamMap[t.id] = t; });

        const matches = snap.docs.map(d => {
          const m = { id: d.id, ...d.data() };
          if (m.home_team && teamMap[m.home_team]) m.home_team_details = teamMap[m.home_team];
          if (m.away_team && teamMap[m.away_team]) m.away_team_details = teamMap[m.away_team];
          return m;
        });
        matches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
        setCache('matches', matches);
      }
    } catch (e) {}
  })();

  return filtered;
};

export const subscribeMatches = (tournamentId, callback) => {
  const cached = getCache('matches', []);
  const filtered = tournamentId ? cached.filter(m => m.tournament === tournamentId) : cached;
  callback(filtered);

  try {
    return onSnapshot(collection(db, 'matches'), (snapshot) => {
      if (snapshot && snapshot.docs.length > 0) {
        const teamsCached = getCache('teams', []);
        const teamMap = {};
        teamsCached.forEach(t => { teamMap[t.id] = t; });

        const matches = snapshot.docs.map(d => {
          const m = { id: d.id, ...d.data() };
          if (m.home_team && teamMap[m.home_team]) m.home_team_details = teamMap[m.home_team];
          if (m.away_team && teamMap[m.away_team]) m.away_team_details = teamMap[m.away_team];
          return m;
        });
        matches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
        setCache('matches', matches);
        const res = tournamentId ? matches.filter(m => m.tournament === tournamentId) : matches;
        callback(res);
      }
    }, () => callback(filtered));
  } catch (e) {
    return () => {};
  }
};

export const getMatch = async (id) => {
  const cached = getCache('matches', []);
  const match = cached.find(m => m.id === id);
  return match || null;
};

export const subscribeMatch = (id, callback) => {
  const cached = getCache('matches', []);
  const match = cached.find(m => m.id === id);
  if (match) callback(match);

  try {
    return onSnapshot(doc(db, 'matches', id), (snap) => {
      if (snap.exists()) {
        const mData = { id: snap.id, ...snap.data() };
        const teamsCached = getCache('teams', []);
        mData.home_team_details = teamsCached.find(t => t.id === mData.home_team) || null;
        mData.away_team_details = teamsCached.find(t => t.id === mData.away_team) || null;
        callback(mData);
      }
    }, () => callback(match || null));
  } catch (e) {
    return () => {};
  }
};

export const createMatch = async (data) => {
  const newId = generateId();
  const teamsCached = getCache('teams', []);
  const newMatch = {
    id: newId,
    home_score: 0,
    away_score: 0,
    status: 'SCHEDULED',
    current_period: 'NOT_STARTED',
    timer_seconds_elapsed: 0,
    is_timer_running: false,
    stage: 'REGULAR',
    ...data,
    home_team_details: teamsCached.find(t => t.id === data.home_team) || null,
    away_team_details: teamsCached.find(t => t.id === data.away_team) || null,
    created_at: new Date().toISOString()
  };

  const cached = getCache('matches', []);
  setCache('matches', [...cached, newMatch]);

  try {
    setDoc(doc(db, 'matches', newId), {
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      timer_seconds_elapsed: 0,
      is_timer_running: false,
      stage: 'REGULAR',
      ...data,
      created_at: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}

  return newMatch;
};

export const updateMatch = async (id, data) => {
  const cached = getCache('matches', []);
  const updated = cached.map(m => m.id === id ? { ...m, ...data } : m);
  setCache('matches', updated);

  try {
    updateDoc(doc(db, 'matches', id), data).catch(() => {});
  } catch (e) {}
  return { id, ...data };
};

export const deleteMatch = async (id) => {
  const cached = getCache('matches', []);
  setCache('matches', cached.filter(m => m.id !== id));

  try {
    deleteDoc(doc(db, 'matches', id)).catch(() => {});
  } catch (e) {}
  return true;
};

export const setNextMatch = async (matchId) => {
  const cached = getCache('matches', []);
  const match = cached.find(m => m.id === matchId);
  const newIsNext = !match?.is_next_match;

  const updated = cached.map(m => {
    if (m.id === matchId) return { ...m, is_next_match: newIsNext };
    if (newIsNext && m.tournament === match?.tournament) return { ...m, is_next_match: false };
    return m;
  });
  setCache('matches', updated);

  try {
    updateDoc(doc(db, 'matches', matchId), { is_next_match: newIsNext }).catch(() => {});
  } catch (e) {}

  return { is_next_match: newIsNext };
};

// ==========================================
// 4. STANDINGS (POINTS TABLE CALCULATION)
// ==========================================

export const calculateStandings = async (tournamentId) => {
  const teams = await getTeams(tournamentId);
  const matches = await getMatches(tournamentId);

  const table = {};
  for (const t of teams) {
    table[t.id] = {
      team: { id: t.id, name: t.name, code: t.code },
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0
    };
  }

  for (const m of matches) {
    if (m.stage && m.stage !== 'REGULAR') continue;
    if (!m.home_team || !m.away_team) continue;
    if (!table[m.home_team] || !table[m.away_team]) continue;

    if (m.status === 'IN_PROGRESS' || m.status === 'COMPLETED' || m.status === 'FINISHED') {
      const hScore = Number(m.home_score) || 0;
      const aScore = Number(m.away_score) || 0;

      table[m.home_team].played += 1;
      table[m.away_team].played += 1;

      table[m.home_team].goals_for += hScore;
      table[m.home_team].goals_against += aScore;
      table[m.away_team].goals_for += aScore;
      table[m.away_team].goals_against += hScore;

      table[m.home_team].goal_difference = table[m.home_team].goals_for - table[m.home_team].goals_against;
      table[m.away_team].goal_difference = table[m.away_team].goals_for - table[m.away_team].goals_against;

      if (hScore > aScore) {
        table[m.home_team].won += 1;
        table[m.home_team].points += 3;
        table[m.away_team].lost += 1;
      } else if (aScore > hScore) {
        table[m.away_team].won += 1;
        table[m.away_team].points += 3;
        table[m.home_team].lost += 1;
      } else {
        table[m.home_team].drawn += 1;
        table[m.home_team].points += 1;
        table[m.away_team].drawn += 1;
        table[m.away_team].points += 1;
      }
    }
  }

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team.name.localeCompare(b.team.name);
  });
};

// ==========================================
// 5. BRACKET GENERATION & ADVANCEMENT
// ==========================================

export const generateBracket = async (tournamentId, teamIds) => {
  if (![4, 8].includes(teamIds.length)) {
    throw new Error('Please select exactly 4 or 8 teams for the bracket.');
  }

  const cached = getCache('matches', []);
  const nonBracket = cached.filter(m => m.tournament !== tournamentId || (!m.stage || m.stage === 'REGULAR'));
  
  const now = new Date();
  const newBracketMatches = [];

  const addMatch = (home, away, stage, code, hoursOffset) => {
    const mId = generateId();
    newBracketMatches.push({
      id: mId,
      tournament: tournamentId,
      home_team: home,
      away_team: away,
      stage,
      bracket_code: code,
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + hoursOffset * 3600000).toISOString(),
      created_at: new Date().toISOString()
    });
  };

  if (teamIds.length === 8) {
    addMatch(teamIds[0], teamIds[1], 'QUARTER_FINAL', 'QF1', 2);
    addMatch(teamIds[2], teamIds[3], 'QUARTER_FINAL', 'QF2', 4);
    addMatch(teamIds[4], teamIds[5], 'QUARTER_FINAL', 'QF3', 6);
    addMatch(teamIds[6], teamIds[7], 'QUARTER_FINAL', 'QF4', 8);
    addMatch(null, null, 'SEMI_FINAL', 'SF1', 24);
    addMatch(null, null, 'SEMI_FINAL', 'SF2', 26);
    addMatch(null, null, 'FINAL', 'FINAL', 30);
  } else if (teamIds.length === 4) {
    addMatch(teamIds[0], teamIds[1], 'SEMI_FINAL', 'SF1', 2);
    addMatch(teamIds[2], teamIds[3], 'SEMI_FINAL', 'SF2', 4);
    addMatch(null, null, 'FINAL', 'FINAL', 8);
  }

  setCache('matches', [...nonBracket, ...newBracketMatches]);

  try {
    for (const m of newBracketMatches) {
      setDoc(doc(db, 'matches', m.id), {
        ...m,
        created_at: serverTimestamp()
      }).catch(() => {});
    }
  } catch (e) {}

  return true;
};

// ==========================================
// 6. MATCH EVENTS (GOALS, CARDS, VAR)
// ==========================================

export const addMatchEvent = async (payload) => {
  const newId = generateId();
  const newEvent = { id: newId, ...payload, created_at: new Date().toISOString() };

  if (payload.event_type === 'GOAL' && payload.match && payload.team) {
    const cachedMatches = getCache('matches', []);
    const match = cachedMatches.find(m => m.id === payload.match);
    if (match) {
      if (payload.team === match.home_team) {
        await updateMatch(payload.match, { home_score: (Number(match.home_score) || 0) + 1 });
      } else if (payload.team === match.away_team) {
        await updateMatch(payload.match, { away_score: (Number(match.away_score) || 0) + 1 });
      }
    }
  }

  try {
    setDoc(doc(db, 'match_events', newId), {
      ...payload,
      created_at: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}

  return newEvent;
};

export const deleteMatchEvent = async (eventId) => {
  try {
    deleteDoc(doc(db, 'match_events', eventId)).catch(() => {});
  } catch (e) {}
  return true;
};
