import React, { createContext, useContext } from 'react';
import { useBackup } from '../hooks/useBackup';

const BackupContext = createContext();

export const useBackupContext = () => useContext(BackupContext);

export const BackupProvider = ({ children }) => {
  const backup = useBackup();
  return (
    <BackupContext.Provider value={backup}>
      {children}
    </BackupContext.Provider>
  );
};
