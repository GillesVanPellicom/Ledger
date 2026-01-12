import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isSidenavCollapsed: boolean;
  isSettingsModalOpen: boolean;
  settingsModalInitialTab: string;
  toggleSidenav: () => void;
  openSettingsModal: (tab?: string) => void;
  closeSettingsModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidenavCollapsed: false,
      isSettingsModalOpen: false,
      settingsModalInitialTab: 'appearance',
      toggleSidenav: () => set((state) => ({ isSidenavCollapsed: !state.isSidenavCollapsed })),
      openSettingsModal: (tab = 'appearance') => set({ isSettingsModalOpen: true, settingsModalInitialTab: tab }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),
    }),
    {
      name: 'ui-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({ isSidenavCollapsed: state.isSidenavCollapsed }), // only persist the sidebar state
    }
  )
);
