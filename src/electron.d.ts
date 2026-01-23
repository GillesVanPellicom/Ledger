import { Settings } from './types';

declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<Partial<Settings>>;
      saveSettings: (settings: Settings) => Promise<{ success: boolean }>;
      onSettingsReverted: (callback: (event: any, revertedSettings: Settings) => void) => void;
      removeSettingsRevertedListener: (callback: (event: any, revertedSettings: Settings) => void) => void;
      selectDirectory: () => Promise<string | null>;
      resetSettings: () => Promise<void>;
      quitApp: () => Promise<void>;
      openBackupFolder: () => void;
      queryDb: (sql: string, params: any[]) => Promise<any>;
      getDbStatus: () => Promise<{ connected: boolean; error: string | null }>;
      createTransaction: (transaction: any) => Promise<{ success: boolean }>;
      deleteTransaction: (payload: { topUpId: number }) => Promise<{ success: boolean; changes: number }>;
      readFileAsBase64: (path: string) => Promise<string>;
      saveImage: (folderPath: string, imagePath: string) => Promise<string>;
      getBackupCount: () => Promise<number>;
      triggerBackup: () => Promise<void>;
      isDev: boolean;
    };
  }
}
