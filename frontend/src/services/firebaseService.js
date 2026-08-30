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
// ==========================================
// Instant In-Memory & Local Storage Cache
// ==========================================
export const getCache = (key, defaultVal = []) => {
  try {
    const raw = localStorage.getItem(`var_data_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

export const setCache = (key, data) => {
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

    // Sync Teams and Players
    for (const tm of localTeams) {
      if (tm && tm.id) {
        const cleaned = cleanData(tm);
        await setDoc(doc(db, 'teams', String(tm.id)), cleaned, { merge: true });
        if (Array.isArray(tm.players)) {
          for (const p of tm.players) {
            if (p && (p.id || p.name)) {
              const pId = p.id || generateId();
              await setDoc(doc(db, 'players', String(pId)), cleanData({ ...p, id: pId, team: String(tm.id) }), { merge: true });
            }
          }
        }
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

export const getTournaments = async (forceRemote = false) => {
  const cached = getCache('tournaments', []);
  if (!forceRemote && cached.length > 0) {
    // Return cached instantly and fetch fresh data in background
    setTimeout(async () => {
      try {
        const snap = await getDocs(collection(db, 'tournaments'));
        const remote = snap ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
        if (remote.length > 0) {
          remote.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
          setCache('tournaments', remote);
        }
      } catch (e) {}
    }, 10);
    return cached;
  }

  try {
    const snap = await getDocs(collection(db, 'tournaments'));
    const remote = snap ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    remote.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
    if (remote.length > 0) {
      setCache('tournaments', remote);
      return remote;
    }
    return cached;
  } catch (e) {
    console.warn('Firestore getTournaments read error:', e);
    return cached;
  }
};

export const subscribeTournaments = (callback) => {
  try {
    return onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const data = snapshot ? snapshot.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      data.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
      setCache('tournaments', data);
      callback(data);
    }, () => callback(getCache('tournaments', [])));
  } catch (e) {
    callback(getCache('tournaments', []));
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
    await setDoc(doc(db, 'tournaments', newId), cleanData({
      ...data,
      created_at: serverTimestamp()
    }));
  } catch (e) {
    console.error('Create tournament firestore error:', e);
    alert('⚠️ Firebase Cloud write warning: ' + e.message + '\n\nPlease ensure Firestore Rules are set to allow read/write in Firebase Console.');
  }

  return newTourn;
};

export const updateTournament = async (id, data) => {
  const cached = getCache('tournaments', []);
  const updated = cached.map(t => String(t.id) === String(id) ? { ...t, ...data } : t);
  setCache('tournaments', updated);

  try {
    await updateDoc(doc(db, 'tournaments', String(id)), cleanData(data));
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

export const getPlayers = async (teamId = null) => {
  try {
    const snap = await getDocs(collection(db, 'players'));
    let players = [];
    if (snap) {
      snap.docs.forEach(d => {
        const pdata = d.data();
        if (pdata.name && (pdata.team || pdata.team_id)) {
          players.push({ id: d.id, ...pdata, team: String(pdata.team || pdata.team_id) });
        } else {
          // Handle corrupted bulk doc format where items were saved as numeric keys
          Object.keys(pdata).forEach(key => {
            if (!isNaN(key) && pdata[key] && typeof pdata[key] === 'object' && pdata[key].name) {
              players.push({
                id: pdata[key].id || `${d.id}_${key}`,
                ...pdata[key],
                team: String(pdata[key].team || pdata[key].team_id || '')
              });
            }
          });
        }
      });
    }

    // Also extract embedded players from cached teams
    const cachedTeams = getCache('teams', []);
    cachedTeams.forEach(t => {
      if (Array.isArray(t.players)) {
        t.players.forEach(p => {
          if (p && p.name) {
            players.push({ ...p, id: p.id || generateId(), team: String(p.team || t.id) });
          }
        });
      }
    });

    const playerMap = new Map();
    players.forEach(p => {
      if (p && (p.id || p.name)) {
        playerMap.set(String(p.id || p.name), p);
      }
    });
    const uniquePlayers = Array.from(playerMap.values());
    return teamId ? uniquePlayers.filter(p => String(p.team) === String(teamId)) : uniquePlayers;
  } catch (e) {
    console.warn('Firestore getPlayers read error:', e);
    const cachedTeams = getCache('teams', []);
    const list = [];
    cachedTeams.forEach(t => {
      if (Array.isArray(t.players)) {
        t.players.forEach(p => list.push({ ...p, team: String(p.team || t.id) }));
      }
    });
    return teamId ? list.filter(p => String(p.team) === String(teamId)) : list;
  }
};

export const getTeams = async (tournamentId = null, forceRemote = false) => {
  const cached = getCache('teams', []);
  if (!forceRemote && cached.length > 0) {
    // Return cached immediately and refresh in background
    setTimeout(async () => {
      try {
        const [snapTeams, allPlayers] = await Promise.all([
          getDocs(collection(db, 'teams')),
          getPlayers(null, true)
        ]);

        let teams = snapTeams ? snapTeams.docs.map(d => {
          const data = d.data();
          const teamId = String(d.id);
          const teamPlayers = allPlayers.filter(p => String(p.team) === teamId);
          const embeddedPlayers = Array.isArray(data.players) ? data.players : [];

          const playerMap = new Map();
          embeddedPlayers.forEach(p => {
            if (p && (p.id || p.name)) {
              playerMap.set(String(p.id || p.name), { ...p, team: teamId });
            }
          });
          teamPlayers.forEach(p => {
            if (p && (p.id || p.name)) {
              playerMap.set(String(p.id || p.name), { ...p, team: teamId });
            }
          });

          return {
            id: d.id,
            ...data,
            players: Array.from(playerMap.values())
          };
        }) : [];

        if (teams.length > 0) {
          setCache('teams', teams);
        }
      } catch (e) {}
    }, 10);

    return tournamentId ? cached.filter(t => String(t.tournament) === String(tournamentId)) : cached;
  }

  try {
    const [snapTeams, allPlayers] = await Promise.all([
      getDocs(collection(db, 'teams')),
      getPlayers()
    ]);

    let teams = snapTeams ? snapTeams.docs.map(d => {
      const data = d.data();
      const teamId = String(d.id);
      const teamPlayers = allPlayers.filter(p => String(p.team) === teamId);
      const embeddedPlayers = Array.isArray(data.players) ? data.players : [];

      const playerMap = new Map();
      embeddedPlayers.forEach(p => {
        if (p && (p.id || p.name)) {
          playerMap.set(String(p.id || p.name), { ...p, team: teamId });
        }
      });
      teamPlayers.forEach(p => {
        if (p && (p.id || p.name)) {
          playerMap.set(String(p.id || p.name), { ...p, team: teamId });
        }
      });

      return {
        id: d.id,
        ...data,
        players: Array.from(playerMap.values())
      };
    }) : [];

    if (teams.length === 0 && cached.length > 0) {
      teams = cached;
    }

    setCache('teams', teams);
    return tournamentId ? teams.filter(t => String(t.tournament) === String(tournamentId)) : teams;
  } catch (e) {
    console.warn('Firestore getTeams read error:', e);
    return tournamentId ? cached.filter(t => String(t.tournament) === String(tournamentId)) : cached;
  }
};

export const subscribeTeams = (tournamentId, callback) => {
  try {
    return onSnapshot(collection(db, 'teams'), async (snapshot) => {
      const allPlayers = await getPlayers();
      const data = snapshot ? snapshot.docs.map(d => {
        const tdata = d.data();
        const teamId = String(d.id);
        const teamPlayers = allPlayers.filter(p => String(p.team) === teamId);
        const embeddedPlayers = Array.isArray(tdata.players) ? tdata.players : [];

        const playerMap = new Map();
        embeddedPlayers.forEach(p => {
          if (p && (p.id || p.name)) {
            playerMap.set(String(p.id || p.name), { ...p, team: teamId });
          }
        });
        teamPlayers.forEach(p => {
          if (p && (p.id || p.name)) {
            playerMap.set(String(p.id || p.name), { ...p, team: teamId });
          }
        });

        return {
          id: d.id,
          ...tdata,
          players: Array.from(playerMap.values())
        };
      }) : [];

      setCache('teams', data);
      const res = tournamentId ? data.filter(t => String(t.tournament) === String(tournamentId)) : data;
      callback(res);
    }, () => {
      const cached = getCache('teams', []);
      callback(tournamentId ? cached.filter(t => String(t.tournament) === String(tournamentId)) : cached);
    });
  } catch (e) {
    const cached = getCache('teams', []);
    callback(tournamentId ? cached.filter(t => String(t.tournament) === String(tournamentId)) : cached);
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
    await setDoc(doc(db, 'teams', newId), cleanData({
      ...data,
      players: [],
      created_at: serverTimestamp()
    }));
  } catch (e) {
    console.error('Create team firestore error:', e);
    alert('⚠️ Firebase Cloud write warning: ' + e.message + '\n\nPlease ensure Firestore Rules are set to allow read/write in Firebase Console.');
  }

  return newTeam;
};

export const updateTeam = async (id, data) => {
  const cached = getCache('teams', []);
  const updated = cached.map(t => String(t.id) === String(id) ? { ...t, ...data } : t);
  setCache('teams', updated);

  try {
    await updateDoc(doc(db, 'teams', String(id)), cleanData(data));
  } catch (e) {}
  return { id, ...data };
};

export const deleteTeam = async (teamId) => {
  const cached = getCache('teams', []);
  setCache('teams', cached.filter(t => String(t.id) !== String(teamId)));

  try {
    await deleteDoc(doc(db, 'teams', String(teamId)));
    // Also remove players belonging to this team from players collection
    const snapPlayers = await getDocs(collection(db, 'players'));
    if (snapPlayers) {
      for (const pDoc of snapPlayers.docs) {
        const pdata = pDoc.data();
        if (String(pdata.team || pdata.team_id) === String(teamId)) {
          await deleteDoc(doc(db, 'players', pDoc.id));
        }
      }
    }
  } catch (e) {
    console.warn('Delete team error:', e);
  }
  return true;
};

export const clearAllTeams = async (tournamentId = null) => {
  const cached = getCache('teams', []);
  const remaining = tournamentId ? cached.filter(t => String(t.tournament) !== String(tournamentId)) : [];
  setCache('teams', remaining);

  try {
    const [teamsSnap, playersSnap] = await Promise.all([
      getDocs(collection(db, 'teams')),
      getDocs(collection(db, 'players'))
    ]);

    const deletedTeamIds = new Set();
    if (teamsSnap) {
      for (const d of teamsSnap.docs) {
        const data = d.data();
        if (!tournamentId || String(data.tournament) === String(tournamentId)) {
          deletedTeamIds.add(String(d.id));
          await deleteDoc(doc(db, 'teams', d.id));
        }
      }
    }

    if (playersSnap) {
      for (const pDoc of playersSnap.docs) {
        const pdata = pDoc.data();
        const pTeam = String(pdata.team || pdata.team_id || '');
        if (!tournamentId || deletedTeamIds.has(pTeam)) {
          await deleteDoc(doc(db, 'players', pDoc.id));
        }
      }
    }
  } catch (e) {
    console.warn('Clear teams error:', e);
  }
  return true;
};

export const addPlayer = async (data) => {
  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return Array.isArray(data) ? [] : null;

  const addedPlayers = items.map(item => ({
    id: item.id || generateId(),
    name: item.name || '',
    jersey_number: item.jersey_number !== undefined && item.jersey_number !== '' ? Number(item.jersey_number) : null,
    position: item.position || '',
    team: String(item.team || item.team_id || ''),
    created_at: new Date().toISOString()
  }));

  // Update local memory cache immediately
  const cachedTeams = getCache('teams', []);
  const updatedTeams = cachedTeams.map(t => {
    const newForThisTeam = addedPlayers.filter(p => String(p.team) === String(t.id));
    if (newForThisTeam.length > 0) {
      const currentPlayers = Array.isArray(t.players) ? [...t.players] : [];
      newForThisTeam.forEach(np => {
        const existingIdx = currentPlayers.findIndex(cp => String(cp.id) === String(np.id));
        if (existingIdx >= 0) {
          currentPlayers[existingIdx] = np;
        } else {
          currentPlayers.push(np);
        }
      });
      return { ...t, players: currentPlayers };
    }
    return t;
  });
  setCache('teams', updatedTeams);

  // Sync to Firestore
  try {
    for (const player of addedPlayers) {
      await setDoc(doc(db, 'players', player.id), cleanData({
        ...player,
        created_at: serverTimestamp()
      }));
    }

    // Also update team doc players array so the team doc contains the full roster
    const teamIds = [...new Set(addedPlayers.map(p => p.team).filter(Boolean))];
    for (const teamId of teamIds) {
      const targetTeam = updatedTeams.find(t => String(t.id) === String(teamId));
      if (targetTeam) {
        await updateDoc(doc(db, 'teams', String(teamId)), {
          players: cleanData(targetTeam.players || [])
        });
      }
    }
  } catch (e) {
    console.error('Add player Firestore error:', e);
  }

  return Array.isArray(data) ? addedPlayers : addedPlayers[0];
};

export const updatePlayer = async (id, data) => {
  const cached = getCache('teams', []);
  let targetTeamId = null;
  const updated = cached.map(t => {
    const hasPlayer = (t.players || []).some(p => String(p.id) === String(id));
    if (hasPlayer) {
      targetTeamId = t.id;
      return {
        ...t,
        players: (t.players || []).map(p => String(p.id) === String(id) ? { ...p, ...data } : p)
      };
    }
    return t;
  });
  setCache('teams', updated);

  try {
    await updateDoc(doc(db, 'players', String(id)), cleanData(data));
    if (targetTeamId) {
      const teamObj = updated.find(t => String(t.id) === String(targetTeamId));
      if (teamObj) {
        await updateDoc(doc(db, 'teams', String(targetTeamId)), {
          players: cleanData(teamObj.players || [])
        });
      }
    }
  } catch (e) {
    console.error('Update player Firestore error:', e);
  }
  return { id, ...data };
};

export const deletePlayer = async (id) => {
  const cached = getCache('teams', []);
  let targetTeamId = null;
  const updated = cached.map(t => {
    const hasPlayer = (t.players || []).some(p => String(p.id) === String(id));
    if (hasPlayer) {
      targetTeamId = t.id;
      return {
        ...t,
        players: (t.players || []).filter(p => String(p.id) !== String(id))
      };
    }
    return t;
  });
  setCache('teams', updated);

  try {
    await deleteDoc(doc(db, 'players', String(id)));
    if (targetTeamId) {
      const teamObj = updated.find(t => String(t.id) === String(targetTeamId));
      if (teamObj) {
        await updateDoc(doc(db, 'teams', String(targetTeamId)), {
          players: cleanData(teamObj.players || [])
        });
      }
    }
  } catch (e) {
    console.error('Delete player Firestore error:', e);
  }
  return true;
};

// ==========================================
// 3. MATCHES
// ==========================================

export const ensureEventIds = (events) => {
  if (!Array.isArray(events)) return [];
  return events.map((e, idx) => ({
    ...e,
    id: e.id || `ev_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }));
};

