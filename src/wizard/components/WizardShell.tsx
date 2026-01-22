import React from 'react';
import Button from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

interface WizardShellProps {
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  onBack: () => void;
  children: React.ReactNode;
  /** Whether to show the "Page X / Y" indicator. */
  showCounter?: boolean;
}

/**
 * WizardShell provides the consistent layout and navigation for all wizard pages.
 * 
 * Design Intent:
 * - Maintain a "calm and focused" UI as per specification.
 * - Centralize navigation buttons and progress tracking.
 * - Ensure consistent spacing and animation for page transitions.
 */
const WizardShell: React.FC<WizardShellProps> = ({
  currentStep,
  totalSteps,
  canGoBack,
  onBack,
  children,
  showCounter = true,
}) => {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header: Navigation and Progress */}
      <header className="p-4 flex items-center justify-between">
        <div className="w-20">
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className={`flex items-center gap-2 ${!canGoBack ? 'invisible pointer-events-none' : ''}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="text-sm text-font-2 font-medium">
          {showCounter && `Page ${currentStep} / ${totalSteps}`}
        </div>
        <div className="w-20" /> {/* Spacer for visual balance */}
      </header>
      
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default WizardShell;
