import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Settings } from '../types';

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const initialSettings: Settings = {
  theme: 'system',
  modules: {
    paymentMethods: {
      enabled: false,
    },
    debt: {
      enabled: false,
    },
    capitalizationProtection: {
      enabled: true,
    },
  },
  pdf: {
    showUniqueItems: false,
    showTotalQuantity: false,
    showPaymentMethod: false,
    addSummaryPage: false,
    addReceiptImages: false,
  },
  backup: {
    maxBackups: 5,
    interval: 5,
    editsSinceLastBackup: 0,
  },
  paymentMethodStyles: {},
  datastore: {
    folderPath: '',
  },
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        let loadedSettings: Partial<Settings> = {};
        if (window.electronAPI) {
          loadedSettings = await window.electronAPI.getSettings();
        } else {
          const localSettings = localStorage.getItem('app-settings');
          if (localSettings) {
            loadedSettings = JSON.parse(localSettings);
          }
        }
        
        // Apply theme immediately
        const theme = loadedSettings.theme || initialSettings.theme;
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // Handle 'system' theme
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }

        // Deep merge to ensure new settings are not lost
        setSettings(prev => ({
          ...prev,
          ...loadedSettings,
          modules: { ...prev.modules, ...loadedSettings.modules },
          pdf: { ...prev.pdf, ...loadedSettings.pdf },
          backup: { ...prev.backup, ...loadedSettings.backup },
          paymentMethodStyles: { ...prev.paymentMethodStyles, ...loadedSettings.paymentMethodStyles },
          datastore: { ...prev.datastore, ...loadedSettings.datastore },
        }));
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();

    const handleSettingsReverted = (event: any, revertedSettings: Settings) => {
      setSettings(revertedSettings);
    };

    if (window.electronAPI) {
      window.electronAPI.onSettingsReverted(handleSettingsReverted);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeSettingsRevertedListener(handleSettingsReverted);
      }
    };
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveSettings(updatedSettings);
        if (!result.success) {
          // The main process will send a 'settings-reverted' event
          console.error('Failed to save settings, waiting for revert.');
        }
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
