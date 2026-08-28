export const connectMatchWebSocket = (matchId, onMessage, onError) => {
  const getWsUrl = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host.includes('vercel.app') || host.includes('onrender.com')) {
        return `wss://tournament-var-system.onrender.com/ws/match/${matchId}/`;
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${host}:8000/ws/match/${matchId}/`;
    }
    return `ws://localhost:8000/ws/match/${matchId}/`;
  };

  const wsUrl = getWsUrl();
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log(`Connected to WebSocket match channel: ${matchId}`);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
    if (onError) onError(error);
  };

  ws.onclose = () => {
    console.log(`Disconnected from WebSocket match channel: ${matchId}`);
  };

  return ws;
};
