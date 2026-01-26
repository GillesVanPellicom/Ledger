import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ReceiptsState {
  activeTab: 'overview' | 'to-check' | 'scheduled';
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  appliedDateRange: [string | null, string | null];
  appliedFilters: {
    type: string;
    debt: string;
    expenseType: string;
    tentative: string;
    attachment: string;
    recipient: string;
    category: string;
    incomeEntity: string;
    debtor: string;
    fromMethod: string;
    toMethod: string;
    method: string;
  };
  setFilters: (filters: Partial<ReceiptsState['appliedFilters']>) => void;
  setDateRange: (range: [string | null, string | null]) => void;
  setSearchTerm: (term: string) => void;
  setActiveTab: (tab: 'overview' | 'to-check' | 'scheduled') => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetFilters: () => void;
}

const initialFilters = {
  type: 'all',
  debt: 'all',
  expenseType: 'all',
  tentative: 'all',
  attachment: 'all',
  recipient: 'all',
  category: 'all',
  incomeEntity: 'all',
  debtor: 'all',
  fromMethod: 'all',
  toMethod: 'all',
  method: 'all',
};

export const useReceiptsStore = create<ReceiptsState>()(
  persist(
    (set) => ({
      activeTab: 'overview',
      currentPage: 1,
      pageSize: 10,
      searchTerm: '',
      appliedDateRange: [null, null],
      appliedFilters: initialFilters,
      setFilters: (filters) => set((state) => ({ appliedFilters: { ...state.appliedFilters, ...filters } })),
      setDateRange: (range) => set({ appliedDateRange: range }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set({ pageSize: size }),
      resetFilters: () => set({
        appliedFilters: initialFilters,
        appliedDateRange: [null, null],
        searchTerm: '',
        currentPage: 1
      }),
    }),
    {
      name: 'receipts-storage',
    }
  )
);
