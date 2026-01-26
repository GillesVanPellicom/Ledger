import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Product, Category, Entity } from '../types';

export const REFERENCE_DATA_STALE_TIME = 1000 * 60 * 5; // 5 minutes

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
    staleTime: REFERENCE_DATA_STALE_TIME,
    enabled: params.enabled !== false,
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
    staleTime: REFERENCE_DATA_STALE_TIME,
    enabled: params.enabled !== false,
  });
};

export const useActiveCategories = () => {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      return await db.query<Category>('SELECT CategoryID, CategoryName FROM Categories WHERE CategoryIsActive = 1 ORDER BY CategoryName');
    },
    staleTime: REFERENCE_DATA_STALE_TIME,
  });
};

// --- Entities ---

interface FetchEntitiesParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  hideZeroBalance?: boolean;
}

export const useEntities = (params: FetchEntitiesParams) => {
  return useQuery({
    queryKey: ['entities', params],
    queryFn: async () => {
      const offset = (params.page - 1) * params.pageSize;
      let query = `
        SELECT d.EntityID, d.EntityName, d.EntityIsActive, d.CreationTimestamp, d.UpdatedAt,
               (SELECT IFNULL(SUM(tu.IncomeAmount), 0) FROM Income tu JOIN ExpenseEntityPayments rdp ON tu.IncomeID = rdp.IncomeID WHERE rdp.EntityID = d.EntityID) as TotalPaidToMe,
               (SELECT IFNULL(SUM(CASE WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal ELSE (SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM ExpenseLineItems li WHERE li.ExpenseID = r.ExpenseID) END), 0) FROM Expenses r WHERE r.OwedToEntityID = d.EntityID) as TotalIOwe
        FROM Entities d
      `;
      const queryParams: any[] = [];
      
      if (params.searchTerm) {
        query += ` WHERE d.EntityName LIKE ?`;
        queryParams.push(`%${params.searchTerm}%`);
      }
      
      if (params.hideZeroBalance) {
        query = `SELECT * FROM (${query}) WHERE (TotalPaidToMe - TotalIOwe) != 0`;
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;
      
      query += ` ORDER BY EntityName ASC LIMIT ? OFFSET ?`;
      queryParams.push(params.pageSize, offset);
      
      const entities = await db.query<any>(query, queryParams);
      
      // Calculate NetBalance for each entity
      const entitiesWithBalance = entities.map((e: any) => ({
        ...e,
        NetBalance: e.TotalPaidToMe - e.TotalIOwe
      }));

      return { entities: entitiesWithBalance, totalCount };
    },
    staleTime: REFERENCE_DATA_STALE_TIME,
  });
};

export const useActiveEntities = () => {
  return useQuery({
    queryKey: ['entities', 'active'],
    queryFn: async () => {
      return await db.query<{ EntityID: number; EntityName: string }>(
        'SELECT EntityID, EntityName FROM Entities WHERE EntityIsActive = 1 ORDER BY EntityName'
      );
    },
    staleTime: REFERENCE_DATA_STALE_TIME,
  });
};

// --- Mutations ---

export const useInvalidateReferenceData = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['entities'] });
  };
};
