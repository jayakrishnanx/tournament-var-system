export const connectMatchWebSocket = (matchId, onMessage, onError) => {
  const wsUrl = `ws://localhost:8000/ws/match/${matchId}/`;
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
