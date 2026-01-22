import React, { useState, useEffect } from 'react';
import { WizardContext } from './WizardContext';
import { questionRegistry } from './questionRegistry';
import { useSettingsStore } from '../store/useSettingsStore';
import { wizardState } from '../settings/wizardState';
import WizardShell from './components/WizardShell';
import { ResumeQuestion } from './questions/ResumeQuestion';

/**
 * WizardQuestion defines the structure for a single preference elicitation step.
 * 
 * Design Intent:
 * - Decouple question logic (appliesWhen, apply) from UI (component).
 * - Versioning allows re-asking questions if their meaning or defaults change.
 */
export interface WizardQuestion {
  /** Stable identifier, used for tracking if the question was asked. */
  id: string;
  /** Semantic version. Increment this to force the question to be re-asked for all users. */
  version: number;
  /** Logic to determine if this question is relevant to the current user/context. */
  appliesWhen: (context: WizardContext) => boolean;
  /** The React component that renders the question UI. */
  component: React.FC<{ context: WizardContext; onNext: () => void; onBack: () => void; isLast: boolean }>;
  /** Optional side-effect to run when "Next" is clicked (e.g., complex persistence). */
  apply?: (context: WizardContext) => Promise<void> | void;
}

/**
 * WizardController is the orchestrator for the versioned preference wizard.
 * 
 * Design Intent:
 * - Ensure a "monolithic" feel while maintaining modular question definitions.
 * - Handle session recovery (Resume flow) if the app was closed unexpectedly.
 * - Act as a gatekeeper: the main app should only initialize after this finishes.
 * 
 * Safety Measures:
 * - Questions are filtered BEFORE the wizard starts to ensure only relevant/new ones are shown.
 * - Progress is persisted immediately after each step to prevent data loss on crash.
 * - 'inProgress' flag ensures we can detect interrupted sessions.
 */
