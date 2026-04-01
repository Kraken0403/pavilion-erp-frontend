import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (opts = {}) => {
  if (socket) return socket;

  const backend = opts.url || process.env.REACT_APP_WS_URL || process.env.REACT_APP_API_BASE_URL || '';
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

export default {
  connectSocket,
  disconnectSocket,
  authenticateSocket,
};
