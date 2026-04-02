import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (opts = {}) => {
  if (socket) return socket;
  // Normalize backend URL: prefer explicit opt, then WS override, then API base.
  // Strip any API path segments so the client connects to the server origin
  // where the Socket.IO server is mounted (invalid namespaces often come
  // from connecting to a path like '/api').
  let backend = opts.url || process.env.REACT_APP_WS_URL || process.env.REACT_APP_API_BASE_URL || '';
  if (!backend && typeof window !== 'undefined') backend = window.location.origin;
  try {
    // If the URL includes an '/api' path (or other path), remove it and use origin
    const tmp = new URL(backend);
    const apiIndex = tmp.pathname.toLowerCase().indexOf('/api');
    if (apiIndex >= 0) {
      backend = tmp.origin;
    } else if (tmp.pathname && tmp.pathname !== '/') {
      // If any path exists, prefer the origin to avoid namespace mismatches
      backend = tmp.origin;
    } else {
      backend = tmp.origin;
    }
  } catch (e) {
    // If not a full URL, try to strip common prefixes
    const idx = String(backend || '').indexOf('/api');
    if (idx >= 0) backend = backend.slice(0, idx);
  }

  console.debug('Socket connecting to backend origin:', backend);
  const token = opts.token || localStorage.getItem('token') || null;

  const options = {
    transports: ['websocket'],
    withCredentials: true,
  };

  if (token) {
    options.auth = { token };
  }

  socket = io(backend, options);

  socket.on('connect_error', (err) => {
    console.warn('Socket connect_error', err && err.message ? err.message : err);
  });

  socket.on('connect', () => {
    console.debug('Socket connected', { id: socket.id, backend });
  });

  socket.on('authenticated', (data) => {
    console.debug('Socket authenticated', data);
  });

  socket.on('unauthorized', (data) => {
    console.warn('Socket unauthorized', data);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) return;
  try {
    socket.disconnect();
  } catch (e) {
    // ignore
  }
  socket = null;
};

export const authenticateSocket = (token) => {
  if (!socket) return;
  socket.emit('authenticate', token);
};

const socketService = {
  connectSocket,
  disconnectSocket,
  authenticateSocket,
};

export default socketService;