export const WizardController: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const { settings, updateSettings } = useSettingsStore();
  const [questions, setQuestions] = useState<WizardQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Shared context provided to all questions.
  // This allows questions to read/write settings without directly touching the global store.
  const context: WizardContext = {
    settings,
    updateSettings,
  };

  useEffect(() => {
    const initWizard = async () => {
      const askedQuestions = wizardState.getAskedQuestions();
      const isFirstRun = Object.keys(askedQuestions).length === 0;
      const wasInProgress = wizardState.isWizardInProgress();
      const debugConfig = wizardState.getDebugConfig();

      if (debugConfig.verboseLogging) {
        console.log('[Wizard] Initializing with config:', debugConfig);
        console.log('[Wizard] Previously asked:', askedQuestions);
      }

      // Filter the registry to find questions that:
      // 1. Apply to the current context.
      // 2. Have a version higher than what was previously asked.
      let questionsToAsk = questionRegistry.filter((q) => {
        if (debugConfig.skipHello && q.id === 'hello') return false;
        if (!q.appliesWhen(context)) return false;
        
        // Rule: If no wizard metadata exists, show everything applicable (Welcome flow).
        if (isFirstRun) return true;

        // Debug: Ignore history if configured
        if (debugConfig.ignoreHistory) return true;

        const lastAskedVersion = askedQuestions[q.id] || 0;
        return q.version > lastAskedVersion;
      });

      if (debugConfig.verboseLogging) {
        console.log('[Wizard] Applicable questions (before filtering):', questionsToAsk.map(q => q.id));
      }

      // Debug: Start at specific question
      if (debugConfig.startAtQuestionId) {
        const startIndex = questionsToAsk.findIndex(q => q.id === debugConfig.startAtQuestionId);
        if (startIndex !== -1) {
          // If we start at a specific question, we assume previous ones are "done" for this run.
          // Or we just slice the array.
          questionsToAsk = questionsToAsk.slice(startIndex);
          if (debugConfig.verboseLogging) {
            console.log(`[Wizard] Starting at question '${debugConfig.startAtQuestionId}', skipping ${startIndex} questions.`);
          }
        } else {
            if (debugConfig.verboseLogging) {
                console.warn(`[Wizard] Start question '${debugConfig.startAtQuestionId}' not found in applicable list.`);
            }
        }
      }

      if (questionsToAsk.length === 0) {
        if (debugConfig.verboseLogging) {
            console.log('[Wizard] No questions to ask. Finishing.');
        }
        // Safety: If no questions are left, ensure we aren't stuck in 'inProgress' state.
        if (wasInProgress) {
            wizardState.setWizardInProgress(false);
        }
        // Clear debug config on finish
        wizardState.clearDebugConfig();
        onFinish();
      } else {
        // Interruption Recovery: If the wizard was quit mid-session, prepend the Resume screen.
        // We don't show Resume on the very first run (isFirstRun) to keep the onboarding clean.
        // Also disable resume if we are debugging (forcing a run).
        const isDebugRun = !!debugConfig.startAtQuestionId || debugConfig.skipHello || debugConfig.ignoreHistory;
        
        if (wasInProgress && !isFirstRun && !isDebugRun) {
            if (debugConfig.verboseLogging) {
                console.log('[Wizard] Resuming interrupted session.');
            }
            setQuestions([ResumeQuestion, ...questionsToAsk]);
        } else {
            if (debugConfig.verboseLogging) {
                console.log('[Wizard] Starting fresh session.');
            }
            setQuestions(questionsToAsk);
        }
        
        // Mark as in-progress immediately to catch potential crashes in the first question.
        wizardState.setWizardInProgress(true);
        setLoading(false);
      }
    };

    initWizard();
  }, []);

  const handleNext = async () => {
    const currentQuestion = questions[currentIndex];
    const debugConfig = wizardState.getDebugConfig();
    
    if (debugConfig.verboseLogging) {
      console.log(`[Wizard] Completing question: ${currentQuestion.id}`);
    }

    // Execute question-specific persistence logic.
    if (currentQuestion.apply) {
      await currentQuestion.apply(context);
    }
    
    // Safety: Persist progress IMMEDIATELY. 
    // This ensures that if the user quits on the next screen, this step is already "done".
    if (currentQuestion.id !== 'resume') {
        wizardState.setQuestionAsked(currentQuestion.id, currentQuestion.version);
        if (debugConfig.verboseLogging) {
            console.log(`[Wizard] Persisted question '${currentQuestion.id}' as asked (v${currentQuestion.version}).`);
        }
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      
      // Auto-apply defaults if enabled
      if (debugConfig.autoApplyDefaults) {
         // We need to wait a tick to let the state update and render the next question?
         // Actually, auto-applying defaults usually means skipping the UI interaction.
         // But the `apply` logic is often tied to the component state or user interaction.
         // The `apply` method in WizardQuestion interface takes the context.
         // If the question has a default behavior in `apply`, we could just call it.
         // However, most questions currently don't have an `apply` method that sets defaults without user input.
         // They rely on the component to set state in context.
         // Implementing true auto-apply would require refactoring questions to expose a `getDefaults` method.
         // For now, this feature might be limited or require manual clicking 'Next'.
         // Let's just log it for now as a limitation or future improvement.
         if (debugConfig.verboseLogging) {
            console.log('[Wizard] Auto-apply defaults is enabled but not fully supported for all question types yet.');
         }
      }
    } else {
      // Finalization: Clear the in-progress flag before handing control back to the app.
      wizardState.setWizardInProgress(false);
      wizardState.clearDebugConfig();
      if (debugConfig.verboseLogging) {
        console.log('[Wizard] All questions completed. Finishing.');
      }
      onFinish();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) return null;

  const CurrentQuestionComponent = questions[currentIndex].component;
  
  // UI Logic: Calculate progress while ignoring the Resume screen in the count.
  const isResume = questions[0].id === 'resume';
  const totalRealSteps = isResume ? questions.length - 1 : questions.length;
  const currentRealStep = isResume ? currentIndex : currentIndex + 1;
  const showCounter = !isResume || currentIndex > 0;

  return (
    <WizardShell
      currentStep={currentRealStep}
      totalSteps={totalRealSteps}
      canGoBack={currentIndex > 0}
      onBack={handleBack}
      showCounter={showCounter}
    >
      <CurrentQuestionComponent
        context={context}
        onNext={handleNext}
        onBack={handleBack}
        isLast={currentIndex === questions.length - 1}
      />
    </WizardShell>
  );
};
