# Zustand Migration Analysis & Recommendations

This document outlines the current state of the Zustand implementation and provides a roadmap for completing the migration away from prop drilling and local state for global concerns.

## Current State

The application currently uses Zustand for managing three distinct areas of global state:

*   **`useSettingsStore`**: Manages application settings (theme, user preferences, data paths). This is well-implemented and serves as a good model.
*   **`useErrorStore`**: Manages the state of the global error modal.
*   **`useBackupStore`**: Manages the state of the backup process (e.g., `isBackingUp`).
*   **`useUIStore`**: Manages global UI state, such as the settings modal and sidebar collapse status.

The migration of global state to `useUIStore` is now complete.

## Analysis of Remaining Local State

A review of the codebase was conducted to identify any other potential candidates for migration to Zustand. The search focused on `useState` declarations related to modal visibility and other UI state.

The findings show that the remaining modal-related state is highly localized and not suitable for a global store:

*   **`ReceiptFormPage.tsx`**: This page manages several local modals (`splitTypeChangeModal`, `selectionModal`, `formatChangeModal`). This state is intrinsic to the complex logic of the form itself and is not needed anywhere else. Moving this to a global store would be an anti-pattern, as it would introduce unnecessary global state for a local concern.
*   **`EntityDetailsPage.tsx`**: This page manages the `unsettleConfirmation` modal. This state is also local to the page and does not need to be global.

## Conclusion

The Zustand migration is **complete and successful**. All *global* UI state has been centralized in the appropriate stores, primarily `useUIStore`, eliminating prop drilling and simplifying component APIs.

The remaining local state for modals and other page-specific UI elements is correctly managed within the components themselves, following best practices for local state management. No further migrations are recommended at this time.
