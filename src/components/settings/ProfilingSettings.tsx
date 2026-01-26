import React, { useState, useEffect } from 'react';
import { Activity, FileJson, FolderOpen } from 'lucide-react';
import Switch from '../ui/Switch';
import { useSettingsStore } from '../../store/useSettingsStore';
import { toast } from 'sonner';
import Button from '../ui/Button';
import Tooltip from '../ui/Tooltip';

const ProfilingSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const showControls = settings.dev?.profiling?.showControls ?? false;
  const outputPath = settings.dev?.profiling?.outputPath || '';

  const handleToggleControls = async () => {
    const newEnabled = !showControls;
    
    // If turning off UI, also stop any active profiling
    if (!newEnabled) {
      try {
        const isCurrentlyProfiling = await window.electronAPI.isProfiling();
        if (isCurrentlyProfiling) {
          await window.electronAPI.stopProfiling();
          toast.info('Profiling stopped because controls were hidden');
        }
      } catch (err) {
        console.error('Failed to stop profiling on UI hide:', err);
      }
    }

    updateSettings({
      dev: {
        ...settings.dev,
        profiling: {
          ...settings.dev?.profiling,
          showControls: newEnabled
        }
      }
    });
  };

  const handleSelectDirectory = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        updateSettings({
          dev: {
            ...settings.dev,
            profiling: {
              ...settings.dev?.profiling,
              outputPath: path
            }
          }
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-medium text-font-1">CPU Profiling</h3>
      </div>

      <div className="space-y-6">
        <Switch
          label="Show Profiling Controls"
          description="Display floating controls at the bottom left to start/stop recording."
          isEnabled={showControls}
          onToggle={handleToggleControls}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-font-1">Output Directory</p>
              <p className="text-sm text-font-2">Where .cpuprofile files will be saved.</p>
            </div>
            <Button variant="secondary" onClick={handleSelectDirectory} className="gap-2">
              <FolderOpen className="h-4 w-4" /> Select Folder
            </Button>
          </div>
          
          <div className="p-3 bg-field-disabled rounded-lg border border-border">
            <Tooltip content={outputPath}>
              <p className="text-xs font-mono text-font-2 truncate">
                {outputPath || 'Default application data folder'}
              </p>
            </Tooltip>
          </div>
        </div>

        <div className="text-xs text-font-2 bg-field-disabled p-3 rounded-lg flex items-start gap-2">
          <FileJson className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Profiles can be loaded into Chrome DevTools (Performance tab) or VS Code to analyze performance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilingSettings;
