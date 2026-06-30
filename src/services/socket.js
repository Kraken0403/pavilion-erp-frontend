import { io } from 'socket.io-client';

let socket = null;

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const normalizeSocketOrigin = (value) => {
  const cleaned = trimTrailingSlash(value);

  if (!cleaned) return 'http://localhost:5000';

  try {
    const url = new URL(cleaned);
    return url.origin;
  } catch (error) {
    const apiIndex = cleaned.toLowerCase().indexOf('/api');
    return apiIndex >= 0 ? cleaned.slice(0, apiIndex) : cleaned;
  }
};

const getSocketBackendUrl = (opts = {}) => {
  return normalizeSocketOrigin(
    opts.url ||
    process.env.REACT_APP_WS_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    'http://localhost:5000'
  );
};

export const connectSocket = (opts = {}) => {
  if (socket) return socket;

  const backend = getSocketBackendUrl(opts);
  const token = opts.token || localStorage.getItem('token') || null;

  const options = {
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  };

  if (token) {
    options.auth = { token };
  }

  socket = io(backend, options);

  socket.on('connect_error', (err) => {
    console.warn('Socket connect_error', err?.message || err);
  });

  socket.on('connect', () => {
    console.debug('Socket connected', { id: socket.id, backend });
  });

  socket.on('authenticated', (data) => {
    console.debug('Socket authenticated', data);
  });

  socket.on('unauthorized', (data) => {
    // Socket auth failure should not hard-logout the app. REST auth decides login state.
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
  if (!socket || !token) return;
  socket.emit('authenticate', token);
};

const socketService = {
  connectSocket,
  disconnectSocket,
  authenticateSocket,
};

export default socketService;