export const getMatches = async (tournamentId = null, stage = null, forceRemote = false) => {
  const cached = getCache('matches', []);
  if (!forceRemote && cached.length > 0) {
    // Return cached immediately and refresh in background
    setTimeout(async () => {
      try {
        const matchesSnap = await getDocs(collection(db, 'matches'));
        const remote = matchesSnap ? matchesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
        const teams = getCache('teams', []);
        const teamMap = new Map();
        teams.forEach(t => teamMap.set(String(t.id), t));

        const enriched = remote.map(m => ({
          ...m,
          recent_events: ensureEventIds(m.recent_events),
          home_team_details: teamMap.get(String(m.home_team)) || m.home_team_details || { name: 'Home Team', players: [] },
          away_team_details: teamMap.get(String(m.away_team)) || m.away_team_details || { name: 'Away Team', players: [] },
        }));

        if (enriched.length > 0) {
          setCache('matches', enriched);
        }
      } catch (e) {}
    }, 10);

    let res = cached.map(m => ({ ...m, recent_events: ensureEventIds(m.recent_events) }));
    if (tournamentId) res = res.filter(m => String(m.tournament) === String(tournamentId));
    if (stage) res = res.filter(m => m.stage === stage);
    return res;
  }

  try {
    const matchesSnap = await getDocs(collection(db, 'matches'));
    const remote = matchesSnap ? matchesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    
    const teams = getCache('teams', []);
    const teamMap = new Map();
    teams.forEach(t => teamMap.set(String(t.id), t));

    const enriched = remote.map(m => ({
      ...m,
      recent_events: ensureEventIds(m.recent_events),
      home_team_details: teamMap.get(String(m.home_team)) || m.home_team_details || { name: 'Home Team', players: [] },
      away_team_details: teamMap.get(String(m.away_team)) || m.away_team_details || { name: 'Away Team', players: [] },
    }));

    if (enriched.length === 0 && cached.length > 0) {
      setCache('matches', cached);
    } else {
      setCache('matches', enriched);
    }

    let matches = enriched.length > 0 ? enriched : cached;
    matches = matches.map(m => ({ ...m, recent_events: ensureEventIds(m.recent_events) }));
    if (tournamentId) matches = matches.filter(m => String(m.tournament) === String(tournamentId));
    if (stage) matches = matches.filter(m => m.stage === stage);
    return matches;
  } catch (e) {
    console.warn('Firestore getMatches read error:', e);
    let matches = cached.map(m => ({ ...m, recent_events: ensureEventIds(m.recent_events) }));
    if (tournamentId) matches = matches.filter(m => String(m.tournament) === String(tournamentId));
    if (stage) matches = matches.filter(m => m.stage === stage);
    return matches;
  }
};

