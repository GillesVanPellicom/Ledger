import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useSettingsStore } from './useSettingsStore';
import '../electron.d';

interface BackupState {
  isBackingUp: boolean;
  backupCount: number;
  getBackupCount: () => Promise<void>;
  triggerBackup: () => Promise<void>;
  incrementEdits: () => Promise<void>;
}

export const useBackupStore = create<BackupState>()(
  devtools(
    (set, get) => ({
      isBackingUp: false,
      backupCount: 0,

      getBackupCount: async () => {
        if (window.electronAPI) {
          const count = await window.electronAPI.getBackupCount();
          set({ backupCount: count }, false, 'getBackupCount');
        }
      },

      triggerBackup: async () => {
        if (get().isBackingUp) return;
        set({ isBackingUp: true }, false, 'triggerBackup/start');
        try {
          if (window.electronAPI) {
            await window.electronAPI.triggerBackup();
            await get().getBackupCount();
          }
        } catch (error) {
          console.error('Failed to trigger backup:', error);
        } finally {
          set({ isBackingUp: false }, false, 'triggerBackup/end');
        }
      },

      incrementEdits: async () => {
        const settings = useSettingsStore.getState().settings;
        const updateSettings = useSettingsStore.getState().updateSettings;

        const newCount = (settings.backup.editsSinceLastBackup || 0) + 1;
        if (newCount >= settings.backup.interval) {
          await get().triggerBackup();
          updateSettings({ backup: { ...settings.backup, editsSinceLastBackup: 0 } });
        } else {
          updateSettings({ backup: { ...settings.backup, editsSinceLastBackup: newCount } });
        }
      },
    }),
    { name: 'Backup Store' }
  )
);

// Initial fetch of backup count
useBackupStore.getState().getBackupCount();
