import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import AppearanceSettings from '../../components/settings/AppearanceSettings';

export const ThemeQuestion: WizardQuestion = {
  id: 'theme',
  version: 1,
  appliesWhen: () => true,
  component: ({ context, onNext }) => {
    const userName = context.settings.userName || 'there';

    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-font-1">Hi {userName}, what theme would you like?</h2>
          <p className="text-font-2">
            You can change this later in settings.
          </p>
        </div>

        <div className="bg-bg-2 p-6 rounded-xl border border-border">
          <AppearanceSettings />
        </div>

        <Button onClick={onNext} className="w-full" size="lg">
          Next
        </Button>
      </div>
    );
  },
};