export const subscribeMatches = (tournamentId, callback) => {
  try {
    return onSnapshot(collection(db, 'matches'), (snapshot) => {
      const data = snapshot ? snapshot.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      const teams = getCache('teams', []);
      const teamMap = new Map();
      teams.forEach(t => teamMap.set(String(t.id), t));

      const enriched = data.map(m => ({
        ...m,
        recent_events: ensureEventIds(m.recent_events),
        home_team_details: teamMap.get(String(m.home_team)) || m.home_team_details || { name: 'Home Team', players: [] },
        away_team_details: teamMap.get(String(m.away_team)) || m.away_team_details || { name: 'Away Team', players: [] },
      }));

      setCache('matches', enriched);
      const res = tournamentId ? enriched.filter(m => String(m.tournament) === String(tournamentId)) : enriched;
      callback(res);
    }, () => {
      let cached = getCache('matches', []);
      if (tournamentId) cached = cached.filter(m => String(m.tournament) === String(tournamentId));
      callback(cached.map(m => ({ ...m, recent_events: ensureEventIds(m.recent_events) })));
    });
  } catch (e) {
    let cached = getCache('matches', []);
    if (tournamentId) cached = cached.filter(m => String(m.tournament) === String(tournamentId));
    callback(cached.map(m => ({ ...m, recent_events: ensureEventIds(m.recent_events) })));
    return () => {};
  }
};

