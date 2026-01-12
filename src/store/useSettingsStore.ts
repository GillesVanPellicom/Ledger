import {create} from 'zustand';
import {devtools} from 'zustand/middleware';
import {Settings} from '../types';

interface SettingsState {
  settings: Settings;
  loading: boolean;
  setSettings: (settings: Settings) => void;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loadSettings: () => Promise<void>;
}

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

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      settings: initialSettings,
      loading: true,

      setSettings: (settings) => set({settings}, false, 'setSettings'),

      loadSettings: async () => {
        set({loading: true}, false, 'loadSettings/start');
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
          set((state) => ({
            settings: {
              ...state.settings,
              ...loadedSettings,
              modules: {...state.settings.modules, ...loadedSettings.modules},
              pdf: {...state.settings.pdf, ...loadedSettings.pdf},
              backup: {...state.settings.backup, ...loadedSettings.backup},
              paymentMethodStyles: {...state.settings.paymentMethodStyles, ...loadedSettings.paymentMethodStyles},
              datastore: {...state.settings.datastore, ...loadedSettings.datastore},
            },
            loading: false,
          }), false, 'loadSettings/success');
        } catch (error) {
          console.error("Failed to load settings:", error);
          set({loading: false}, false, 'loadSettings/error');
        }
      },

      updateSettings: async (newSettings) => {
        const currentSettings = get().settings;
        const updatedSettings = {...currentSettings, ...newSettings};

        set({settings: updatedSettings}, false, `updateSettings/${Object.keys(newSettings).join(',')}`);

        // Apply theme if changed
        if (newSettings.theme) {
          if (newSettings.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else if (newSettings.theme === 'light') {
            document.documentElement.classList.remove('dark');
          } else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }

        try {
          if (window.electronAPI) {
            const result = await window.electronAPI.saveSettings(updatedSettings);
            if (!result.success) {
              console.error('Failed to save settings, waiting for revert.');
            }
          } else {
            localStorage.setItem('app-settings', JSON.stringify(updatedSettings));
          }
        } catch (error) {
          console.error("Failed to save settings:", error);
        }
      },
    }),
    {name: 'Settings Store'}
  )
);

// Initialize settings listener for Electron
if (window.electronAPI) {
  window.electronAPI.onSettingsReverted((_event: any, revertedSettings: Settings) => {
    useSettingsStore.getState().setSettings(revertedSettings);
  });
}
