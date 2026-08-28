export const getStreamHost = () => {
  if (typeof window === 'undefined') return 'localhost';
  
  const savedHost = localStorage.getItem('stream_server_host');
  if (savedHost && savedHost.trim()) {
    return savedHost.trim();
  }

  const hostname = window.location.hostname;
  // If hosted on Vercel or Render, default to 'localhost' or 'jayakrishnan.local'
  if (hostname.includes('vercel.app') || hostname.includes('onrender.com')) {
    return 'localhost';
  }
  return hostname || 'localhost';
};

export const setStreamHost = (host) => {
  if (!host || host.trim() === '') {
    localStorage.removeItem('stream_server_host');
  } else {
    localStorage.setItem('stream_server_host', host.trim());
  }
  window.dispatchEvent(new Event('stream_host_changed'));
};
