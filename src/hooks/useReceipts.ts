import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Receipt, LineItem } from '../types';
import { format } from 'date-fns';

interface FetchReceiptsParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  debtEnabled?: boolean;
}

interface FetchReceiptsResult {
  receipts: Receipt[];
  totalCount: number;
}

export const useReceipts = (params: FetchReceiptsParams) => {
  return useQuery<FetchReceiptsResult>({
    queryKey: ['receipts', params],
    queryFn: async () => {
      const offset = (params.page - 1) * params.pageSize;
      let debtSubQueries = '';
      if (params.debtEnabled) {
        debtSubQueries = `,
          r.Status,
          (
            SELECT COUNT(DISTINCT d.DebtorID)
            FROM Debtors d
            WHERE (
              (r.SplitType = 'line_item' AND d.DebtorID IN (SELECT li.DebtorID FROM LineItems li WHERE li.ReceiptID = r.ReceiptID)) OR
              (r.SplitType = 'total_split' AND d.DebtorID IN (SELECT rs.DebtorID FROM ReceiptSplits rs WHERE rs.ReceiptID = r.ReceiptID))
            )
          ) as TotalDebtorCount,
          (
            SELECT COUNT(DISTINCT d.DebtorID)
            FROM Debtors d
            LEFT JOIN ReceiptDebtorPayments rdp ON d.DebtorID = rdp.DebtorID AND rdp.ReceiptID = r.ReceiptID
            WHERE rdp.PaymentID IS NULL AND (
              (r.SplitType = 'line_item' AND d.DebtorID IN (SELECT li.DebtorID FROM LineItems li WHERE li.ReceiptID = r.ReceiptID)) OR
              (r.SplitType = 'total_split' AND d.DebtorID IN (SELECT rs.DebtorID FROM ReceiptSplits rs WHERE rs.ReceiptID = r.ReceiptID))
            )
          ) as UnpaidDebtorCount
        `;
      }

      let query = `
          SELECT r.ReceiptID,
                 r.ReceiptDate,
                 r.ReceiptNote,
                 r.Discount,
                 r.IsNonItemised,
                 r.IsTentative,
                 r.NonItemisedTotal,
                 s.StoreName,
                 pm.PaymentMethodName,
                 CASE
                     WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal
                     ELSE (
                         (SELECT SUM(li.LineQuantity * li.LineUnitPrice)
                          FROM LineItems li
                          WHERE li.ReceiptID = r.ReceiptID) -
                         IFNULL((SELECT SUM(li_discountable.LineQuantity * li_discountable.LineUnitPrice)
                                 FROM LineItems li_discountable
                                 WHERE li_discountable.ReceiptID = r.ReceiptID
                                   AND (li_discountable.IsExcludedFromDiscount = 0 OR
                                        li_discountable.IsExcludedFromDiscount IS NULL)), 0) * r.Discount / 100
                         )
                     END as Total
              ${debtSubQueries}
          FROM Receipts r
                   JOIN Stores s ON r.StoreID = s.StoreID
                   LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
      `;
      const queryParams: any[] = [];
      const whereClauses: string[] = [];

      if (params.searchTerm) {
        const keywords = params.searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
        keywords.forEach(keyword => {
          whereClauses.push(`(
            LOWER(s.StoreName) LIKE ? OR 
            LOWER(r.ReceiptNote) LIKE ?
          )`);
          queryParams.push(`%${keyword}%`, `%${keyword}%`);
        });
      }

      if (params.startDate) {
        whereClauses.push(`r.ReceiptDate >= ?`);
        queryParams.push(format(params.startDate, 'yyyy-MM-dd'));
      }
      if (params.endDate) {
        whereClauses.push(`r.ReceiptDate <= ?`);
        queryParams.push(format(params.endDate, 'yyyy-MM-dd'));
      }

      if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;

      const countQuery = `SELECT COUNT(*) as count
                          FROM (${query.replace(/SELECT r.ReceiptID,.*?as Total/s, 'SELECT r.ReceiptID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;

      query += ` ORDER BY r.ReceiptDate DESC, r.ReceiptID DESC LIMIT ? OFFSET ?`;
      queryParams.push(params.pageSize, offset);

      const receipts = await db.query<Receipt>(query, queryParams);
      return { receipts, totalCount };
    },
  });
};

export const useDeleteReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const placeholders = ids.map(() => '?').join(',');
      await db.execute(`DELETE FROM Receipts WHERE ReceiptID IN (${placeholders})`, ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};
