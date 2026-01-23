import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WizardContext } from './WizardContext';
import { questionRegistry } from './questionRegistry';
import { useSettingsStore } from '../store/useSettingsStore';
import { wizardState } from '../settings/wizardState';
import WizardShell from './components/WizardShell';
import { ResumeQuestion } from './questions/ResumeQuestion';

/**
 * WizardQuestion defines the structure for a single preference elicitation step.
 */
export interface WizardQuestion {
  /** Stable identifier, used for tracking if the question was asked. */
  id: string;
  /** Semantic version. Increment this to force the question to be re-asked for all users. */
  version: number;
  /** Logic to determine if this question is relevant to the current user/context. */
  appliesWhen: (context: WizardContext) => boolean;
  /** The React component that renders the question UI. */
  component: React.FC<{ 
    context: WizardContext; 
    onNext: () => void; 
    onBack: () => void; 
    isLast: boolean;
    registerCanContinue?: (fn: () => boolean) => void;
  }>;
  /** Optional side-effect to run when "Next" is clicked (e.g., complex persistence). */
  apply?: (context: WizardContext) => Promise<void> | void;
}

/**
 * WizardController is the orchestrator for the versioned preference wizard.
 */
export const WizardController: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const { settings, updateSettings } = useSettingsStore();
  const [questions, setQuestions] = useState<WizardQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canContinueFn, setCanContinueFn] = useState<(() => boolean) | null>(null);
  
  // Store the index we should jump to after Resume
  const resumeJumpIndexRef = useRef<number | null>(null);

  const context: WizardContext = {
    settings,
    updateSettings,
  };

  // Helper to register validation function without triggering React's functional update
  const registerCanContinue = useCallback((fn: () => boolean) => {
    setCanContinueFn(() => fn);
  }, []);

  useEffect(() => {
    const initWizard = async () => {
      const askedQuestions = wizardState.getAskedQuestions();
      const isFirstRun = Object.keys(askedQuestions).length === 0;
      const wasInProgress = wizardState.isWizardInProgress();
      const debugConfig = wizardState.getDebugConfig();

      // 1. Get ALL applicable questions for the full history
      const allApplicableQuestions = questionRegistry.filter((q) => {
        if (debugConfig.skipHello && q.id === 'hello') return false;
        return q.appliesWhen(context);
      });

      // 2. Find the first question that hasn't been completed yet
      const firstNewQuestionIndex = allApplicableQuestions.findIndex(q => {
        if (debugConfig.ignoreHistory) return true;
        const lastAskedVersion = askedQuestions[q.id] || 0;
        return q.version > lastAskedVersion;
      });

      // If all questions are done, just finish
      if (firstNewQuestionIndex === -1 && !debugConfig.ignoreHistory) {
        if (wasInProgress) {
            wizardState.setWizardInProgress(false);
        }
        wizardState.clearDebugConfig();
        onFinish();
        return;
      }

      const isDebugRun = !!debugConfig.startAtQuestionId || debugConfig.skipHello || debugConfig.ignoreHistory;
      
      // Determine starting index and question list
      if (wasInProgress && !isFirstRun && !isDebugRun) {
          // Resume flow: Show Resume screen first, then jump to where we left off
          setQuestions([ResumeQuestion, ...allApplicableQuestions]);
          setCurrentIndex(0);
          resumeJumpIndexRef.current = firstNewQuestionIndex + 1; // +1 because of ResumeQuestion
      } else {
          // Normal flow or Upgrade flow
          setQuestions(allApplicableQuestions);
          
          if (debugConfig.startAtQuestionId) {
            const startIndex = allApplicableQuestions.findIndex(q => q.id === debugConfig.startAtQuestionId);
            setCurrentIndex(startIndex !== -1 ? startIndex : 0);
          } else {
            // Start at the first new question, but allow going back
            setCurrentIndex(firstNewQuestionIndex !== -1 ? firstNewQuestionIndex : 0);
          }
      }
      
      wizardState.setWizardInProgress(true);
      setLoading(false);
    };

    initWizard();
  }, []);

  const handleNext = useCallback(async () => {
    // If a validation function is registered and it returns false, don't continue.
    if (canContinueFn && !canContinueFn()) {
      return;
    }

    const currentQuestion = questions[currentIndex];
    const debugConfig = wizardState.getDebugConfig();
    
    if (currentQuestion.apply) {
      await currentQuestion.apply(context);
    }
    
    if (currentQuestion.id !== 'resume') {
        wizardState.setQuestionAsked(currentQuestion.id, currentQuestion.version);
    }

    // Handle Resume jump
    if (currentQuestion.id === 'resume' && resumeJumpIndexRef.current !== null) {
        const jumpTo = resumeJumpIndexRef.current;
        resumeJumpIndexRef.current = null;
        setCurrentIndex(jumpTo);
        return;
    }

    if (currentIndex < questions.length - 1) {
      setCanContinueFn(null);
      setCurrentIndex(currentIndex + 1);
    } else {
      wizardState.setWizardInProgress(false);
      wizardState.clearDebugConfig();
      onFinish();
    }
  }, [currentIndex, questions, canContinueFn, context, onFinish]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      // Don't allow going back to the Resume screen once we've continued
      if (questions[currentIndex - 1].id === 'resume') {
          return;
      }
      setCanContinueFn(null);
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, questions]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isNeutralFocus = 
        document.activeElement === document.body || 
        document.activeElement?.tagName === 'BUTTON' ||
        document.activeElement?.tagName === 'DIV';

      if (e.key === 'Enter' && isNeutralFocus && !loading) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleNext, loading]);

  if (loading) return null;

  const CurrentQuestionComponent = questions[currentIndex].component;
  
  const isResume = questions[currentIndex].id === 'resume';
  const totalRealSteps = questions[0].id === 'resume' ? questions.length - 1 : questions.length;
  const currentRealStep = questions[0].id === 'resume' ? Math.max(1, currentIndex) : currentIndex + 1;
  const showCounter = !isResume;

  return (
    <WizardShell
      currentStep={currentRealStep}
      totalSteps={totalRealSteps}
      canGoBack={currentIndex > 0 && questions[currentIndex - 1].id !== 'resume'}
      onBack={handleBack}
      showCounter={showCounter}
    >
      <CurrentQuestionComponent
        context={context}
        onNext={handleNext}
        onBack={handleBack}
        isLast={currentIndex === questions.length - 1}
        registerCanContinue={registerCanContinue}
      />
    </WizardShell>
  );
};
