import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import { RefreshCw } from 'lucide-react';

/**
 * ResumeQuestion: Recovery screen for interrupted sessions.
 * 
 * Design Intent:
 * - Friendly acknowledgement that the app was closed unexpectedly.
 * - Provide a clear path to continue the setup.
 * - Safety: Injected dynamically by WizardController; not part of the standard registry.
 */
export const ResumeQuestion: WizardQuestion = {
  id: 'resume',
  version: 0, // Versioning not applicable for this utility screen.
  appliesWhen: () => false, // Handled explicitly by WizardController logic.
  component: ({ onNext }) => {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow flex flex-col items-center justify-center space-y-8 overflow-y-auto max-w-md mx-auto w-full p-6">
          <div className="flex justify-center">
            <RefreshCw className="h-16 w-16 text-accent" />
          </div>
          <h2 className="text-3xl font-bold text-font-1 text-center">Welcome back</h2>
          <p className="text-xl text-font-2 text-center">
            It seems like we got cut off. Let's pick up where we left off.
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
