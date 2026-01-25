import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { PaymentMethod } from '../types';
import { calculatePaymentMethodBalance } from '../logic/paymentLogic';

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
      return await calculatePaymentMethodBalance(methodId, initialFunds);
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
