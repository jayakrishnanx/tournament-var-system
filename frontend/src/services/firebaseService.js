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
// Instant In-Memory & Local Storage Cache
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

// Helper to deep clean undefined values from objects before writing to Firestore
export const cleanData = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanData);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && typeof value !== 'function') {
      result[key] = typeof value === 'object' && value !== null ? cleanData(value) : value;
    }
  }
  return result;
};

// Auto-sync existing local data to Firestore if cloud is new/empty
let isSyncedToCloud = false;
export const syncLocalToCloud = async () => {
  if (isSyncedToCloud) return;
  isSyncedToCloud = true;

  try {
    const localTourns = getCache('tournaments', []);
    const localTeams = getCache('teams', []);
    const localMatches = getCache('matches', []);

    // Sync Tournaments
    for (const t of localTourns) {
      if (t && t.id) {
        const cleaned = cleanData(t);
        await setDoc(doc(db, 'tournaments', String(t.id)), cleaned, { merge: true });
      }
    }

    // Sync Teams
    for (const tm of localTeams) {
      if (tm && tm.id) {
        const cleaned = cleanData(tm);
        await setDoc(doc(db, 'teams', String(tm.id)), cleaned, { merge: true });
      }
    }

    // Sync Matches
    for (const m of localMatches) {
      if (m && m.id) {
        const cleaned = cleanData(m);
        await setDoc(doc(db, 'matches', String(m.id)), cleaned, { merge: true });
      }
    }
    console.log(`🔥 Synced to Cloud: ${localTourns.length} tournaments, ${localTeams.length} teams, ${localMatches.length} matches`);
  } catch (err) {
    console.warn('Auto cloud sync notice:', err);
  }
};

// Kick off background cloud sync on app start
if (typeof window !== 'undefined') {
  setTimeout(syncLocalToCloud, 200);
}

// ==========================================
// 1. TOURNAMENTS
// ==========================================

export const getTournaments = async () => {
  try {
    const snap = await getDocs(collection(db, 'tournaments'));
    if (snap && !snap.empty) {
      const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      remote.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
      setCache('tournaments', remote);
      return remote;
    }
  } catch (e) {
    console.warn('Firestore getTournaments read error:', e);
  }
  return getCache('tournaments', []);
};

