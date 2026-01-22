import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import FormattingSettings from '../../components/settings/FormattingSettings';

export const NumberFormatQuestion: WizardQuestion = {
  id: 'numberFormat',
  version: 1,
  appliesWhen: () => true,
  component: ({ onNext }) => {
    return (
      <div className="space-y-8 max-w-lg mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-font-1">How should numbers be formatted?</h2>
          <p className="text-font-2">
            Choose your preferred decimal separator.
          </p>
        </div>

        <div className="bg-bg-2 p-6 rounded-xl border border-border">
          <FormattingSettings />
        </div>

        <Button onClick={onNext} className="w-full" size="lg">
          Next
        </Button>
      </div>
    );
  },
};
