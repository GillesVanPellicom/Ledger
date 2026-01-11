import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Product, Store } from '../types';

// --- Products ---

interface FetchProductsParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
}

export const useProducts = (params: FetchProductsParams) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const offset = (params.page - 1) * params.pageSize;
      let query = `
        SELECT p.*, u.ProductUnitType 
        FROM Products p
        LEFT JOIN ProductUnits u ON p.ProductUnitID = u.ProductUnitID
        WHERE p.ProductIsActive = 1
      `;
      const queryParams: any[] = [];
      
      if (params.searchTerm) {
        const keywords = params.searchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0);
        if (keywords.length > 0) {
          const conditions = keywords.map(() => `(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.ProductName), 'é', 'e'), 'è', 'e'), 'ë', 'e'), 'á', 'a'), 'à', 'a'), 'ä', 'a') LIKE ? 
            OR 
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.ProductBrand), 'é', 'e'), 'è', 'e'), 'ë', 'e'), 'á', 'a'), 'à', 'a'), 'ä', 'a') LIKE ?
          )`).join(' AND ');
          
          query += ` AND (${conditions})`;
          keywords.forEach(k => {
            const term = `%${k}%`;
            queryParams.push(term, term);
          });
        }
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT p.*, u.ProductUnitType', 'SELECT p.ProductID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;
      
      query += ` ORDER BY p.ProductName ASC LIMIT ? OFFSET ?`;
      queryParams.push(params.pageSize, offset);
      
      const products = await db.query<Product>(query, queryParams);
      return { products, totalCount };
    },
  });
};

// --- Stores ---

interface FetchStoresParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
}

export const useStores = (params: FetchStoresParams) => {
  return useQuery({
    queryKey: ['stores', params],
    queryFn: async () => {
      const offset = (params.page - 1) * params.pageSize;
      let query = `SELECT * FROM Stores`;
      const queryParams: any[] = [];
      
      if (params.searchTerm) {
        query += ` WHERE StoreName LIKE ?`;
        queryParams.push(`%${params.searchTerm}%`);
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT StoreID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;
      
      query += ` ORDER BY StoreName ASC LIMIT ? OFFSET ?`;
      queryParams.push(params.pageSize, offset);
      
      const stores = await db.query<Store>(query, queryParams);
      return { stores, totalCount };
    },
  });
};

export const useActiveStores = () => {
  return useQuery({
    queryKey: ['stores', 'active'],
    queryFn: async () => {
      return await db.query<Store>('SELECT StoreID, StoreName FROM Stores WHERE StoreIsActive = 1 ORDER BY StoreName');
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// --- Mutations ---

export const useInvalidateReferenceData = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['stores'] });
  };
};
