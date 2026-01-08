import React, { createContext, useContext, ReactNode } from 'react';
import { useBackup } from '../hooks/useBackup';

type BackupContextType = ReturnType<typeof useBackup>;

const BackupContext = createContext<BackupContextType | undefined>(undefined);

export const useBackupContext = () => {
  const context = useContext(BackupContext);
  if (context === undefined) {
    throw new Error('useBackupContext must be used within a BackupProvider');
  }
  return context;
};

interface BackupProviderProps {
  children: ReactNode;
}

export const BackupProvider: React.FC<BackupProviderProps> = ({ children }) => {
  const backup = useBackup();
  return (
    <BackupContext.Provider value={backup}>
      {children}
    </BackupContext.Provider>
  );
};
