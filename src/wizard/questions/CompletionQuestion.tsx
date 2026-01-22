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
      <div className="flex flex-col h-full">
        <div className="flex-grow flex flex-col items-center justify-center space-y-8 overflow-y-auto max-w-md mx-auto w-full p-6">
          <div className="flex justify-center">
            <CheckCircle className="h-24 w-24 text-green" />
          </div>
          <h2 className="text-3xl font-bold text-font-1 text-center">You're all set.</h2>
          <p className="text-xl text-font-2 text-center">
            Welcome to Ledger.
          </p>
        </div>
        <div className="pt-6 pb-2 mt-auto w-full max-w-md mx-auto">
          <Button size="lg" onClick={onNext} className="w-full">
            Finish
          </Button>
        </div>
      </div>
    );
  },
};
