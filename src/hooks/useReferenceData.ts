import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Product, Store, Category } from '../types';

// --- Products ---

interface FetchProductsParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  enabled?: boolean;
}

export const useProducts = (params: FetchProductsParams) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const offset = (params.page - 1) * params.pageSize;
      let query = `
        SELECT p.*, u.ProductUnitType, c.CategoryName
        FROM Products p
        LEFT JOIN ProductUnits u ON p.ProductUnitID = u.ProductUnitID
        LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
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
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT p.*, u.ProductUnitType, c.CategoryName', 'SELECT p.ProductID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;
      
      query += ` ORDER BY p.ProductName ASC LIMIT ? OFFSET ?`;
      queryParams.push(params.pageSize, offset);
      
      const products = await db.query<Product>(query, queryParams);
      return { products, totalCount };
    },
    staleTime: 0,
    gcTime: 0,
    enabled: params.enabled !== false,
  });
};

// --- Stores ---

interface FetchStoresParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  enabled?: boolean;
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
    staleTime: 0,
    gcTime: 0,
    enabled: params.enabled !== false,
  });
};

export const useActiveStores = () => {
  return useQuery({
    queryKey: ['stores', 'active'],
    queryFn: async () => {
      return await db.query<Store>('SELECT StoreID, StoreName FROM Stores WHERE StoreIsActive = 1 ORDER BY StoreName');
    },
    staleTime: 0,
    gcTime: 0,
  });
};

// --- Categories ---

interface FetchCategoriesParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  enabled?: boolean;
}

export const useCategories = (params: FetchCategoriesParams) => {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: async () => {
      const offset = (params.page - 1) * params.pageSize;
      let query = `SELECT * FROM Categories`;
      const queryParams: any[] = [];
      
      if (params.searchTerm) {
        query += ` WHERE CategoryName LIKE ?`;
        queryParams.push(`%${params.searchTerm}%`);
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT CategoryID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;
      
      query += ` ORDER BY CategoryName ASC LIMIT ? OFFSET ?`;
      queryParams.push(params.pageSize, offset);
      
      const categories = await db.query<Category>(query, queryParams);
      return { categories, totalCount };
    },
    staleTime: 0,
    gcTime: 0,
    enabled: params.enabled !== false,
  });
};

export const useActiveCategories = () => {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      return await db.query<Category>('SELECT CategoryID, CategoryName FROM Categories WHERE CategoryIsActive = 1 ORDER BY CategoryName');
    },
    staleTime: 0,
    gcTime: 0,
  });
};

// --- Income Categories ---

export const useIncomeCategories = (params: FetchCategoriesParams) => {
  return useQuery({
    queryKey: ['incomeCategories', params],
    queryFn: async () => {
      const offset = (params.page - 1) * params.pageSize;
      let query = `SELECT * FROM IncomeCategories`;
      const queryParams: any[] = [];
      
      if (params.searchTerm) {
        query += ` WHERE IncomeCategoryName LIKE ?`;
        queryParams.push(`%${params.searchTerm}%`);
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT IncomeCategoryID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;
      
      query += ` ORDER BY IncomeCategoryName ASC LIMIT ? OFFSET ?`;
      queryParams.push(params.pageSize, offset);
      
      const categories = await db.query<any>(query, queryParams);
      return { categories, totalCount };
    },
    staleTime: 0,
    gcTime: 0,
    enabled: params.enabled !== false,
  });
};

// --- Income Sources ---

export const useIncomeSources = (params: FetchCategoriesParams) => {
  return useQuery({
    queryKey: ['incomeSources', params],
    queryFn: async () => {
      const offset = (params.page - 1) * params.pageSize;
      let query = `SELECT * FROM IncomeSources`;
      const queryParams: any[] = [];
      
      if (params.searchTerm) {
        query += ` WHERE IncomeSourceName LIKE ?`;
        queryParams.push(`%${params.searchTerm}%`);
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT IncomeSourceID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;
      
      query += ` ORDER BY IncomeSourceName ASC LIMIT ? OFFSET ?`;
      queryParams.push(params.pageSize, offset);
      
      const sources = await db.query<any>(query, queryParams);
      return { sources, totalCount };
    },
    staleTime: 0,
    gcTime: 0,
    enabled: params.enabled !== false,
  });
};

// --- Mutations ---

export const useInvalidateReferenceData = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['stores'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['incomeCategories'] });
    queryClient.invalidateQueries({ queryKey: ['incomeSources'] });
  };
};
