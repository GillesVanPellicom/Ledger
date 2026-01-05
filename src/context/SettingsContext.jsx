import React, { createContext, useState, useEffect, useContext } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    paymentMethods: {
      enabled: false,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        if (window.electronAPI) {
          const savedSettings = await window.electronAPI.getSettings();
          if (savedSettings.modules) {
            setSettings(prev => ({ ...prev, ...savedSettings.modules }));
          }
        } else {
          const localSettings = localStorage.getItem('modules');
          if (localSettings) {
            setSettings(prev => ({ ...prev, ...JSON.parse(localSettings) }));
          }
        }
      } catch (error) {
        console.error("Failed to load module settings:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const updateModuleSettings = async (module, newSettings) => {
    const newModuleState = { ...settings, [module]: newSettings };
    setSettings(newModuleState);
    
    try {
      if (window.electronAPI) {
        const currentSettings = await window.electronAPI.getSettings();
        await window.electronAPI.saveSettings({ ...currentSettings, modules: newModuleState });
      } else {
        localStorage.setItem('modules', JSON.stringify(newModuleState));
      }
    } catch (error) {
      console.error("Failed to save module settings:", error);
    }
  };

  const value = {
    settings,
    loading,
    updateModuleSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {!loading && children}
    </SettingsContext.Provider>
  );
};
