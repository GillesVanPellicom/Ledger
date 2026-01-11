import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { PaymentMethod } from '../types';

export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      return await db.query<PaymentMethod>('SELECT * FROM PaymentMethods');
    },
  });
};

export const useActivePaymentMethods = () => {
  return useQuery({
    queryKey: ['paymentMethods', 'active'],
    queryFn: async () => {
      return await db.query<{ PaymentMethodID: number, PaymentMethodName: string }>('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName');
    },
  });
};

export const usePaymentMethodBalance = (methodId: number, initialFunds: number) => {
  return useQuery({
    queryKey: ['paymentMethodBalance', methodId],
    queryFn: async () => {
      const expensesResult = await db.queryOne<{ total: number }>('SELECT SUM(li.LineQuantity * li.LineUnitPrice) as total FROM LineItems li JOIN Receipts r ON li.ReceiptID = r.ReceiptID WHERE r.PaymentMethodID = ? AND r.IsTentative = 0', [methodId]);
      const topupsResult = await db.queryOne<{ total: number }>('SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?', [methodId]);
      const expenses = expensesResult?.total || 0;
      const topups = topupsResult?.total || 0;
      return initialFunds + topups - expenses;
    },
  });
};

export const useInvalidatePaymentMethods = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
  };
};
