import {create} from 'zustand';
import {devtools} from 'zustand/middleware';
import {Settings} from '../types';
import {themes} from '../styles/themes';

interface SettingsState {
  settings: Settings;
  loading: boolean;
  setSettings: (settings: Settings) => void;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  applyTheme: (themeId: string) => void;
}

const initialSettings: Settings = {
  theme: 'system',
  themeColor: '#007AFF', // Default macOS Blue
  headerColor: '#8b5cf6', // Default Violet
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
  receipts: {
    indicators: {
      debt: true,
      tentative: true,
      type: false,
      attachments: false,
    }
  },
  dev: {
    mockTime: {
      enabled: false,
      date: null,
    }
  },
  formatting: {
    decimalSeparator: 'dot', // 'dot' or 'comma'
  }
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      settings: initialSettings,
      loading: true,

      setSettings: (settings) => set({settings}, false, 'setSettings'),

      applyTheme: (themeId: string) => {
        const theme = themes[themeId] || themes.light;
        const root = document.documentElement;

        // Apply CSS variables
        Object.entries(theme.colors).forEach(([key, value]) => {
          // Remove _COLOR suffix to match index.css variable names
          // e.g. BG_COLOR -> bg, BG_COLOR_2 -> bg-2
          const normalizedKey = key.replace('_COLOR', '');
          const cssVarName = `--color-${normalizedKey.toLowerCase().replace(/_/g, '-')}`;
          root.style.setProperty(cssVarName, value);
        });

        // Handle dark mode class for Tailwind
        if (themeId === 'dark') {
          root.classList.add('dark');
        } else if (themeId === 'light') {
          root.classList.remove('dark');
        } else {
           root.classList.remove('dark');
        }
      },

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

          const currentSettings = {
              ...initialSettings,
              ...loadedSettings,
              modules: {...initialSettings.modules, ...loadedSettings.modules},
              pdf: {...initialSettings.pdf, ...loadedSettings.pdf},
              backup: {...initialSettings.backup, ...loadedSettings.backup},
              paymentMethodStyles: {...initialSettings.paymentMethodStyles, ...loadedSettings.paymentMethodStyles},
              datastore: {...initialSettings.datastore, ...loadedSettings.datastore},
              receipts: {...initialSettings.receipts, ...loadedSettings.receipts},
              dev: {...initialSettings.dev, ...loadedSettings.dev},
              formatting: {...initialSettings.formatting, ...loadedSettings.formatting},
          };

          // Apply theme immediately
          const themeId = currentSettings.theme || 'light';
          if (themeId === 'system') {
             if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
               get().applyTheme('dark');
             } else {
               get().applyTheme('light');
             }
          } else {
             get().applyTheme(themeId);
          }

          // Apply accent color override if it exists
          // If the theme locks the accent color, we should respect that, but we don't have easy access to theme config here without importing themes.
          // However, the logic for locking is handled in AppearanceSettings.tsx for UI.
          // Here we just apply what's in settings.
          // BUT, if the theme is locked, we should probably apply the theme's accent color instead of the user's stored preference if they conflict?
          // The requirement says: "whenever you select a theme which overrwrites one of the colorpickers, the currrently user picked color should stay selected. The overwrite should happen in the background. Once another theme without overwrite is selected the previously chosen color should take effect once again."
          // This means we should ALWAYS apply the theme's accent color if the theme locks it, but keep the user's preference in the store.
          
          const theme = themes[themeId] || themes.light;
          if (theme.lockedAccent) {
             document.documentElement.style.setProperty('--color-accent', theme.colors.ACCENT_COLOR);
          } else if (currentSettings.themeColor) {
            document.documentElement.style.setProperty('--color-accent', currentSettings.themeColor);
          }

          set({
            settings: currentSettings,
            loading: false,
          }, false, 'loadSettings/success');
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
        let themeId = newSettings.theme || currentSettings.theme || 'light';
        if (themeId === 'system') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                get().applyTheme('dark');
                themeId = 'dark'; // Resolve for checking locks
            } else {
                get().applyTheme('light');
                themeId = 'light'; // Resolve for checking locks
            }
        } else {
            get().applyTheme(themeId);
        }

        const theme = themes[themeId] || themes.light;

        // Apply accent color logic
        // If theme locks accent, use theme's accent.
        // Otherwise, use the user's stored preference (newSettings.themeColor or currentSettings.themeColor).
        if (theme.lockedAccent) {
             document.documentElement.style.setProperty('--color-accent', theme.colors.ACCENT_COLOR);
        } else {
             const colorToApply = newSettings.themeColor || currentSettings.themeColor;
             if (colorToApply) {
                 document.documentElement.style.setProperty('--color-accent', colorToApply);
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
