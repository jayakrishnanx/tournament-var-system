import api from './api';

export const connectMatchWebSocket = (matchId, onMessage, onError) => {
  let isClosed = false;

  const fetchUpdate = async () => {
    if (isClosed) return;
    try {
      const res = await api.get(`/tournaments/matches/${matchId}/`);
      if (res.data && !isClosed) {
        onMessage({
          type: 'match_update',
          match: res.data
        });
      }
    } catch (err) {
      if (onError && !isClosed) onError(err);
    }
  };

  // Immediate fetch then recurring poll
  fetchUpdate();
  const interval = setInterval(fetchUpdate, 2500);

  return {
    close: () => {
      isClosed = true;
      clearInterval(interval);
    }
  };
};
