import React from 'react';
import { WizardQuestion } from '../WizardController';
import Button from '../../components/ui/Button';
import { BackgroundGradientAnimation } from '../../components/ui/background-gradient-animation';

/**
 * HelloQuestion: The entry point of the wizard.
 * 
 * Design Intent:
 * - Visually large and calm greeting.
 * - Establish a welcoming tone without being "bombastic".
 * - Safety: Always the first question in a fresh install.
 */
export const HelloQuestion: WizardQuestion = {
  id: 'hello',
  version: 1,
  appliesWhen: () => true, // Always relevant if not already asked.
  component: ({ onNext }) => {
    return (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center overflow-hidden">
        <BackgroundGradientAnimation 
          containerClassName="absolute inset-0"
          className="absolute inset-0 flex items-center justify-center"
          size="100%"
        >
          <div className="z-10 text-center space-y-12 p-8">
            <h1 className="text-[12rem] font-bold text-font-1 tracking-tighter leading-none">
              Hello
            </h1>
            <p className="text-3xl text-font-1 max-w-2xl mx-auto font-medium">
              Welcome to Ledger. Let's get you set up.
            </p>
            <div className="pt-12">
              <Button 
                size="lg" 
                onClick={onNext} 
                className="bg-font-1 text-bg hover:opacity-90 border-none shadow-2xl text-2xl px-12 py-6 h-auto rounded-2xl transition-all hover:scale-105 active:scale-95"
              >
                Get Started
              </Button>
            </div>
          </div>
        </BackgroundGradientAnimation>
      </div>
    );
  },
};
