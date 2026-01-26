import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InstanceState {
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  appliedDateRange: [string | null, string | null];
  appliedFilters: {
    type: string;
    debt: string;
    repayment: string;
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
}

interface ReceiptsState extends InstanceState {
  activeTab: 'overview' | 'to-check' | 'scheduled';
  instances: Record<string, InstanceState>;
  
  setFilters: (filters: Partial<InstanceState['appliedFilters']>, instanceId?: string) => void;
  setDateRange: (range: [string | null, string | null], instanceId?: string) => void;
  setSearchTerm: (term: string, instanceId?: string) => void;
  setActiveTab: (tab: 'overview' | 'to-check' | 'scheduled') => void;
  setCurrentPage: (page: number, instanceId?: string) => void;
  setPageSize: (size: number, instanceId?: string) => void;
  resetFilters: (instanceId?: string) => void;
}

const initialFilters = {
  type: 'all',
  debt: 'all',
  repayment: 'all',
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

const initialInstanceState: InstanceState = {
  currentPage: 1,
  pageSize: 10,
  searchTerm: '',
  appliedDateRange: [null, null],
  appliedFilters: initialFilters,
};

export const useReceiptsStore = create<ReceiptsState>()(
  persist(
    (set, get) => ({
      activeTab: 'overview',
      ...initialInstanceState,
      instances: {},

      setFilters: (filters, instanceId) => {
        if (!instanceId) {
          set((state) => ({ appliedFilters: { ...state.appliedFilters, ...filters } }));
        } else {
          const instances = { ...get().instances };
          const instance = instances[instanceId] || { ...initialInstanceState };
          instances[instanceId] = { ...instance, appliedFilters: { ...instance.appliedFilters, ...filters } };
          set({ instances });
        }
      },

      setDateRange: (range, instanceId) => {
        if (!instanceId) {
          set({ appliedDateRange: range });
        } else {
          const instances = { ...get().instances };
          const instance = instances[instanceId] || { ...initialInstanceState };
          instances[instanceId] = { ...instance, appliedDateRange: range };
          set({ instances });
        }
      },

      setSearchTerm: (term, instanceId) => {
        if (!instanceId) {
          set({ searchTerm: term });
        } else {
          const instances = { ...get().instances };
          const instance = instances[instanceId] || { ...initialInstanceState };
          instances[instanceId] = { ...instance, searchTerm: term };
          set({ instances });
        }
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      setCurrentPage: (page, instanceId) => {
        if (!instanceId) {
          set({ currentPage: page });
        } else {
          const instances = { ...get().instances };
          const instance = instances[instanceId] || { ...initialInstanceState };
          instances[instanceId] = { ...instance, currentPage: page };
          set({ instances });
        }
      },

      setPageSize: (size, instanceId) => {
        if (!instanceId) {
          set({ pageSize: size });
        } else {
          const instances = { ...get().instances };
          const instance = instances[instanceId] || { ...initialInstanceState };
          instances[instanceId] = { ...instance, pageSize: size };
          set({ instances });
        }
      },

      resetFilters: (instanceId) => {
        if (!instanceId) {
          set({
            appliedFilters: initialFilters,
            appliedDateRange: [null, null],
            searchTerm: '',
            currentPage: 1
          });
        } else {
          const instances = { ...get().instances };
          instances[instanceId] = { ...initialInstanceState };
          set({ instances });
        }
      },
    }),
    {
      name: 'receipts-storage',
    }
  )
);