export const getMatch = async (id) => {
  try {
    const docRef = doc(db, 'matches', String(id));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const matchData = { id: snap.id, ...snap.data() };
      const teams = getCache('teams', []);
      const teamMap = new Map();
      teams.forEach(t => teamMap.set(String(t.id), t));
      return {
        ...matchData,
        recent_events: ensureEventIds(matchData.recent_events),
        home_team_details: teamMap.get(String(matchData.home_team)) || matchData.home_team_details || { name: 'Home Team', players: [] },
        away_team_details: teamMap.get(String(matchData.away_team)) || matchData.away_team_details || { name: 'Away Team', players: [] },
      };
    }
  } catch (e) {}

  const cached = getCache('matches', []);
  const item = cached.find(m => String(m.id) === String(id));
  return item ? { ...item, recent_events: ensureEventIds(item.recent_events) } : null;
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
      } else {
        const allCached = getCache('matches', []);
        const fallback = allCached.find(m => m.status === 'LIVE') || allCached[0] || null;
        callback(fallback);
      }
    }, (err) => {
      console.warn('subscribeMatch snapshot warning:', err);
      callback(item || null);
    });
  } catch (e) {
    callback(item || null);
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
  const current = cached.find(m => String(m.id) === String(id)) || {};
  const merged = { ...current, ...data, id };
  const updated = cached.map(m => String(m.id) === String(id) ? merged : m);
  if (!cached.some(m => String(m.id) === String(id))) {
    updated.push(merged);
  }
  setCache('matches', updated);

  // Background non-blocking cloud update for zero-latency UI
  try {
    updateDoc(doc(db, 'matches', String(id)), cleanData(data)).catch(() => {});
  } catch (e) {}

  return merged;
};

