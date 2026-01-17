import { useQuery } from '@tanstack/react-query';
import { calculateDebts, ProcessedReceipt, calculateDebtsForReceipt, DebtSummary } from '../logic/debt/debtLogic';
import { db } from '../lib/db';
import { Receipt, LineItem, ReceiptSplit, ReceiptDebtorPayment } from '../types';

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

export const useReceiptDebtCalculation = (receiptId: string | number, receipt: Receipt, lineItems: LineItem[], receiptSplits: ReceiptSplit[], payments: ReceiptDebtorPayment[]) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['receiptDebt', receiptId],
    queryFn: () => calculateDebtsForReceipt(receiptId, receipt, lineItems, receiptSplits, payments),
    enabled: !!receiptId && !!receipt && !!lineItems && !!receiptSplits && !!payments,
  });

  return {
    debtSummary: data,
    loading: isLoading,
    refetch,
  };
};
