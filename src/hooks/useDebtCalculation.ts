import { useQuery } from '@tanstack/react-query';
import { calculateDebts, ProcessedReceipt, calculateDebtsForReceipt, DebtSummary } from '../logic/debt/debtLogic';
import { db } from '../utils/db';
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
    staleTime: 0, // Ensure we always get fresh data
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

export const useReceiptDebtCalculation = (receiptId: string | undefined, receipt: Receipt | undefined, lineItems: LineItem[] | undefined, receiptSplits: ReceiptSplit[] | undefined, payments: ReceiptDebtorPayment[] | undefined) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['receiptDebt', receiptId, payments?.length], // Include payments length to trigger re-fetch on payment changes
    queryFn: () => {
      if (!receiptId || !receipt || !lineItems || !receiptSplits || !payments) {
        return Promise.resolve({ debtors: [], ownShare: null });
      }
      return calculateDebtsForReceipt(receiptId, receipt, lineItems, receiptSplits, payments);
    },
    enabled: !!receiptId && !!receipt && !!lineItems && !!receiptSplits && !!payments,
    staleTime: 0,
  });

  return {
    debtSummary: data,
    loading: isLoading,
    refetch,
  };
};