export const deleteMatch = async (id) => {
  const cached = getCache('matches', []);
  setCache('matches', cached.filter(m => String(m.id) !== String(id)));

  try {
    await deleteDoc(doc(db, 'matches', String(id)));
  } catch (e) {}
  return true;
};

export const clearAllMatches = async (tournamentId = null) => {
  const cached = getCache('matches', []);
  const remaining = tournamentId ? cached.filter(m => String(m.tournament) !== String(tournamentId)) : [];
  setCache('matches', remaining);

  try {
    const snap = await getDocs(collection(db, 'matches'));
    for (const d of snap.docs) {
      const data = d.data();
      if (!tournamentId || String(data.tournament) === String(tournamentId)) {
        await deleteDoc(doc(db, 'matches', d.id));
      }
    }
  } catch (e) {
    console.warn('Clear matches error:', e);
  }
  return true;
};

export const updateMatchScore = async (matchId, teamId, delta) => {
  const match = await getMatch(matchId);
  if (!match) return null;

  const isHome = String(match.home_team) === String(teamId);
  const homeScore = isHome ? Math.max(0, (match.home_score || 0) + delta) : (match.home_score || 0);
  const awayScore = !isHome ? Math.max(0, (match.away_score || 0) + delta) : (match.away_score || 0);

  const updated = await updateMatch(matchId, {
    home_score: homeScore,
    away_score: awayScore,
    status: match.status === 'SCHEDULED' ? 'LIVE' : match.status
  });
  return updated;
};

