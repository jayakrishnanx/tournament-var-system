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

// Helper to generate IDs
export const generateId = () => {
  return doc(collection(db, '_temp')).id;
};

// ==========================================
// 1. TOURNAMENTS
// ==========================================

export const getTournaments = async () => {
  try {
    const q = query(collection(db, 'tournaments'), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    // If index is missing or query fails, try unordered
    const snapshot = await getDocs(collection(db, 'tournaments'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

export const subscribeTournaments = (callback) => {
  return onSnapshot(collection(db, 'tournaments'), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in memory by created_at desc
    data.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
    callback(data);
  });
};

export const getTournament = async (id) => {
  const docRef = doc(db, 'tournaments', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const createTournament = async (data) => {
  const docRef = await addDoc(collection(db, 'tournaments'), {
    ...data,
    created_at: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

export const updateTournament = async (id, data) => {
  const docRef = doc(db, 'tournaments', id);
  await updateDoc(docRef, data);
  return { id, ...data };
};

export const deleteTournament = async (id) => {
  // Also delete associated teams, players, matches, events
  const teamsSnap = await getDocs(query(collection(db, 'teams'), where('tournament', '==', id)));
  for (const tDoc of teamsSnap.docs) {
    await deleteTeam(tDoc.id);
  }
  const matchesSnap = await getDocs(query(collection(db, 'matches'), where('tournament', '==', id)));
  for (const mDoc of matchesSnap.docs) {
    await deleteDoc(mDoc.ref);
  }
  await deleteDoc(doc(db, 'tournaments', id));
  return true;
};

// ==========================================
// 2. TEAMS & PLAYERS
// ==========================================

export const getTeams = async (tournamentId = null) => {
  let q;
  if (tournamentId) {
    q = query(collection(db, 'teams'), where('tournament', '==', tournamentId));
  } else {
    q = collection(db, 'teams');
  }
  const snap = await getDocs(q);
  const teams = [];
  for (const d of snap.docs) {
    const tData = { id: d.id, ...d.data() };
    // Fetch players for each team
    const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', d.id)));
    tData.players = playersSnap.docs.map(p => ({ id: p.id, ...p.data() }));
    teams.push(tData);
  }
  return teams;
};

export const subscribeTeams = (tournamentId, callback) => {
  let q = collection(db, 'teams');
  if (tournamentId) {
    q = query(collection(db, 'teams'), where('tournament', '==', tournamentId));
  }
  return onSnapshot(q, async (snapshot) => {
    const teams = [];
    for (const d of snapshot.docs) {
      const tData = { id: d.id, ...d.data() };
      const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', d.id)));
      tData.players = playersSnap.docs.map(p => ({ id: p.id, ...p.data() }));
      teams.push(tData);
    }
    callback(teams);
  });
};

export const createTeam = async (data) => {
  const docRef = await addDoc(collection(db, 'teams'), {
    ...data,
    created_at: serverTimestamp()
  });
  return { id: docRef.id, ...data, players: [] };
};

export const updateTeam = async (id, data) => {
  const docRef = doc(db, 'teams', id);
  await updateDoc(docRef, data);
  return { id, ...data };
};

export const deleteTeam = async (teamId) => {
  // Delete all players for this team
  const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', teamId)));
  for (const pDoc of playersSnap.docs) {
    await deleteDoc(pDoc.ref);
  }
  await deleteDoc(doc(db, 'teams', teamId));
  return true;
};

export const addPlayer = async (data) => {
  const docRef = await addDoc(collection(db, 'players'), {
    ...data,
    created_at: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

export const updatePlayer = async (id, data) => {
  const docRef = doc(db, 'players', id);
  await updateDoc(docRef, data);
  return { id, ...data };
};

export const deletePlayer = async (id) => {
  await deleteDoc(doc(db, 'players', id));
  return true;
};

// ==========================================
// 3. MATCHES & EVENTS
// ==========================================

export const getMatches = async (tournamentId = null) => {
  let q;
  if (tournamentId) {
    q = query(collection(db, 'matches'), where('tournament', '==', tournamentId));
  } else {
    q = collection(db, 'matches');
  }
  const snap = await getDocs(q);
  const matches = [];
  for (const d of snap.docs) {
    const mData = { id: d.id, ...d.data() };
    // Attach team details
    if (mData.home_team) {
      const htDoc = await getDoc(doc(db, 'teams', mData.home_team));
      if (htDoc.exists()) mData.home_team_details = { id: htDoc.id, ...htDoc.data() };
    }
    if (mData.away_team) {
      const atDoc = await getDoc(doc(db, 'teams', mData.away_team));
      if (atDoc.exists()) mData.away_team_details = { id: atDoc.id, ...atDoc.data() };
    }
    matches.push(mData);
  }
  return matches;
};

export const subscribeMatches = (tournamentId, callback) => {
  let q = collection(db, 'matches');
  if (tournamentId) {
    q = query(collection(db, 'matches'), where('tournament', '==', tournamentId));
  }
  return onSnapshot(q, async (snapshot) => {
    const matches = [];
    for (const d of snapshot.docs) {
      const mData = { id: d.id, ...d.data() };
      if (mData.home_team) {
        const htDoc = await getDoc(doc(db, 'teams', mData.home_team));
        if (htDoc.exists()) mData.home_team_details = { id: htDoc.id, ...htDoc.data() };
      }
      if (mData.away_team) {
        const atDoc = await getDoc(doc(db, 'teams', mData.away_team));
        if (atDoc.exists()) mData.away_team_details = { id: atDoc.id, ...atDoc.data() };
      }
      matches.push(mData);
    }
    matches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
    callback(matches);
  });
};

export const getMatch = async (id) => {
  const docRef = doc(db, 'matches', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const mData = { id: snap.id, ...snap.data() };
  if (mData.home_team) {
    const htDoc = await getDoc(doc(db, 'teams', mData.home_team));
    if (htDoc.exists()) {
      const t = { id: htDoc.id, ...htDoc.data() };
      const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', htDoc.id)));
      t.players = playersSnap.docs.map(p => ({ id: p.id, ...p.data() }));
      mData.home_team_details = t;
    }
  }
  if (mData.away_team) {
    const atDoc = await getDoc(doc(db, 'teams', mData.away_team));
    if (atDoc.exists()) {
      const t = { id: atDoc.id, ...atDoc.data() };
      const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', atDoc.id)));
      t.players = playersSnap.docs.map(p => ({ id: p.id, ...p.data() }));
      mData.away_team_details = t;
    }
  }
  const eventsSnap = await getDocs(query(collection(db, 'match_events'), where('match', '==', id)));
  mData.events = eventsSnap.docs.map(e => ({ id: e.id, ...e.data() }));
  return mData;
};

export const subscribeMatch = (id, callback) => {
  return onSnapshot(doc(db, 'matches', id), async (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const mData = { id: snap.id, ...snap.data() };
    if (mData.home_team) {
      const htDoc = await getDoc(doc(db, 'teams', mData.home_team));
      if (htDoc.exists()) {
        const t = { id: htDoc.id, ...htDoc.data() };
        const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', htDoc.id)));
        t.players = playersSnap.docs.map(p => ({ id: p.id, ...p.data() }));
        mData.home_team_details = t;
      }
    }
    if (mData.away_team) {
      const atDoc = await getDoc(doc(db, 'teams', mData.away_team));
      if (atDoc.exists()) {
        const t = { id: atDoc.id, ...atDoc.data() };
        const playersSnap = await getDocs(query(collection(db, 'players'), where('team', '==', atDoc.id)));
        t.players = playersSnap.docs.map(p => ({ id: p.id, ...p.data() }));
        mData.away_team_details = t;
      }
    }
    const eventsSnap = await getDocs(query(collection(db, 'match_events'), where('match', '==', id)));
    mData.events = eventsSnap.docs.map(e => ({ id: e.id, ...e.data() }));
    callback(mData);
  });
};

export const createMatch = async (data) => {
  const docRef = await addDoc(collection(db, 'matches'), {
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
  return { id: docRef.id, ...data };
};

export const updateMatch = async (id, data) => {
  const docRef = doc(db, 'matches', id);
  await updateDoc(docRef, data);
  return { id, ...data };
};

export const deleteMatch = async (id) => {
  const eventsSnap = await getDocs(query(collection(db, 'match_events'), where('match', '==', id)));
  for (const eDoc of eventsSnap.docs) {
    await deleteDoc(eDoc.ref);
  }
  await deleteDoc(doc(db, 'matches', id));
  return true;
};

export const setNextMatch = async (matchId) => {
  const matchDoc = await getDoc(doc(db, 'matches', matchId));
  if (!matchDoc.exists()) return false;
  const currentIsNext = matchDoc.data().is_next_match || false;
  const newIsNext = !currentIsNext;

  if (newIsNext) {
    // Clear is_next_match on all other matches in same tournament
    const tourId = matchDoc.data().tournament;
    const snap = await getDocs(query(collection(db, 'matches'), where('tournament', '==', tourId)));
    for (const d of snap.docs) {
      if (d.id !== matchId && d.data().is_next_match) {
        await updateDoc(d.ref, { is_next_match: false });
      }
    }
  }

  await updateDoc(doc(db, 'matches', matchId), { is_next_match: newIsNext });
  return { is_next_match: newIsNext };
};

// ==========================================
// 4. STANDINGS (POINTS TABLE CALCULATION)
// ==========================================

export const calculateStandings = async (tournamentId) => {
  const teamsSnap = await getDocs(query(collection(db, 'teams'), where('tournament', '==', tournamentId)));
  const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const matchesSnap = await getDocs(query(collection(db, 'matches'), where('tournament', '==', tournamentId)));
  const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Initialize table for all teams
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

  // Calculate from completed/in-progress regular matches
  for (const m of matches) {
    if (m.stage && m.stage !== 'REGULAR') continue; // Bracket matches don't affect regular points table
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

  // Sort by PTS desc, GD desc, GF desc, Name asc
  const result = Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team.name.localeCompare(b.team.name);
  });

  return result;
};

// ==========================================
// 5. BRACKET GENERATION & ADVANCEMENT
// ==========================================

export const generateBracket = async (tournamentId, teamIds) => {
  if (![4, 8].includes(teamIds.length)) {
    throw new Error('Please select exactly 4 or 8 teams for the bracket.');
  }

  // Delete existing bracket matches
  const snap = await getDocs(query(collection(db, 'matches'), where('tournament', '==', tournamentId)));
  for (const d of snap.docs) {
    if (d.data().stage && d.data().stage !== 'REGULAR') {
      await deleteDoc(d.ref);
    }
  }

  const now = new Date();

  if (teamIds.length === 8) {
    // Quarter Finals
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: teamIds[0],
      away_team: teamIds[1],
      stage: 'QUARTER_FINAL',
      bracket_code: 'QF1',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 2 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: teamIds[2],
      away_team: teamIds[3],
      stage: 'QUARTER_FINAL',
      bracket_code: 'QF2',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 4 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: teamIds[4],
      away_team: teamIds[5],
      stage: 'QUARTER_FINAL',
      bracket_code: 'QF3',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 6 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: teamIds[6],
      away_team: teamIds[7],
      stage: 'QUARTER_FINAL',
      bracket_code: 'QF4',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 8 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });

    // Semi Finals Placeholders
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: null,
      away_team: null,
      stage: 'SEMI_FINAL',
      bracket_code: 'SF1',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 24 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: null,
      away_team: null,
      stage: 'SEMI_FINAL',
      bracket_code: 'SF2',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 26 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });

    // Final Placeholder
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: null,
      away_team: null,
      stage: 'FINAL',
      bracket_code: 'FINAL',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 30 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });
  } else if (teamIds.length === 4) {
    // Semi Finals
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: teamIds[0],
      away_team: teamIds[1],
      stage: 'SEMI_FINAL',
      bracket_code: 'SF1',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 2 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: teamIds[2],
      away_team: teamIds[3],
      stage: 'SEMI_FINAL',
      bracket_code: 'SF2',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 4 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });

    // Final Placeholder
    await addDoc(collection(db, 'matches'), {
      tournament: tournamentId,
      home_team: null,
      away_team: null,
      stage: 'FINAL',
      bracket_code: 'FINAL',
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      current_period: 'NOT_STARTED',
      scheduled_time: new Date(now.getTime() + 8 * 3600000).toISOString(),
      created_at: serverTimestamp()
    });
  }

  return true;
};

// ==========================================
// 6. MATCH EVENTS (GOALS, CARDS, VAR)
// ==========================================

export const addMatchEvent = async (payload) => {
  const docRef = await addDoc(collection(db, 'match_events'), {
    ...payload,
    created_at: serverTimestamp()
  });

  if (payload.event_type === 'GOAL' && payload.match && payload.team) {
    const matchData = await getMatch(payload.match);
    if (matchData) {
      if (payload.team === matchData.home_team) {
        await updateMatch(payload.match, { home_score: (Number(matchData.home_score) || 0) + 1 });
      } else if (payload.team === matchData.away_team) {
        await updateMatch(payload.match, { away_score: (Number(matchData.away_score) || 0) + 1 });
      }
    }
  }

  return { id: docRef.id, ...payload };
};

export const deleteMatchEvent = async (eventId) => {
  const docRef = doc(db, 'match_events', eventId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const eventData = snap.data();
    await deleteDoc(docRef);
    if (eventData.event_type === 'GOAL' && eventData.match && eventData.team) {
      const matchData = await getMatch(eventData.match);
      if (matchData) {
        if (eventData.team === matchData.home_team) {
          await updateMatch(eventData.match, { home_score: Math.max(0, (Number(matchData.home_score) || 0) - 1) });
        } else if (eventData.team === matchData.away_team) {
          await updateMatch(eventData.match, { away_score: Math.max(0, (Number(matchData.away_score) || 0) - 1) });
        }
      }
    }
  }
  return true;
};

