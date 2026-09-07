import { createContext, useContext, useEffect, useState } from "react";
import { getPublicSettings } from "../services/settingsService";
import { setDateFormat } from "../utils/dateFormatter";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const data = await getPublicSettings();
      setSettings(data);
      setDateFormat(data?.date_format);
      document.documentElement.lang = data?.date_format === 'MM/DD/YYYY' ? 'en-US' : data?.date_format === 'YYYY-MM-DD' ? 'sv-SE' : 'en-GB';
    } catch (err) {
      console.error("❌ Failed to load global settings:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const locale = settings?.date_format === 'MM/DD/YYYY' ? 'en-US' : settings?.date_format === 'YYYY-MM-DD' ? 'sv-SE' : 'en-GB';
    const applyLocale = (root = document) => root.querySelectorAll?.('input[type="date"], input[type="datetime-local"]').forEach((input) => input.setAttribute('lang', locale));
    applyLocale();
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches?.('input[type="date"], input[type="datetime-local"]')) node.setAttribute('lang', locale);
      applyLocale(node);
    })));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [settings?.date_format]);

  return (
    <SettingsContext.Provider value={{ settings, loading, reloadSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
