import React, { createContext, useState, useEffect, useContext } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

const initialSettings = {
  modules: {
    paymentMethods: {
      enabled: false,
    },
  },
  pdf: {
    showUniqueItems: false,
    showTotalQuantity: false,
    showPaymentMethod: false,
    addSummaryPage: false,
  },
  paymentMethodStyles: {},
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        let loadedSettings = {};
        if (window.electronAPI) {
          loadedSettings = await window.electronAPI.getSettings();
        } else {
          const localSettings = localStorage.getItem('app-settings');
          if (localSettings) {
            loadedSettings = JSON.parse(localSettings);
          }
        }
        // Deep merge to ensure new settings are not lost
        setSettings(prev => ({
          modules: { ...prev.modules, ...loadedSettings.modules },
          pdf: { ...prev.pdf, ...loadedSettings.pdf },
          paymentMethodStyles: { ...prev.paymentMethodStyles, ...loadedSettings.paymentMethodStyles },
        }));
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings(updatedSettings);
      } else {
        localStorage.setItem('app-settings', JSON.stringify(updatedSettings));
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const value = {
    settings,
    loading,
    updateSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {!loading && children}
    </SettingsContext.Provider>
  );
};
