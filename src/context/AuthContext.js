import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getDefaultModulePermissions,
  normalizeModulePermissions,
} from '../config/modulePermissions';
import { getUserVisibilityPermissions } from '../services/userServices';

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
      setModulePermissions(normalizeModulePermissions(data?.permissions));
    } catch (error) {
      setModulePermissions(getDefaultModulePermissions());
    }
  };

  // Load auth state on app boot
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

  // 🔥 Listen for forced logout from Axios interceptor
  useEffect(() => {
    const handleLogout = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    setCurrentUser(user);
    loadUserPermissions(user?.id);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setModulePermissions(getDefaultModulePermissions());
  };

  const canAccessModule = (moduleKey) => {
    const normalized = normalizeModulePermissions(modulePermissions);
    if (!moduleKey) return true;
    return normalized[moduleKey] !== false;
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
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
