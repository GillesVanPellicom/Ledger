import { useQuery } from '@tanstack/react-query';
import { calculateDebts, ProcessedReceipt } from '../utils/debtCalculator';

interface DebtStats {
  debtToEntity: number;
  debtToMe: number;
  netBalance: number;
}

interface UseDebtCalculationResult {
  receipts: ProcessedReceipt[];
  stats: DebtStats;
  loading: boolean;
  refetch: () => void;
}

export const useDebtCalculation = (entityId: string | number): UseDebtCalculationResult => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['debt', entityId],
    queryFn: () => calculateDebts(entityId),
    enabled: !!entityId,
    staleTime: 1000 * 60, // 1 minute
  });

  return {
    receipts: data?.receipts || [],
    stats: {
      debtToEntity: data?.debtToEntity || 0,
      debtToMe: data?.debtToMe || 0,
      netBalance: data?.netBalance || 0,
    },
    loading: isLoading,
    refetch,
  };
};
