import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';

export const PatchNotesQuestion: WizardQuestion = {
  id: 'patchNotes',
  version: 0, // Increment this when releasing new patch notes
  appliesWhen: () => false, // Disable for now until we have patch notes
  component: ({ onNext }) => {
    return (
      <div className="space-y-8 max-w-lg mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-font-1">What's New</h2>
          <p className="text-font-2">
            Check out the latest updates and improvements.
          </p>
        </div>

        <div className="bg-bg-2 p-6 rounded-xl border border-border max-h-96 overflow-y-auto">
          <h3 className="font-bold text-font-1 mb-2">Release Notes</h3>
          <ul className="list-disc list-inside text-font-2 space-y-1">
            <li>Initial release of the new Wizard system.</li>
            <li>Improved settings management.</li>
            <li>Bug fixes and performance improvements.</li>
          </ul>
        </div>

        <Button onClick={onNext} className="w-full" size="lg">
          Continue
        </Button>
      </div>
    );
  },
};