export const calculateMatchElapsed = (match) => {
  if (!match) return 0;
  const base = match.timer_base_seconds !== undefined ? match.timer_base_seconds : (match.timer_seconds_elapsed || 0);
  if (!match.is_timer_running || !match.timer_started_at) {
    return base;
  }
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - match.timer_started_at) / 1000));
  return base + diffSec;
};

export const advanceKnockoutWinner = async (match) => {
  if (!match || match.stage === 'REGULAR' || !match.bracket_code) return;

  let winner = null;
  if ((match.home_score || 0) > (match.away_score || 0)) {
    winner = match.home_team;
  } else if ((match.away_score || 0) > (match.home_score || 0)) {
    winner = match.away_team;
  }
  if (!winner) return;

  let nextCode = null;
  let isHome = true;

  if (match.bracket_code === 'QF1') { nextCode = 'SF1'; isHome = true; }
  else if (match.bracket_code === 'QF2') { nextCode = 'SF1'; isHome = false; }
  else if (match.bracket_code === 'QF3') { nextCode = 'SF2'; isHome = true; }
  else if (match.bracket_code === 'QF4') { nextCode = 'SF2'; isHome = false; }
  else if (match.bracket_code === 'SF1') { nextCode = 'F'; isHome = true; }
  else if (match.bracket_code === 'SF2') { nextCode = 'F'; isHome = false; }

  if (!nextCode) return;

  const matches = await getMatches(match.tournament);
  const nextMatch = matches.find(m => m.bracket_code === nextCode);
  if (nextMatch) {
    const teams = await getTeams(match.tournament);
    const winnerTeamObj = teams.find(t => String(t.id) === String(winner)) || { id: winner, name: 'Team' };

    const updatePayload = isHome ? {
      home_team: winner,
      home_team_details: winnerTeamObj
    } : {
      away_team: winner,
      away_team_details: winnerTeamObj
    };

    await updateMatch(nextMatch.id, updatePayload);
  }
};

export const toggleMatchTimer = async (matchId, action) => {
  const match = await getMatch(matchId);
  if (!match) return null;

  let updates = {};
  if (action === 'START') {
    const currentBase = match.timer_base_seconds !== undefined ? match.timer_base_seconds : (match.timer_seconds_elapsed || 0);
    updates = {
      is_timer_running: true,
      timer_base_seconds: currentBase,
      timer_started_at: Date.now(),
      status: 'LIVE',
      current_period: match.current_period === 'NOT_STARTED' || !match.current_period ? '1ST_HALF' : match.current_period
    };
  } else if (action === 'PAUSE') {
    const currentTotal = calculateMatchElapsed(match);
    updates = {
      is_timer_running: false,
      timer_base_seconds: currentTotal,
      timer_seconds_elapsed: currentTotal,
      timer_started_at: null,
      status: match.status === 'ENDED' ? 'ENDED' : 'PAUSED'
    };
  } else if (action === 'FINISH' || action === 'END') {
    const currentTotal = calculateMatchElapsed(match);
    updates = {
      is_timer_running: false,
      timer_base_seconds: currentTotal,
      timer_seconds_elapsed: currentTotal,
      timer_started_at: null,
      status: 'ENDED'
    };
  } else if (action === 'RESET') {
    updates = {
      is_timer_running: false,
      timer_seconds_elapsed: 0,
      timer_base_seconds: 0,
      timer_started_at: null,
      computed_elapsed_seconds: 0,
      home_score: 0,
      away_score: 0,
      status: 'SCHEDULED',
      recent_events: []
    };
  }

  const updated = await updateMatch(matchId, updates);
  if (action === 'FINISH' || action === 'END') {
    await advanceKnockoutWinner({ ...match, ...updates });
  }
  return updated;
};

export const resetMatch = async (matchId) => {
  const match = await getMatch(matchId);
  if (!match) return null;

  const resetData = {
    home_score: 0,
    away_score: 0,
    status: 'SCHEDULED',
    current_period: 'NOT_STARTED',
    is_timer_running: false,
    timer_seconds_elapsed: 0,
    timer_base_seconds: 0,
    timer_started_at: null,
    computed_elapsed_seconds: 0,
    is_live_streaming: false,
    stream_url: '',
    recent_events: []
  };

  const updated = await updateMatch(matchId, resetData);

  try {
    await updateDoc(doc(db, 'live_streams', String(matchId)), {
      is_active: false,
      ended_at: serverTimestamp()
    });
  } catch (e) {}

  return updated;
};

