import { create } from 'zustand';

interface IncomeStore {
  toCheckCount: number;
  setToCheckCount: (count: number) => void;
}

export const useIncomeStore = create<IncomeStore>((set) => ({
  toCheckCount: 0,
  setToCheckCount: (count) => set({ toCheckCount: count }),
}));
