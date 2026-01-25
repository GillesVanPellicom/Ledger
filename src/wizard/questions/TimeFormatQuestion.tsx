import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import TimeSettings from '../../components/settings/TimeSettings';

export const TimeFormatQuestion: WizardQuestion = {
  id: 'timeFormat',
  version: 1,
  appliesWhen: () => true,
  component: ({ onNext }) => {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow flex flex-col justify-center space-y-8 overflow-y-auto max-w-lg mx-auto w-full p-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-bold text-font-1">How should time be formatted?</h2>
            <p className="text-font-2">
              Choose your preferred time format.
            </p>
          </div>

          <TimeSettings showPreview={true} showCard={false} showTitle={false} />
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