export const resetAllMatches = async (tournamentId = null) => {
  const cached = getCache('matches', []);
  const updated = cached.map(m => {
    if (!tournamentId || String(m.tournament) === String(tournamentId)) {
      return {
        ...m,
        home_score: 0,
        away_score: 0,
        status: 'SCHEDULED',
        current_period: 'NOT_STARTED',
        is_timer_running: false,
        timer_seconds_elapsed: 0,
        timer_base_seconds: 0,
        timer_started_at: null,
        computed_elapsed_seconds: 0,
        is_live_streaming: false,
        stream_url: '',
        recent_events: []
      };
    }
    return m;
  });
  setCache('matches', updated);

  try {
    const snap = await getDocs(collection(db, 'matches'));
    for (const d of snap.docs) {
      const data = d.data();
      if (!tournamentId || String(data.tournament) === String(tournamentId)) {
        await updateDoc(doc(db, 'matches', d.id), {
          home_score: 0,
          away_score: 0,
          status: 'SCHEDULED',
          current_period: 'NOT_STARTED',
          is_timer_running: false,
          timer_seconds_elapsed: 0,
          timer_base_seconds: 0,
          timer_started_at: null,
          computed_elapsed_seconds: 0,
          is_live_streaming: false,
          stream_url: '',
          recent_events: []
        });
      }
    }
  } catch (e) {
    console.warn('resetAllMatches firestore error:', e);
  }

  return true;
};

export const recordMatchEvent = async (matchId, eventData) => {
  const match = await getMatch(matchId);
  if (!match) return null;

  const allPlayers = await getPlayers();
  const teams = getCache('teams', []);

  const teamId = String(eventData.team_id || eventData.team || '');
  const playerId = eventData.player_id || eventData.player || null;

  const playerObj = allPlayers.find(p => String(p.id) === String(playerId));
  const teamObj = teams.find(t => String(t.id) === String(teamId));

  const teamName = eventData.team_name || (teamObj ? teamObj.name : (String(match.home_team) === teamId ? match.home_team_details?.name : match.away_team_details?.name)) || 'Team';
  const playerName = eventData.player_name || (playerObj ? playerObj.name : 'Player');

  const matchElapsed = calculateMatchElapsed(match);
  const matchMin = Math.max(1, Math.floor(matchElapsed / 60) + 1);
  const matchSec = matchElapsed % 60;

  const newEvent = {
    id: generateId(),
    match: String(matchId),
    event_type: eventData.event_type || 'GOAL',
    team: teamId,
    player: playerId,
    player_name: playerName,
    team_name: teamName,
    match_minute: eventData.match_minute !== undefined ? Number(eventData.match_minute) : matchMin,
    match_second: eventData.match_second !== undefined ? Number(eventData.match_second) : matchSec,
    created_at: new Date().toISOString()
  };

  const existingEvents = Array.isArray(match.recent_events) ? match.recent_events : [];
  const updatedEvents = [newEvent, ...existingEvents];

  let scoreUpdates = {};
  if (newEvent.event_type === 'GOAL') {
    const isHome = String(match.home_team) === teamId;
    scoreUpdates = {
      home_score: isHome ? (match.home_score || 0) + 1 : (match.home_score || 0),
      away_score: !isHome ? (match.away_score || 0) + 1 : (match.away_score || 0)
    };
  }

  const updated = await updateMatch(matchId, {
    recent_events: updatedEvents,
    ...scoreUpdates
  });
  return updated;
};

