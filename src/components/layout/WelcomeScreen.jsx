import React from 'react';
import { FolderPlusIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import { useSettings } from '../../context/SettingsContext';

const WelcomeScreen = () => {
  const { updateSettings } = useSettings();

  const handleSelectDatastore = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        updateSettings({ datastore: { folderPath: path } });
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-center">
      <FolderPlusIcon className="h-24 w-24 text-accent mb-6" />
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">Welcome</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        To get started, please select a folder to store your data. You might consider placing this folder in a place which is backed up to the cloud.
      </p>
      <Button size="lg" onClick={handleSelectDatastore}>
        Select Datastore Folder
      </Button>
      <p className="text-sm text-gray-500 mt-4">
        You can change this location later in the settings.
      </p>
    </div>
  );
};

export default WelcomeScreen;
