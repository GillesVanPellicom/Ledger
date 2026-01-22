import { Settings } from '../types';

/**
 * WizardContext is the interface provided to each WizardQuestion component.
 * 
 * Design Intent:
 * - Provide a restricted view of the application state.
 * - Allow questions to update settings in a way that is consistent with the wizard's lifecycle.
 * - Safety: Questions should use this context instead of importing global stores directly
 *   to ensure they remain decoupled and testable within the wizard shell.
 */
export interface WizardContext {
  /** Current application settings (may be partially populated during wizard). */
  settings: Partial<Settings>;
  /** 
   * Updates settings immediately. 
   * Note: WizardController also handles persisting the "asked" status of the question.
   */
  updateSettings: (newSettings: Partial<Settings>) => void;
}
