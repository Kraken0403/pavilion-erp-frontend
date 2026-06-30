import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getDefaultModulePermissions,
  normalizeModulePermissions,
} from '../config/modulePermissions';
import { getUserVisibilityPermissions } from '../services/userServices';
import { connectSocket, authenticateSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modulePermissions, setModulePermissions] = useState(getDefaultModulePermissions());

  const loadUserPermissions = async (userId) => {
    if (!userId) {
      setModulePermissions(getDefaultModulePermissions());
      return;
    }

    try {
      const data = await getUserVisibilityPermissions(userId);
      const normalized = normalizeModulePermissions(data?.permissions);
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (storedUser?.role !== 'admin') {
        normalized.users = false;
      }
      setModulePermissions(normalized);
    } catch (error) {
      const defaults = getDefaultModulePermissions();
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (storedUser?.role !== 'admin') {
        defaults.users = false;
      }
      setModulePermissions(defaults);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);
      loadUserPermissions(parsedUser.id);
    } else {
      setCurrentUser(null);
      setModulePermissions(getDefaultModulePermissions());
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    setCurrentUser(user);
    loadUserPermissions(user?.id);

    window.dispatchEvent(new CustomEvent('auth:login', { detail: { token } }));

    try {
      connectSocket();
      if (token) authenticateSocket(token);
    } catch (e) {
      console.warn('Socket auth during login failed', e && e.message ? e.message : e);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setModulePermissions(getDefaultModulePermissions());

    window.dispatchEvent(new CustomEvent('auth:logout-with-settings'));

    try { disconnectSocket(); } catch (e) { }
  };

  const canAccessModule = (moduleKey) => {
    const normalized = normalizeModulePermissions(modulePermissions);
    if (!moduleKey) return true;
    if (moduleKey === 'users' && currentUser?.role !== 'admin') return false;
    return normalized[moduleKey] !== false;
  };

  const updateCurrentUser = (nextUser) => {
    if (!nextUser) return;
    const merged = { ...(currentUser || {}), ...nextUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setCurrentUser(merged);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        loading,
        modulePermissions,
        setModulePermissions,
        loadUserPermissions,
        canAccessModule,
        updateCurrentUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
