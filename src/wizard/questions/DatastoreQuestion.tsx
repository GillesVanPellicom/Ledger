import React, { useState } from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import { FolderPlus, CheckCircle, AlertCircle } from 'lucide-react';
import '../../electron.d';

export const DatastoreQuestion: WizardQuestion = {
  id: 'datastore',
  version: 1,
  appliesWhen: () => true,
  component: ({ context, onNext }) => {
    const [path, setPath] = useState(context.settings.datastore?.folderPath || '');
    const [error, setError] = useState<string | null>(null);

    const handleSelectDatastore = async () => {
      if (window.electronAPI) {
        const selectedPath = await window.electronAPI.selectDirectory();
        if (selectedPath) {
          setPath(selectedPath);
          context.updateSettings({ datastore: { folderPath: selectedPath } });
          setError(null);
        }
      }
    };

    const handleContinue = () => {
      if (!path) {
        setError("Please select a folder to continue.");
        return;
      }
      onNext();
    };

    return (
      <div className="space-y-8 max-w-lg mx-auto text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-font-1">Where should we store your data?</h2>
          <p className="text-font-2">
            Select a folder to store all your data, images, and backups.
          </p>
        </div>

        <div className="p-6 border-2 border-dashed border-border rounded-xl bg-bg-2 flex flex-col items-center justify-center gap-4">
          {path ? (
            <>
              <CheckCircle className="h-12 w-12 text-green" />
              <div className="text-sm font-medium text-font-1 break-all">{path}</div>
              <Button variant="secondary" onClick={handleSelectDatastore} size="sm">
                Change Folder
              </Button>
            </>
          ) : (
            <>
              <FolderPlus className="h-12 w-12 text-font-2" />
              <Button onClick={handleSelectDatastore}>
                Select Folder
              </Button>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-red text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Button onClick={handleContinue} disabled={!path} className="w-full" size="lg">
          Next
        </Button>
      </div>
    );
  },
};
