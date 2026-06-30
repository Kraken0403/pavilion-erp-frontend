import { createContext, useContext, useEffect, useState } from "react";
import { getPublicSettings } from "../services/settingsService";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const data = await getPublicSettings();
      setSettings(data);
    } catch (err) {
      console.error("❌ Failed to load global settings:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, reloadSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
