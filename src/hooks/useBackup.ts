import { useState, useEffect, useCallback } from 'react';
import { Settings } from '../types';
import '../electron.d';
import { useSettingsStore } from '../store/useSettingsStore';

export const useBackup = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupCount, setBackupCount] = useState<number>(0);

  const getBackupCount = useCallback(async () => {
    if (window.electronAPI) {
      const count = await window.electronAPI.getBackupCount();
      setBackupCount(count);
    }
  }, []);

  useEffect(() => {
    getBackupCount();
  }, [getBackupCount]);

  const triggerBackup = useCallback(async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.triggerBackup();
        await getBackupCount();
      }
    } catch (error) {
      console.error('Failed to trigger backup:', error);
    } finally {
      setIsBackingUp(false);
    }
  }, [isBackingUp, getBackupCount]);

  const incrementEdits = useCallback(async () => {
    const newCount = (settings.backup.editsSinceLastBackup || 0) + 1;
    if (newCount >= settings.backup.interval) {
      await triggerBackup();
      updateSettings({ backup: { ...settings.backup, editsSinceLastBackup: 0 } });
    } else {
      updateSettings({ backup: { ...settings.backup, editsSinceLastBackup: newCount } });
    }
  }, [settings, updateSettings, triggerBackup]);

  return { isBackingUp, backupCount, triggerBackup, incrementEdits, getBackupCount };
};
