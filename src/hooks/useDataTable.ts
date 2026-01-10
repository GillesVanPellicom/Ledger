import { useState, useCallback, useEffect } from 'react';
import { db } from '../utils/db';

interface UseDataTableOptions<T> {
  tableName: string;
  defaultPageSize?: number;
  searchColumns?: string[];
  baseQuery?: string;
  countQuery?: string;
  defaultSort?: string;
  processData?: (data: any[]) => T[];
  additionalParams?: any[];
}

interface UseDataTableResult<T> {
  data: T[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearchTerm: (term: string) => void;
  refresh: () => void;
}

export function useDataTable<T>({
  tableName,
  defaultPageSize = 10,
  searchColumns = [],
  baseQuery,
  countQuery,
  defaultSort,
  processData,
  additionalParams = []
}: UseDataTableOptions<T>): UseDataTableResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      let query = baseQuery || `SELECT * FROM ${tableName}`;
      const params: any[] = [...additionalParams];

      if (searchTerm && searchColumns.length > 0) {
        const searchConditions = searchColumns.map(col => `${col} LIKE ?`).join(' OR ');
        if (query.toLowerCase().includes('where')) {
          query += ` AND (${searchConditions})`;
        } else {
          query += ` WHERE (${searchConditions})`;
        }
        searchColumns.forEach(() => params.push(`%${searchTerm}%`));
      }

      let finalCountQuery = countQuery;
      if (!finalCountQuery) {
          // Simple heuristic to generate count query if not provided
          // This might need adjustment for complex queries
          if (baseQuery) {
             finalCountQuery = `SELECT COUNT(*) as count FROM (${query})`;
          } else {
             finalCountQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
             if (searchTerm && searchColumns.length > 0) {
                 const searchConditions = searchColumns.map(col => `${col} LIKE ?`).join(' OR ');
                 finalCountQuery += ` WHERE (${searchConditions})`;
             }
          }
      }

      // If we are using a custom baseQuery, we need to be careful about params for count query
      // The params for count query should match the WHERE clause params
      // If baseQuery is used, additionalParams are already in params array.
      // If searchTerm is used, those params are also pushed.
      // So we can reuse `params` for count query if it wraps the main query or duplicates the where clause.

      // However, for complex baseQueries, it's safer if the user provides a countQuery that matches the baseQuery structure
      // or we wrap the query as a subquery for counting.

      // Strategy: If countQuery is NOT provided, wrap the constructed query (without limit/offset) in a count select.
      if (!countQuery) {
          finalCountQuery = `SELECT COUNT(*) as count FROM (${query})`;
      }

      const countResult = await db.queryOne<{ count: number }>(finalCountQuery!, params);
      setTotalCount(countResult ? countResult.count : 0);
      
      if (defaultSort && !query.toLowerCase().includes('order by')) {
        query += ` ORDER BY ${defaultSort}`;
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
      
      const results = await db.query<any[]>(query, params);
      setData(processData ? processData(results) : results as T[]);
    } catch (error) {
      console.error(`Failed to fetch data for ${tableName}:`, error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, tableName, baseQuery, countQuery, defaultSort, processData, JSON.stringify(additionalParams), JSON.stringify(searchColumns)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    totalCount,
    currentPage,
    pageSize,
    searchTerm,
    setCurrentPage,
    setPageSize,
    setSearchTerm,
    refresh: fetchData
  };
}
