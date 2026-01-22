import React, { useState } from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const NameQuestion: WizardQuestion = {
  id: 'name',
  version: 1,
  appliesWhen: () => true,
  component: ({ context, onNext }) => {
    const [name, setName] = useState(context.settings.userName || '');

    const handleContinue = () => {
      if (name.trim()) {
        const capitalizedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
        context.updateSettings({ userName: capitalizedName });
        onNext();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && name.trim()) {
        handleContinue();
      }
    };

    return (
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-font-1">What should we call you?</h2>
          <p className="text-font-2">
            This name will be used for light personalisation and on generated documents.
          </p>
        </div>
        
        <Input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-lg p-4"
          autoFocus
        />
        
        <Button 
          onClick={handleContinue} 
          disabled={!name.trim()} 
          className="w-full"
          size="lg"
        >
          Next
        </Button>
      </div>
    );
  },
};
