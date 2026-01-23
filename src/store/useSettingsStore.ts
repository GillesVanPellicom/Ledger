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
  repairWizardState: () => void;
}

const isDev = process.env.NODE_ENV === 'development';

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
  },
  wizard: {
    askedQuestions: {},
    inProgress: false,
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

      repairWizardState: () => {
        const { settings } = get();
        if (!settings.wizard) return;

        const hasDatastore = !!settings.datastore?.folderPath;
        const hasName = !!settings.userName;
        const isInProgress = settings.wizard.inProgress;

        // If we have critical data but wizard is marked as inProgress, it's an inconsistent state
        // (likely a crash or forced quit during the final steps)
        if (hasDatastore && hasName && isInProgress) {
          console.warn('[SettingsStore] Inconsistent wizard state detected. Repairing...');
          get().updateSettings({
            wizard: {
              ...settings.wizard,
              inProgress: false
            }
          });
        }
      },

      loadSettings: async () => {
        set({loading: true}, false, 'loadSettings/start');
        try {
          let loadedSettings: Partial<Settings> = {};
          if (window.electronAPI) {
            loadedSettings = await window.electronAPI.getSettings();
            if (isDev) console.log('[SettingsStore] Loaded from Electron:', loadedSettings);
          } else {
            const localSettings = localStorage.getItem('app-settings');
            if (localSettings) {
              loadedSettings = JSON.parse(localSettings);
              if (isDev) console.log('[SettingsStore] Loaded from LocalStorage:', loadedSettings);
            }
          }

          const currentSettings: Settings = {
              ...initialSettings,
              ...loadedSettings,
              modules: {...initialSettings.modules, ...loadedSettings.modules},
              pdf: {...initialSettings.pdf, ...loadedSettings.pdf},
              backup: {...initialSettings.backup, ...loadedSettings.backup},
              paymentMethodStyles: {...initialSettings.paymentMethodStyles, ...loadedSettings.paymentMethodStyles},
              datastore: {...initialSettings.datastore, ...loadedSettings.datastore},
              receipts: {
                  ...initialSettings.receipts,
                  ...loadedSettings.receipts,
                  indicators: {
                      ...initialSettings.receipts?.indicators,
                      ...loadedSettings.receipts?.indicators
                  }
              } as any,
              dev: {...initialSettings.dev, ...loadedSettings.dev},
              formatting: {
                ...initialSettings.formatting,
                ...loadedSettings.formatting
              } as any,
              wizard: {
                  ...initialSettings.wizard!,
                  ...loadedSettings.wizard,
                  askedQuestions: {
                      ...initialSettings.wizard!.askedQuestions,
                      ...loadedSettings.wizard?.askedQuestions
                  }
              }
          };

          if (isDev) console.log('[SettingsStore] Final merged settings:', currentSettings);

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

          // Run repair logic after loading
          get().repairWizardState();
        } catch (error) {
          console.error("[SettingsStore] Failed to load settings:", error);
          set({loading: false}, false, 'loadSettings/error');
        }
      },

      updateSettings: async (newSettings) => {
        const currentSettings = get().settings;
        if (isDev) console.log('[SettingsStore] updateSettings called with:', newSettings);
        
        // Deep merge for nested objects to avoid overwriting with partial data or undefined
        const updatedSettings: Settings = {
            ...currentSettings,
            ...newSettings,
            modules: { ...currentSettings.modules, ...(newSettings.modules || {}) },
            pdf: { ...currentSettings.pdf, ...(newSettings.pdf || {}) },
            backup: { ...currentSettings.backup, ...(newSettings.backup || {}) },
            receipts: { 
                ...currentSettings.receipts, 
                ...(newSettings.receipts || {}),
                indicators: {
                    ...(currentSettings.receipts?.indicators || { debt: false, tentative: false, type: false, attachments: false }),
                    ...(newSettings.receipts?.indicators || {})
                }
            } as any,
            dev: { ...currentSettings.dev, ...(newSettings.dev || {}) },
            formatting: { 
                ...(currentSettings.formatting || { decimalSeparator: 'dot' }), 
                ...(newSettings.formatting || {}) 
            } as any,
            wizard: {
                ...(currentSettings.wizard || { askedQuestions: {}, inProgress: false }),
                ...(newSettings.wizard || {})
            }
        };

        if (isDev) console.log('[SettingsStore] New merged settings to save:', updatedSettings);

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
            if (isDev) console.log('[SettingsStore] Electron save result:', result);
            if (!result.success) {
              console.error('[SettingsStore] Failed to save settings, waiting for revert.');
            }
          } else {
            localStorage.setItem('app-settings', JSON.stringify(updatedSettings));
            if (isDev) console.log('[SettingsStore] Saved to LocalStorage');
          }
        } catch (error) {
          console.error("[SettingsStore] Failed to save settings:", error);
        }
      },
    }),
    {name: 'Settings Store'}
  )
);

// Initialize settings listener for Electron
if (window.electronAPI) {
  window.electronAPI.onSettingsReverted((_event: any, revertedSettings: Settings) => {
    if (isDev) console.log('[SettingsStore] Settings reverted from Electron:', revertedSettings);
    useSettingsStore.getState().setSettings(revertedSettings);
  });
}
