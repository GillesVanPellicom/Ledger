import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Debtor } from '../types';

export const useEntities = () => {
  return useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      return await db.query<Debtor>('SELECT EntityID as DebtorID, EntityName as DebtorName, EntityIsActive as DebtorIsActive, CreationTimestamp, UpdatedAt FROM Entities ORDER BY EntityName ASC');
    },
    staleTime: 0,
    gcTime: 0,
  });
};

export const useActiveEntities = () => {
  return useQuery({
    queryKey: ['entities', 'active'],
    queryFn: async () => {
      return await db.query<Debtor>('SELECT EntityID as DebtorID, EntityName as DebtorName FROM Entities WHERE EntityIsActive = 1 ORDER BY EntityName');
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
