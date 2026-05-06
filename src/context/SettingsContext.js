import { createContext, useContext, useEffect, useState } from "react";
import { getSettings } from "../services/settingsService";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error("❌ Failed to load global settings:", err);
      setSettings(null);
    }
    setLoading(false);
  };

  // ✅ FIX: Listen for login/logout events from AuthContext
  // This ensures settings are loaded only when user is authenticated
  useEffect(() => {
    const handleLogin = (e) => {
      console.debug('[SETTINGS] Login detected, loading settings...');
      setLoading(true);
      loadSettings();
    };

    const handleLogout = () => {
      console.debug('[SETTINGS] Logout detected, clearing settings...');
      setSettings(null);
      setLoading(false);
    };

    window.addEventListener('auth:login', handleLogin);
    window.addEventListener('auth:logout-with-settings', handleLogout);

    return () => {
      window.removeEventListener('auth:login', handleLogin);
      window.removeEventListener('auth:logout-with-settings', handleLogout);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, reloadSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
