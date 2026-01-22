import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import { CheckCircle } from 'lucide-react';

export const CompletionQuestion: WizardQuestion = {
  id: 'completion',
  version: 1,
  appliesWhen: () => true,
  component: ({ onNext }) => {
    return (
      <div className="text-center space-y-8 max-w-md mx-auto">
        <div className="flex justify-center">
          <CheckCircle className="h-24 w-24 text-green" />
        </div>
        <h2 className="text-3xl font-bold text-font-1">You're all set.</h2>
        <p className="text-xl text-font-2">
          Welcome to Ledger.
        </p>
        <div className="pt-8">
          <Button size="lg" onClick={onNext} className="w-full">
            Finish
          </Button>
        </div>
      </div>
    );
  },
};
