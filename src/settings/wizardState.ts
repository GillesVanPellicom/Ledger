import { useSettingsStore } from '../store/useSettingsStore';

export interface WizardDebugConfig {
  startAtQuestionId?: string;
  skipHello?: boolean;
  autoApplyDefaults?: boolean;
  verboseLogging?: boolean;
  ignoreHistory?: boolean;
}

/**
 * wizardState provides helper methods to interact with wizard-specific persistence.
 * 
 * Design Intent:
 * - Centralize the logic for tracking asked questions and session status.
 * - Abstract the underlying storage (currently electron-store via useSettingsStore).
 * 
 * Usage:
 * - Should be used by WizardController to manage flow.
 * - Should NOT be used by individual questions (they use WizardContext).
 */
export const wizardState = {
  /**
   * Returns a map of questionId -> highestVersionAsked.
   */
  getAskedQuestions: (): Record<string, number> => {
    const settings = useSettingsStore.getState().settings;
    return (settings as any).wizard?.askedQuestions || {};
  },

  /**
   * Persists that a specific version of a question has been completed.
   * Safety: This is called immediately after 'Next' is clicked.
   */
  setQuestionAsked: (questionId: string, version: number) => {
    const store = useSettingsStore;
    const settings = store.getState().settings;
    const currentWizardState = (settings as any).wizard || { askedQuestions: {}, inProgress: false };
    
    const newWizardState = {
      ...currentWizardState,
      askedQuestions: {
        ...currentWizardState.askedQuestions,
        [questionId]: version
      }
    };
    
    store.getState().updateSettings({ wizard: newWizardState } as any);
  },

  /**
   * Checks if a wizard session was started but not finished.
   */
  isWizardInProgress: (): boolean => {
    const settings = useSettingsStore.getState().settings;
    return (settings as any).wizard?.inProgress || false;
  },

  /**
   * Sets the session status. 
   * Design Intent: 
   * - Set to true when WizardController mounts with questions.
   * - Set to false only when 'Finish' is clicked or no questions remain.
   */
  setWizardInProgress: (inProgress: boolean) => {
    const store = useSettingsStore;
    const settings = store.getState().settings;
    const currentWizardState = (settings as any).wizard || { askedQuestions: {}, inProgress: false };
    
    const newWizardState = {
      ...currentWizardState,
      inProgress
    };
    
    store.getState().updateSettings({ wizard: newWizardState } as any);
  },

  /**
   * Sets debug configuration for the next wizard run.
   */
  setDebugConfig: (config: WizardDebugConfig) => {
    const store = useSettingsStore;
    const settings = store.getState().settings;
    const currentWizardState = (settings as any).wizard || { askedQuestions: {}, inProgress: false };
    
    const newWizardState = {
      ...currentWizardState,
      debugConfig: config
    };
    
    store.getState().updateSettings({ wizard: newWizardState } as any);
  },

  /**
   * Gets the debug configuration.
   */
  getDebugConfig: (): WizardDebugConfig => {
    const settings = useSettingsStore.getState().settings;
    return (settings as any).wizard?.debugConfig || {};
  },

  /**
   * Clears the debug configuration.
   */
  clearDebugConfig: () => {
    const store = useSettingsStore;
    const settings = store.getState().settings;
    const currentWizardState = (settings as any).wizard || { askedQuestions: {}, inProgress: false };
    
    const { debugConfig, ...rest } = currentWizardState;
    
    store.getState().updateSettings({ wizard: rest } as any);
  }
};
