import { subscribeMatch } from './firebaseService';

export const connectMatchWebSocket = (matchId, onMessage, onError) => {
  try {
    const unsubscribe = subscribeMatch(matchId, (matchData) => {
      if (matchData) {
        onMessage({
          type: 'match_update',
          match: matchData
        });
      }
    });

    return {
      close: () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      }
    };
  } catch (err) {
    if (onError) onError(err);
    return { close: () => {} };
  }
};
