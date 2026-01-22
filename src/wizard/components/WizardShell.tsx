import React from 'react';
import Button from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { WizardHeader } from './WizardHeader';

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
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      <WizardHeader
        title=""
        backButton={
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack} 
            className={!canGoBack ? 'invisible pointer-events-none' : ''}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        variant="centered-box"
        centeredContent={
          showCounter && (
            <div className="text-sm text-font-2 font-medium">
              Page {currentStep} / {totalSteps}
            </div>
          )
        }
      />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center px-8 py-6 w-full relative overflow-hidden">
        <div className="w-full max-w-2xl h-full flex flex-col overflow-visible">
          {children}
        </div>
      </main>
    </div>
  );
};

export default WizardShell;
