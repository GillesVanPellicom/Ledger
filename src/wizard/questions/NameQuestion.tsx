import React, { useState, useEffect } from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const NameQuestion: WizardQuestion = {
  id: 'name',
  version: 1,
  appliesWhen: () => true,
  component: ({ context, onNext, registerCanContinue }) => {
    const [name, setName] = useState(context.settings.userName || '');

    const canContinue = () => name.trim().length > 0;

    useEffect(() => {
      if (registerCanContinue) {
        registerCanContinue(canContinue);
      }
    }, [name, registerCanContinue]);

    const handleContinue = () => {
      if (canContinue()) {
        const capitalizedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
        context.updateSettings({ userName: capitalizedName });
        onNext();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleContinue();
      }
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow flex flex-col justify-center space-y-6 overflow-y-auto max-w-md mx-auto w-full p-6">
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
        </div>
        
        <div className="pt-6 pb-2 mt-auto w-full max-w-md mx-auto">
          <Button 
            onClick={handleContinue} 
            disabled={!canContinue()}
            className="w-full"
            size="lg"
          >
            Next
          </Button>
        </div>
      </div>
    );
  },
};