export const subscribeTournaments = (callback) => {
  const cached = getCache('tournaments', []);
  callback(cached);

  try {
    return onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      if (snapshot && !snapshot.empty) {
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
  try {
    const docRef = doc(db, 'tournaments', String(id));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (e) {}
  const cached = getCache('tournaments', []);
  return cached.find(t => String(t.id) === String(id)) || null;
};

export const createTournament = async (data) => {
  const newId = generateId();
  const newTourn = {
    id: newId,
    ...data,
    created_at: new Date().toISOString()
  };

  const cached = getCache('tournaments', []);
  setCache('tournaments', [newTourn, ...cached]);

  try {
    await setDoc(doc(db, 'tournaments', newId), {
      ...data,
      created_at: serverTimestamp()
    });
  } catch (e) {
    console.error('Create tournament firestore error:', e);
  }

  return newTourn;
};

export const updateTournament = async (id, data) => {
  const cached = getCache('tournaments', []);
  const updated = cached.map(t => String(t.id) === String(id) ? { ...t, ...data } : t);
  setCache('tournaments', updated);

  try {
    await updateDoc(doc(db, 'tournaments', String(id)), data);
  } catch (e) {}
  return { id, ...data };
};

export const deleteTournament = async (id) => {
  const cached = getCache('tournaments', []);
  setCache('tournaments', cached.filter(t => String(t.id) !== String(id)));

  try {
    await deleteDoc(doc(db, 'tournaments', String(id)));
  } catch (e) {}
  return true;
};

// ==========================================
// 2. TEAMS & PLAYERS
// ==========================================

export const getTeams = async (tournamentId = null) => {
  try {
    const snap = await getDocs(collection(db, 'teams'));
    if (snap && !snap.empty) {
      const teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCache('teams', teams);
      return tournamentId ? teams.filter(t => String(t.tournament) === String(tournamentId)) : teams;
    }
  } catch (e) {
    console.warn('Firestore getTeams read error:', e);
  }
  const cached = getCache('teams', []);
  return tournamentId ? cached.filter(t => String(t.tournament) === String(tournamentId)) : cached;
};

export const subscribeTeams = (tournamentId, callback) => {
  const cached = getCache('teams', []);
  const filtered = tournamentId ? cached.filter(t => String(t.tournament) === String(tournamentId)) : cached;
  callback(filtered);

  try {
    return onSnapshot(collection(db, 'teams'), (snapshot) => {
      if (snapshot && !snapshot.empty) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setCache('teams', data);
        const res = tournamentId ? data.filter(t => String(t.tournament) === String(tournamentId)) : data;
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
    await setDoc(doc(db, 'teams', newId), {
      ...data,
      created_at: serverTimestamp()
    });
  } catch (e) {
    console.error('Create team firestore error:', e);
  }

  return newTeam;
};

export const updateTeam = async (id, data) => {
  const cached = getCache('teams', []);
  const updated = cached.map(t => String(t.id) === String(id) ? { ...t, ...data } : t);
  setCache('teams', updated);

  try {
    await updateDoc(doc(db, 'teams', String(id)), data);
  } catch (e) {}
  return { id, ...data };
};

export const deleteTeam = async (teamId) => {
  const cached = getCache('teams', []);
  setCache('teams', cached.filter(t => String(t.id) !== String(teamId)));

  try {
    await deleteDoc(doc(db, 'teams', String(teamId)));
  } catch (e) {}
  return true;
};

export const addPlayer = async (data) => {
  const newId = generateId();
  const newPlayer = { id: newId, ...data };

  const cached = getCache('teams', []);
  const updated = cached.map(t => {
    if (String(t.id) === String(data.team)) {
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
    players: (t.players || []).map(p => String(p.id) === String(id) ? { ...p, ...data } : p)
  }));
  setCache('teams', updated);

  try {
    await updateDoc(doc(db, 'players', String(id)), data);
  } catch (e) {}
  return { id, ...data };
};

export const deletePlayer = async (id) => {
  const cached = getCache('teams', []);
  const updated = cached.map(t => ({
    ...t,
    players: (t.players || []).filter(p => String(p.id) !== String(id))
  }));
  setCache('teams', updated);

  try {
    await deleteDoc(doc(db, 'players', String(id)));
  } catch (e) {}
  return true;
};

// ==========================================
// 3. MATCHES
// ==========================================

export const getMatches = async (tournamentId = null, stage = null) => {
  try {
    const snap = await getDocs(collection(db, 'matches'));
    if (snap && !snap.empty) {
      let matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCache('matches', matches);
      if (tournamentId) matches = matches.filter(m => String(m.tournament) === String(tournamentId));
      if (stage) matches = matches.filter(m => m.stage === stage);
      return matches;
    }
  } catch (e) {
    console.warn('Firestore getMatches read error:', e);
  }

  let cached = getCache('matches', []);
  if (tournamentId) cached = cached.filter(m => String(m.tournament) === String(tournamentId));
  if (stage) cached = cached.filter(m => m.stage === stage);
  return cached;
};

export const subscribeMatches = (tournamentId, callback) => {
  const cached = getCache('matches', []);
  const filtered = tournamentId ? cached.filter(m => String(m.tournament) === String(tournamentId)) : cached;
  callback(filtered);

  try {
    return onSnapshot(collection(db, 'matches'), (snapshot) => {
      if (snapshot && !snapshot.empty) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setCache('matches', data);
        const res = tournamentId ? data.filter(m => String(m.tournament) === String(tournamentId)) : data;
        callback(res);
      }
    }, () => callback(filtered));
  } catch (e) {
    return () => {};
  }
};

export const getMatch = async (id) => {
  try {
    const docRef = doc(db, 'matches', String(id));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (e) {}

  const cached = getCache('matches', []);
  return cached.find(m => String(m.id) === String(id)) || null;
};

export const subscribeMatch = (matchId, callback) => {
  const cached = getCache('matches', []);
  const item = cached.find(m => String(m.id) === String(matchId));
  if (item) callback(item);

  try {
    return onSnapshot(doc(db, 'matches', String(matchId)), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        callback(data);
      }
    });
  } catch (e) {
    return () => {};
  }
};

export const createMatch = async (data) => {
  const newId = generateId();
  const teams = getCache('teams', []);
  const homeTeamObj = teams.find(t => String(t.id) === String(data.home_team));
  const awayTeamObj = teams.find(t => String(t.id) === String(data.away_team));

  const newMatch = {
    id: newId,
    status: 'SCHEDULED',
    home_score: 0,
    away_score: 0,
    current_time: '00:00',
    current_period: 1,
    stage: 'REGULAR',
    ...data,
    home_team_details: homeTeamObj || { name: 'Home Team' },
    away_team_details: awayTeamObj || { name: 'Away Team' },
    created_at: new Date().toISOString()
  };

  const cached = getCache('matches', []);
  setCache('matches', [...cached, newMatch]);

  try {
    await setDoc(doc(db, 'matches', newId), cleanData({
      ...newMatch,
      created_at: serverTimestamp()
    }));
  } catch (e) {
    console.error('Create match firestore error:', e);
  }

  return newMatch;
};

export const updateMatch = async (id, data) => {
  const cached = getCache('matches', []);
  const updated = cached.map(m => String(m.id) === String(id) ? { ...m, ...data } : m);
  setCache('matches', updated);

  try {
    await updateDoc(doc(db, 'matches', String(id)), cleanData(data));
  } catch (e) {}
  return { id, ...data };
};

export const deleteMatch = async (id) => {
  const cached = getCache('matches', []);
  setCache('matches', cached.filter(m => String(m.id) !== String(id)));

  try {
    await deleteDoc(doc(db, 'matches', String(id)));
  } catch (e) {}
  return true;
};

export const setNextMatch = async (matchId) => {
  const cached = getCache('matches', []);
  const target = cached.find(m => String(m.id) === String(matchId));
  if (!target) return null;

  const updated = cached.map(m => ({
    ...m,
    is_next_match: String(m.id) === String(matchId)
  }));
  setCache('matches', updated);

  try {
    for (const m of updated) {
      updateDoc(doc(db, 'matches', String(m.id)), { is_next_match: m.is_next_match }).catch(() => {});
    }
  } catch (e) {}

  return target;
};

// ==========================================
// 4. STANDINGS CALCULATION
// ==========================================

export const calculateStandings = async (tournamentId) => {
  const teams = await getTeams(tournamentId);
  const matches = await getMatches(tournamentId);

  const standingsMap = {};

  teams.forEach(team => {
    standingsMap[team.id] = {
      team: team.id,
      team_name: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0
    };
  });

  matches.filter(m => m.status === 'ENDED').forEach(m => {
    const home = standingsMap[m.home_team];
    const away = standingsMap[m.away_team];

    if (home && away) {
      home.played += 1;
      away.played += 1;
      home.goals_for += Number(m.home_score || 0);
      home.goals_against += Number(m.away_score || 0);
      away.goals_for += Number(m.away_score || 0);
      away.goals_against += Number(m.home_score || 0);

      if (m.home_score > m.away_score) {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
      } else if (m.home_score < m.away_score) {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }
    }
  });

  const list = Object.values(standingsMap).map(s => ({
    ...s,
    goal_difference: s.goals_for - s.goals_against
  }));

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    return b.goals_for - a.goals_for;
  });

  return list;
};

// ==========================================
// 5. KNOCKOUT BRACKET GENERATION
// ==========================================

export const generateKnockoutBracket = async (tournamentId, teamIds) => {
  const teams = await getTeams(tournamentId);
  const selectedTeams = teams.filter(t => teamIds.includes(t.id));

  if (selectedTeams.length !== 4 && selectedTeams.length !== 8) {
    throw new Error('Must select 4 or 8 teams for knockout bracket');
  }

  const createdMatches = [];
  const count = selectedTeams.length;

  if (count === 4) {
    // 2 Semi-Finals
    const sf1 = await createMatch({
      tournament: tournamentId,
      home_team: selectedTeams[0].id,
      away_team: selectedTeams[1].id,
      stage: 'SEMI_FINAL',
      match_number: 1,
      bracket_position: 'SF1'
    });
    const sf2 = await createMatch({
      tournament: tournamentId,
      home_team: selectedTeams[2].id,
      away_team: selectedTeams[3].id,
      stage: 'SEMI_FINAL',
      match_number: 2,
      bracket_position: 'SF2'
    });
    // 1 Final
    const fn = await createMatch({
      tournament: tournamentId,
      home_team: selectedTeams[0].id,
      away_team: selectedTeams[2].id,
      stage: 'FINAL',
      match_number: 3,
      bracket_position: 'F'
    });
    createdMatches.push(sf1, sf2, fn);
  } else if (count === 8) {
    // 4 Quarter-Finals
    for (let i = 0; i < 4; i++) {
      const qf = await createMatch({
        tournament: tournamentId,
        home_team: selectedTeams[i * 2].id,
        away_team: selectedTeams[i * 2 + 1].id,
        stage: 'QUARTER_FINAL',
        match_number: i + 1,
        bracket_position: `QF${i + 1}`
      });
      createdMatches.push(qf);
    }
  }

  return createdMatches;
};
