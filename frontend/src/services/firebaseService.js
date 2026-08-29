import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Helper to generate unique IDs
export const generateId = () => {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

// ==========================================
// High-Speed Local Storage Cache Helpers (0ms Latency)
// ==========================================
const getCache = (key, defaultVal = []) => {
  try {
    const raw = localStorage.getItem(`var_cache_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setCache = (key, data) => {
  try {
    localStorage.setItem(`var_cache_${key}`, JSON.stringify(data));
  } catch (e) {}
};

// Safe Firestore query with fast timeout fallback
const withTimeout = (promise, ms = 2000, fallbackVal = null) => {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackVal), ms))
  ]);
};

// ==========================================
// 1. TOURNAMENTS
// ==========================================

export const getTournaments = async () => {
  const cached = getCache('tournaments', []);
  
  // Background fetch to keep cache synced
  const fetchPromise = (async () => {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) {
        setCache('tournaments', data);
        return data;
      }
    } catch (err) {
      try {
        const snapshot = await getDocs(collection(db, 'tournaments'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (data.length > 0) {
          setCache('tournaments', data);
          return data;
        }
      } catch (e) {}
    }
    return cached;
  })();

  // If we have cache, return immediately (0ms), otherwise wait max 1.5s
  if (cached.length > 0) {
    fetchPromise.catch(() => {});
    return cached;
  }
  const result = await withTimeout(fetchPromise, 1500, cached);
  return result || cached;
};

export const subscribeTournaments = (callback) => {
  const cached = getCache('tournaments', []);
  if (cached.length > 0) callback(cached);

  try {
    return onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
      if (data.length > 0) setCache('tournaments', data);
      callback(data.length > 0 ? data : cached);
    }, () => {
      callback(cached);
    });
  } catch (e) {
    return () => {};
  }
};

export const getTournament = async (id) => {
  const cachedTourns = getCache('tournaments', []);
  const fromCache = cachedTourns.find(t => t.id === id);

  const fetchPromise = (async () => {
    try {
      const docRef = doc(db, 'tournaments', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        return data;
      }
    } catch (e) {}
    return fromCache || null;
  })();

  if (fromCache) {
    fetchPromise.catch(() => {});
    return fromCache;
  }
  return await withTimeout(fetchPromise, 1500, fromCache);
};

export const createTournament = async (data) => {
  const newId = generateId();
  const newTourn = {
    id: newId,
    ...data,
    created_at: new Date().toISOString()
  };

  // Update cache immediately (0ms)
  const cached = getCache('tournaments', []);
  setCache('tournaments', [newTourn, ...cached]);

  // Sync to Firestore in background
  try {
    await setDoc(doc(db, 'tournaments', newId), {
      ...data,
      created_at: serverTimestamp()
    });
  } catch (e) {
    console.warn('Firestore createTournament error:', e);
  }

  return newTourn;
};

export const updateTournament = async (id, data) => {
  const cached = getCache('tournaments', []);
  const updated = cached.map(t => t.id === id ? { ...t, ...data } : t);
  setCache('tournaments', updated);

  try {
    const docRef = doc(db, 'tournaments', id);
    await updateDoc(docRef, data);
  } catch (e) {}
  return { id, ...data };
};

export const deleteTournament = async (id) => {
  const cached = getCache('tournaments', []);
  setCache('tournaments', cached.filter(t => t.id !== id));

  try {
    const teamsSnap = await getDocs(query(collection(db, 'teams'), where('tournament', '==', id)));
    for (const tDoc of teamsSnap.docs) {
      await deleteTeam(tDoc.id);
    }
    const matchesSnap = await getDocs(query(collection(db, 'matches'), where('tournament', '==', id)));
    for (const mDoc of matchesSnap.docs) {
      await deleteDoc(mDoc.ref);
    }
    await deleteDoc(doc(db, 'tournaments', id));
  } catch (e) {}
  return true;
};

// ==========================================
// 2. TEAMS & PLAYERS
// ==========================================

export const getTeams = async (tournamentId = null) => {
  const cached = getCache('teams', []);
  const filteredCached = tournamentId ? cached.filter(t => t.tournament === tournamentId) : cached;

  const fetchPromise = (async () => {
    try {
      let q = collection(db, 'teams');
      if (tournamentId) {
        q = query(collection(db, 'teams'), where('tournament', '==', tournamentId));
      }
      const snap = await getDocs(q);
      const teams = [];
      for (const d of snap.docs) {
        const tData = { id: d.id, ...d.data() };
        try {
          const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', d.id)));
          tData.players = playersSnap.docs.map(p => ({ id: p.id, ...p.data() }));
        } catch (pe) {
          tData.players = tData.players || [];
        }
        teams.push(tData);
      }
      if (teams.length > 0) {
        if (tournamentId) {
          const others = cached.filter(t => t.tournament !== tournamentId);
          setCache('teams', [...others, ...teams]);
        } else {
          setCache('teams', teams);
        }
        return teams;
      }
    } catch (err) {}
    return filteredCached;
  })();

  if (filteredCached.length > 0) {
    fetchPromise.catch(() => {});
    return filteredCached;
  }
  const res = await withTimeout(fetchPromise, 1500, filteredCached);
  return res || filteredCached;
};

export const subscribeTeams = (tournamentId, callback) => {
  const cached = getCache('teams', []);
  const filtered = tournamentId ? cached.filter(t => t.tournament === tournamentId) : cached;
  if (filtered.length > 0) callback(filtered);

  try {
    let q = collection(db, 'teams');
    if (tournamentId) {
      q = query(collection(db, 'teams'), where('tournament', '==', tournamentId));
    }
    return onSnapshot(q, async (snapshot) => {
      const teams = [];
      for (const d of snapshot.docs) {
        const tData = { id: d.id, ...d.data() };
        try {
          const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', d.id)));
          tData.players = playersSnap.docs.map(p => ({ id: p.id, ...p.data() }));
        } catch (pe) {
          tData.players = [];
        }
        teams.push(tData);
      }
      if (teams.length > 0) {
        if (tournamentId) {
          const others = cached.filter(t => t.tournament !== tournamentId);
          setCache('teams', [...others, ...teams]);
        } else {
          setCache('teams', teams);
        }
      }
      callback(teams.length > 0 ? teams : filtered);
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
    await setDoc(doc(db, 'teams', newId), {
      ...data,
      created_at: serverTimestamp()
    });
  } catch (e) {}

  return newTeam;
};

export const updateTeam = async (id, data) => {
  const cached = getCache('teams', []);
  setCache('teams', cached.map(t => t.id === id ? { ...t, ...data } : t));

  try {
    const docRef = doc(db, 'teams', id);
    await updateDoc(docRef, data);
  } catch (e) {}
  return { id, ...data };
};

export const deleteTeam = async (teamId) => {
  const cached = getCache('teams', []);
  setCache('teams', cached.filter(t => t.id !== teamId));

  try {
    const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', teamId)));
    for (const pDoc of playersSnap.docs) {
      await deleteDoc(pDoc.ref);
    }
    await deleteDoc(doc(db, 'teams', teamId));
  } catch (e) {}
  return true;
};

export const addPlayer = async (data) => {
  const newId = generateId();
  const newPlayer = { id: newId, ...data };

  // Update player inside team cache
  const cached = getCache('teams', []);
  const updated = cached.map(t => {
    if (t.id === data.team) {
      return { ...t, players: [...(t.players || []), newPlayer] };
    }
    return t;
  });
  setCache('teams', updated);

  try {
    await setDoc(doc(db, 'players', newId), {
      ...data,
      created_at: serverTimestamp()
    });
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
    const docRef = doc(db, 'players', id);
    await updateDoc(docRef, data);
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
    await deleteDoc(doc(db, 'players', id));
  } catch (e) {}
  return true;
};

// ==========================================
// 3. MATCHES & EVENTS
// ==========================================

export const getMatches = async (tournamentId = null) => {
  const cached = getCache('matches', []);
  const filteredCached = tournamentId ? cached.filter(m => m.tournament === tournamentId) : cached;

  const fetchPromise = (async () => {
    try {
      let q = collection(db, 'matches');
      if (tournamentId) {
        q = query(collection(db, 'matches'), where('tournament', '==', tournamentId));
      }
      const snap = await getDocs(q);
      const teamsCached = getCache('teams', []);
      const teamMap = {};
      teamsCached.forEach(t => { teamMap[t.id] = t; });

      const matches = [];
      for (const d of snap.docs) {
        const mData = { id: d.id, ...d.data() };
        if (mData.home_team && teamMap[mData.home_team]) {
          mData.home_team_details = teamMap[mData.home_team];
        }
        if (mData.away_team && teamMap[mData.away_team]) {
          mData.away_team_details = teamMap[mData.away_team];
        }
        matches.push(mData);
      }
      matches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
      if (matches.length > 0) {
        if (tournamentId) {
          const others = cached.filter(m => m.tournament !== tournamentId);
          setCache('matches', [...others, ...matches]);
        } else {
          setCache('matches', matches);
        }
        return matches;
      }
    } catch (err) {}
    return filteredCached;
  })();

  if (filteredCached.length > 0) {
    fetchPromise.catch(() => {});
    return filteredCached;
  }
  const res = await withTimeout(fetchPromise, 1500, filteredCached);
  return res || filteredCached;
};

export const subscribeMatches = (tournamentId, callback) => {
  const cached = getCache('matches', []);
  const filtered = tournamentId ? cached.filter(m => m.tournament === tournamentId) : cached;
  if (filtered.length > 0) callback(filtered);

  try {
    let q = collection(db, 'matches');
    if (tournamentId) {
      q = query(collection(db, 'matches'), where('tournament', '==', tournamentId));
    }
    return onSnapshot(q, async (snapshot) => {
      const teamsCached = getCache('teams', []);
      const teamMap = {};
      teamsCached.forEach(t => { teamMap[t.id] = t; });

      const matches = [];
      for (const d of snapshot.docs) {
        const mData = { id: d.id, ...d.data() };
        if (mData.home_team && teamMap[mData.home_team]) {
          mData.home_team_details = teamMap[mData.home_team];
        }
        if (mData.away_team && teamMap[mData.away_team]) {
          mData.away_team_details = teamMap[mData.away_team];
        }
        matches.push(mData);
      }
      matches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
      if (matches.length > 0) {
        if (tournamentId) {
          const others = cached.filter(m => m.tournament !== tournamentId);
          setCache('matches', [...others, ...matches]);
        } else {
          setCache('matches', matches);
        }
      }
      callback(matches.length > 0 ? matches : filtered);
    }, () => callback(filtered));
  } catch (e) {
    return () => {};
  }
};

export const getMatch = async (id) => {
  const cached = getCache('matches', []);
  const fromCache = cached.find(m => m.id === id);

  const fetchPromise = (async () => {
    try {
      const docRef = doc(db, 'matches', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const mData = { id: snap.id, ...snap.data() };
        const teamsCached = getCache('teams', []);
        mData.home_team_details = teamsCached.find(t => t.id === mData.home_team) || null;
        mData.away_team_details = teamsCached.find(t => t.id === mData.away_team) || null;
        return mData;
      }
    } catch (e) {}
    return fromCache || null;
  })();

  if (fromCache) {
    fetchPromise.catch(() => {});
    return fromCache;
  }
  return await withTimeout(fetchPromise, 1500, fromCache);
};

export const subscribeMatch = (id, callback) => {
  const cached = getCache('matches', []);
  const fromCache = cached.find(m => m.id === id);
  if (fromCache) callback(fromCache);

  try {
    return onSnapshot(doc(db, 'matches', id), async (snap) => {
      if (!snap.exists()) {
        callback(fromCache || null);
        return;
      }
      const mData = { id: snap.id, ...snap.data() };
      const teamsCached = getCache('teams', []);
      mData.home_team_details = teamsCached.find(t => t.id === mData.home_team) || null;
      mData.away_team_details = teamsCached.find(t => t.id === mData.away_team) || null;
      callback(mData);
    }, () => callback(fromCache || null));
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
    await setDoc(doc(db, 'matches', newId), {
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      timer_seconds_elapsed: 0,
      is_timer_running: false,
      stage: 'REGULAR',
      ...data,
      created_at: serverTimestamp()
    });
  } catch (e) {}

  return newMatch;
};

export const updateMatch = async (id, data) => {
  const cached = getCache('matches', []);
  setCache('matches', cached.map(m => m.id === id ? { ...m, ...data } : m));

  try {
    const docRef = doc(db, 'matches', id);
    await updateDoc(docRef, data);
  } catch (e) {}
  return { id, ...data };
};

export const deleteMatch = async (id) => {
  const cached = getCache('matches', []);
  setCache('matches', cached.filter(m => m.id !== id));

  try {
    const eventsSnap = await getDocs(query(collection(db, 'match_events'), where('match', '==', id)));
    for (const eDoc of eventsSnap.docs) {
      await deleteDoc(eDoc.ref);
    }
    await deleteDoc(doc(db, 'matches', id));
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
    await updateDoc(doc(db, 'matches', matchId), { is_next_match: newIsNext });
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

  // Remove existing bracket matches
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

  // Sync to Firestore
  try {
    for (const m of newBracketMatches) {
      await setDoc(doc(db, 'matches', m.id), {
        ...m,
        created_at: serverTimestamp()
      });
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
    await setDoc(doc(db, 'match_events', newId), {
      ...payload,
      created_at: serverTimestamp()
    });
  } catch (e) {}

  return newEvent;
};

export const deleteMatchEvent = async (eventId) => {
  try {
    await deleteDoc(doc(db, 'match_events', eventId));
  } catch (e) {}
  return true;
};
