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
           // For other themes, we might want to decide if they are "dark" or "light" based on background color
           // For now, let's assume non-dark themes are light-ish, or we can check brightness.
           // But since we are overriding all colors with CSS variables, the 'dark' class might only affect
           // some hardcoded tailwind classes if any remain.
           // Let's remove 'dark' class for custom themes to avoid confusion, or maybe add it if background is dark.
           // For simplicity, let's stick to 'dark' class only for 'dark' theme for now, or check system preference for 'system'.
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

          // Apply accent color override if it exists and we are not using a strict theme that forbids it?
          // The prompt says "When a theme is selected, update all CSS variables live".
          // But we also have an accent color picker.
          // If the user picks a theme, it sets ACCENT_COLOR.
          // If the user picks an accent color, it should probably override the theme's accent color.
          // Let's allow the accent color setting to override the theme's accent color if it's explicitly set by the user
          // distinct from the theme default.
          // However, the current implementation stores themeColor separately.
          // Let's apply it after the theme.
          if (currentSettings.themeColor) {
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
        if (newSettings.theme) {
           if (newSettings.theme === 'system') {
             if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
               get().applyTheme('dark');
             } else {
               get().applyTheme('light');
             }
           } else {
             get().applyTheme(newSettings.theme);
           }
        }

        // Apply accent color if changed
        if (newSettings.themeColor) {
          document.documentElement.style.setProperty('--color-accent', newSettings.themeColor);
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
