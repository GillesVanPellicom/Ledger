import { useSettingsStore } from '../store/useSettingsStore';

export interface WizardDebugConfig {
  startAtQuestionId?: string;
  skipHello?: boolean;
  autoApplyDefaults?: boolean;
  verboseLogging?: boolean;
  ignoreHistory?: boolean;
}

const isDev = process.env.NODE_ENV === 'development';

/**
 * wizardState provides helper methods to interact with wizard-specific persistence.
 */
export const wizardState = {
  /**
   * Returns a map of questionId -> highestVersionAsked.
   */
  getAskedQuestions: (): Record<string, number> => {
    const settings = useSettingsStore.getState().settings;
    if (isDev) console.log('[wizardState] getAskedQuestions:', settings.wizard?.askedQuestions);
    return settings.wizard?.askedQuestions || {};
  },

  /**
   * Persists that a specific version of a question has been completed.
   */
  setQuestionAsked: (questionId: string, version: number) => {
    if (isDev) console.log(`[wizardState] setQuestionAsked: ${questionId} v${version}`);
    const store = useSettingsStore;
    const settings = store.getState().settings;
    const currentWizardState = settings.wizard || { askedQuestions: {}, inProgress: false };
    
    const newWizardState = {
      ...currentWizardState,
      askedQuestions: {
        ...currentWizardState.askedQuestions,
        [questionId]: version
      }
    };
    
    store.getState().updateSettings({ wizard: newWizardState });
  },

  /**
   * Checks if a wizard session was started but not finished.
   */
  isWizardInProgress: (): boolean => {
    const settings = useSettingsStore.getState().settings;
    if (isDev) console.log('[wizardState] isWizardInProgress:', settings.wizard?.inProgress);
    return settings.wizard?.inProgress || false;
  },

  /**
   * Sets the session status. 
   */
  setWizardInProgress: (inProgress: boolean) => {
    if (isDev) console.log(`[wizardState] setWizardInProgress: ${inProgress}`);
    const store = useSettingsStore;
    const settings = store.getState().settings;
    const currentWizardState = settings.wizard || { askedQuestions: {}, inProgress: false };
    
    const newWizardState = {
      ...currentWizardState,
      inProgress
    };
    
    store.getState().updateSettings({ wizard: newWizardState });
  },

  /**
   * Sets debug configuration for the next wizard run.
   */
  setDebugConfig: (config: WizardDebugConfig) => {
    if (isDev) console.log('[wizardState] setDebugConfig:', config);
    const store = useSettingsStore;
    const settings = store.getState().settings;
    const currentWizardState = settings.wizard || { askedQuestions: {}, inProgress: false };
    
    const newWizardState = {
      ...currentWizardState,
      debugConfig: config
    };
    
    store.getState().updateSettings({ wizard: newWizardState });
  },

  /**
   * Gets the debug configuration.
   */
  getDebugConfig: (): WizardDebugConfig => {
    const settings = useSettingsStore.getState().settings;
    return settings.wizard?.debugConfig || {};
  },

  /**
   * Clears the debug configuration.
   */
  clearDebugConfig: () => {
    if (isDev) console.log('[wizardState] clearDebugConfig');
    const store = useSettingsStore;
    const settings = store.getState().settings;
    const currentWizardState = settings.wizard || { askedQuestions: {}, inProgress: false };
    
    // We must explicitly set debugConfig to undefined because updateSettings performs a merge
    const newWizardState = {
      ...currentWizardState,
      debugConfig: undefined
    };
    
    store.getState().updateSettings({ wizard: newWizardState });
  }
};
