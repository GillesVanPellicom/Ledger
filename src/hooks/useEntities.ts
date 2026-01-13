import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Debtor } from '../types';

export const useEntities = () => {
  return useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      return await db.query<Debtor>('SELECT * FROM Debtors ORDER BY DebtorName ASC');
    },
    staleTime: 0,
    gcTime: 0,
  });
};

export const useActiveEntities = () => {
  return useQuery({
    queryKey: ['entities', 'active'],
    queryFn: async () => {
      return await db.query<Debtor>('SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsActive = 1 ORDER BY DebtorName');
    },
    staleTime: 0,
    gcTime: 0,
  });
};

export const useInvalidateEntities = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['entities'] });
  };
};
