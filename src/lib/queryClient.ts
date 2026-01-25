import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { useErrorStore } from '../store/useErrorStore';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('Global Query Error:', error);
      useErrorStore.getState().showError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('Global Mutation Error:', error);
      useErrorStore.getState().showError(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
