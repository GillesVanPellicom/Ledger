import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import { Hand } from 'lucide-react';

export const IntroQuestion: WizardQuestion = {
  id: 'intro',
  version: 1,
  appliesWhen: () => true,
  component: ({ context, onNext }) => {
    const userName = context.settings.userName || 'there';

    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow flex flex-col items-center justify-center space-y-8 overflow-y-auto p-6">
          <h2 className="text-3xl font-bold text-font-1">Hi {userName}</h2>
          <p className="text-xl text-font-2 text-center max-w-md">
            We'll now be asking you some questions to customize your experience.
          </p>
          <p className="text-base text-font-2 text-center max-w-md">
             Don’t worry — you can change any choice later in Settings.
          </p>
        </div>
        <div className="pt-6 pb-2 mt-auto w-full max-w-md mx-auto">
          <Button size="lg" onClick={onNext} className="w-full">
            Continue
          </Button>
        </div>
      </div>
    );
  },
};
