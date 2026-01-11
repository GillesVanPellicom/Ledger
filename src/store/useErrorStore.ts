import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ErrorState {
  error: Error | null;
  isOpen: boolean;
  showError: (err: Error) => void;
  closeError: () => void;
}

export const useErrorStore = create<ErrorState>()(
  devtools(
    (set) => ({
      error: null,
      isOpen: false,
      showError: (err: Error) => {
        console.error("Global error handler caught:", err);
        set({ error: err, isOpen: true }, false, 'showError');
      },
      closeError: () => {
        set({ error: null, isOpen: false }, false, 'closeError');
      },
    }),
    { name: 'Error Store' }
  )
);
