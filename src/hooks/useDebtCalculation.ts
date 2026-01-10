import { useState, useCallback } from 'react';
import { calculateDebts, ProcessedReceipt } from '../utils/debtCalculator';
import { useError } from '../context/ErrorContext';

interface DebtStats {
  debtToEntity: number;
  debtToMe: number;
  netBalance: number;
}

interface UseDebtCalculationResult {
  receipts: ProcessedReceipt[];
  stats: DebtStats;
  loading: boolean;
  calculate: (entityId: string | number) => Promise<void>;
}

export const useDebtCalculation = (): UseDebtCalculationResult => {
  const [receipts, setReceipts] = useState<ProcessedReceipt[]>([]);
  const [stats, setStats] = useState<DebtStats>({ debtToEntity: 0, debtToMe: 0, netBalance: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const { showError } = useError();

  const calculate = useCallback(async (entityId: string | number) => {
    setLoading(true);
    try {
      const result = await calculateDebts(entityId);
      setReceipts(result.receipts);
      setStats({
        debtToEntity: result.debtToEntity,
        debtToMe: result.debtToMe,
        netBalance: result.netBalance
      });
    } catch (error) {
      showError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  return { receipts, stats, loading, calculate };
};
