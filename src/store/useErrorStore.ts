import { create } from 'zustand';

interface ErrorState {
  error: Error | null;
  isOpen: boolean;
  showError: (err: Error) => void;
  closeError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  error: null,
  isOpen: false,
  showError: (err: Error) => {
    console.error("Global error handler caught:", err);
    set({ error: err, isOpen: true });
  },
  closeError: () => {
    set({ error: null, isOpen: false });
  },
}));
