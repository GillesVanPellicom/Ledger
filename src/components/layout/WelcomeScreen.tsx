import React, { useEffect } from 'react';
import { FolderPlus } from 'lucide-react';
import Button from '../ui/Button';
import '../../electron.d';
import { useSettingsStore } from '../../store/useSettingsStore';

const WelcomeScreen: React.FC = () => {
  const {updateSettings} = useSettingsStore();

  const handleSelectDatastore = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        updateSettings({datastore: {folderPath: path}});
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSelectDatastore();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-bg text-center">
      <FolderPlus className="h-24 w-24 text-accent mb-6"/>
      <h1 className="text-3xl font-bold text-font-1 mb-2">Welcome</h1>
      <p className="text-lg text-font-2 mb-8 max-w-md">
        To get started, please select a folder to store your data. You might consider placing this folder in a place
        which is backed up to the cloud.
      </p>
      <Button size="lg" onClick={handleSelectDatastore}>
        Select Datastore Folder
      </Button>
      <p className="text-sm text-font-2 mt-4">
        You can change this location later in the settings.
      </p>
    </div>
  );
};

export default WelcomeScreen;
