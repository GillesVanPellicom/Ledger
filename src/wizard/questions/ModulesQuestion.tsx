import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import { ModulesComponent } from '../../preferences/modules/ModulesComponent';

export const ModulesQuestion: WizardQuestion = {
  id: 'modules',
  version: 1,
  appliesWhen: () => true,
  component: ({ context, onNext }) => {
    const handleModuleToggle = (key: string) => {
      const currentModules = context.settings.modules || {};
      const moduleConfig = (currentModules as any)[key] || { enabled: false };
      
      const newModules = { 
        ...currentModules, 
        [key]: { ...moduleConfig, enabled: !moduleConfig.enabled } 
      };
      
      // We need to cast to any because Partial<Settings> structure is complex to satisfy fully here without deep merge logic or strict types
      context.updateSettings({ modules: newModules as any });
    };

    return (
      <div className="space-y-8 max-w-lg mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-font-1">Choose your modules</h2>
          <p className="text-font-2">
            Enable optional features you might need. You can change these later.
          </p>
        </div>

        <ModulesComponent settings={context.settings} onToggle={handleModuleToggle} />

        <Button onClick={onNext} className="w-full" size="lg">
          Next
        </Button>
      </div>
    );
  },
};