export const updateMatchEvent = async (eventId, updateData) => {
  const matches = getCache('matches', []);
  let targetMatch = null;
  let eventIdx = -1;

  for (const m of matches) {
    if (Array.isArray(m.recent_events)) {
      const idx = m.recent_events.findIndex(e => String(e.id) === String(eventId));
      if (idx >= 0) {
        targetMatch = m;
        eventIdx = idx;
        break;
      }
    }
  }

  if (!targetMatch) {
    const snap = await getDocs(collection(db, 'matches'));
    if (snap) {
      for (const d of snap.docs) {
        const m = { id: d.id, ...d.data() };
        if (Array.isArray(m.recent_events)) {
          const idx = m.recent_events.findIndex(e => String(e.id) === String(eventId));
          if (idx >= 0) {
            targetMatch = m;
            eventIdx = idx;
            break;
          }
        }
      }
    }
  }

  if (!targetMatch || eventIdx === -1) {
    console.warn(`Event ${eventId} not found in any match`);
    return null;
  }

  const existingEvent = targetMatch.recent_events[eventIdx];
  const teams = getCache('teams', []);
  const allPlayers = await getPlayers();

  const teamId = updateData.team !== undefined ? String(updateData.team || '') : (updateData.team_id !== undefined ? String(updateData.team_id || '') : existingEvent.team);
  const playerId = updateData.player !== undefined ? (updateData.player || null) : (updateData.player_id !== undefined ? (updateData.player_id || null) : existingEvent.player);

  const teamObj = teams.find(t => String(t.id) === String(teamId));
  const playerObj = allPlayers.find(p => String(p.id) === String(playerId));

  const teamName = teamObj ? teamObj.name : (String(targetMatch.home_team) === teamId ? targetMatch.home_team_details?.name : targetMatch.away_team_details?.name) || existingEvent.team_name || 'Team';
  const playerName = playerObj ? playerObj.name : (updateData.player_name || existingEvent.player_name || 'Player');

  const updatedEvent = {
    ...existingEvent,
    ...updateData,
    id: eventId,
    team: teamId,
    player: playerId,
    team_name: teamName,
    player_name: playerName,
    event_type: updateData.event_type || existingEvent.event_type || 'GOAL',
    match_minute: updateData.match_minute !== undefined ? Number(updateData.match_minute) : existingEvent.match_minute,
    match_second: updateData.match_second !== undefined ? Number(updateData.match_second) : (existingEvent.match_second || 0),
    updated_at: new Date().toISOString()
  };

  const updatedEvents = [...targetMatch.recent_events];
  updatedEvents[eventIdx] = updatedEvent;

  // Recalculate score from all GOAL events
  const homeGoals = updatedEvents.filter(e => e.event_type === 'GOAL' && String(e.team) === String(targetMatch.home_team)).length;
  const awayGoals = updatedEvents.filter(e => e.event_type === 'GOAL' && String(e.team) === String(targetMatch.away_team)).length;

  const matchUpdates = {
    recent_events: updatedEvents,
    home_score: homeGoals,
    away_score: awayGoals
  };

  await updateMatch(targetMatch.id, matchUpdates);
  return updatedEvent;
};

export const deleteMatchEvent = async (eventId) => {
  const matches = getCache('matches', []);
  let targetMatch = null;

  for (const m of matches) {
    if (Array.isArray(m.recent_events)) {
      const idx = m.recent_events.findIndex(e => String(e.id) === String(eventId));
      if (idx >= 0) {
        targetMatch = m;
        break;
      }
    }
  }

  if (!targetMatch) {
    const snap = await getDocs(collection(db, 'matches'));
    if (snap) {
      for (const d of snap.docs) {
        const m = { id: d.id, ...d.data() };
        if (Array.isArray(m.recent_events)) {
          const idx = m.recent_events.findIndex(e => String(e.id) === String(eventId));
          if (idx >= 0) {
            targetMatch = m;
            break;
          }
        }
      }
    }
  }

  if (!targetMatch) {
    console.warn(`Event ${eventId} not found in any match`);
    return false;
  }

  const updatedEvents = (targetMatch.recent_events || []).filter(e => String(e.id) !== String(eventId));

  // Recalculate score from all remaining GOAL events
  const homeGoals = updatedEvents.filter(e => e.event_type === 'GOAL' && String(e.team) === String(targetMatch.home_team)).length;
  const awayGoals = updatedEvents.filter(e => e.event_type === 'GOAL' && String(e.team) === String(targetMatch.away_team)).length;

  const matchUpdates = {
    recent_events: updatedEvents,
    home_score: homeGoals,
    away_score: awayGoals
  };

  await updateMatch(targetMatch.id, matchUpdates);
  return true;
};

export const finishMatch = async (matchId) => {
  const match = await getMatch(matchId);
  const totalElapsed = match ? calculateMatchElapsed(match) : 0;
  const updated = await updateMatch(matchId, {
    status: 'ENDED',
    is_timer_running: false,
    timer_started_at: null,
    timer_base_seconds: totalElapsed,
    timer_seconds_elapsed: totalElapsed
  });
  if (match) {
    await advanceKnockoutWinner({ ...match, status: 'ENDED' });
  }
  return updated;
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
