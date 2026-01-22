import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import AppearanceSettings from '../../components/settings/AppearanceSettings';

export const ThemeQuestion: WizardQuestion = {
  id: 'theme',
  version: 1,
  appliesWhen: () => true,
  component: ({ context, onNext }) => {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow flex flex-col justify-center space-y-8 overflow-y-auto max-w-3xl mx-auto w-full p-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-bold text-font-1">Which theme suits you best?</h2>
            <p className="text-font-2">
              Pick the look you prefer.
            </p>
          </div>

          <AppearanceSettings showPreview={false} showTitle={false} showCard={false} />
        </div>

        <div className="pt-6 pb-2 mt-auto w-full max-w-md mx-auto">
          <Button onClick={onNext} className="w-full" size="lg">
            Next
          </Button>
        </div>
      </div>
    );
  },
};
