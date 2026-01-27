import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Receipt } from '../types';
import { format } from 'date-fns';
import { getReceipt, deleteReceipts as deleteReceiptsFromDb } from '../logic/expense';

// --- Queries ---

interface FetchReceiptsParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  debtEnabled?: boolean;
  debtFilter?: string;
  repaymentFilter?: string;
  typeFilter?: string;
  tentativeFilter?: string;
  attachmentFilter?: string;
}

interface FetchReceiptsResult {
  receipts: Receipt[];
  totalCount: number;
}

export const useReceipts = (params: FetchReceiptsParams) => {
  const {
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    debtEnabled,
    debtFilter,
    repaymentFilter,
    typeFilter,
    tentativeFilter,
    attachmentFilter
  } = params;

  const startDateKey = startDate?.toISOString() ?? null;
  const endDateKey = endDate?.toISOString() ?? null;

  return useQuery<FetchReceiptsResult>({
    queryKey: [
      'receipts',
      {
        page,
        pageSize,
        searchTerm,
        startDate: startDateKey,
        endDate: endDateKey,
        debtEnabled,
        debtFilter,
        repaymentFilter,
        typeFilter,
        tentativeFilter,
        attachmentFilter
      }
    ],
    queryFn: async () => {

      const offset = (page - 1) * pageSize;

      const queryParams: any[] = [];
      const whereClauses: string[] = [];

      // --- Base filters ---

      if (searchTerm) {
        const keywords = searchTerm
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(' ')
          .filter(Boolean);

        for (const keyword of keywords) {
          whereClauses.push(`(
            LOWER(s.EntityName) LIKE ? OR
            LOWER(r.ExpenseNote) LIKE ?
          )`);
          queryParams.push(`%${keyword}%`, `%${keyword}%`);
        }
      }

      if (startDate) {
        whereClauses.push(`r.ExpenseDate >= ?`);
        queryParams.push(format(startDate, 'yyyy-MM-dd'));
      }

      if (endDate) {
        whereClauses.push(`r.ExpenseDate <= ?`);
        queryParams.push(format(endDate, 'yyyy-MM-dd'));
      }

      if (typeFilter && typeFilter !== 'all') {
        whereClauses.push(`r.IsNonItemised = ?`);
        queryParams.push(typeFilter === 'total-only' ? 1 : 0);
      }

      if (tentativeFilter && tentativeFilter !== 'all') {
        whereClauses.push(`r.IsTentative = ?`);
        queryParams.push(tentativeFilter === 'tentative' ? 1 : 0);
      }

      // --- Attachment filter (efficient) ---

      if (attachmentFilter && attachmentFilter !== 'all') {
        if (attachmentFilter === 'yes') {
          whereClauses.push(`
            EXISTS (
              SELECT 1 FROM ExpenseImages ri
              WHERE ri.ExpenseID = r.ExpenseID
            )
          `);
        } else {
          whereClauses.push(`
            NOT EXISTS (
              SELECT 1 FROM ExpenseImages ri
              WHERE ri.ExpenseID = r.ExpenseID
            )
          `);
        }
      }

      // --- Debt filters ---

      if (debtEnabled && debtFilter && debtFilter !== 'all') {
        if (debtFilter === 'none') {
          whereClauses.push(`
            NOT EXISTS (
              SELECT 1 FROM ExpenseLineItems li
              WHERE li.ExpenseID = r.ExpenseID
                AND li.EntityID IS NOT NULL
            )
            AND NOT EXISTS (
              SELECT 1 FROM ExpenseSplits rs
              WHERE rs.ExpenseID = r.ExpenseID
            )
          `);
        }

        if (debtFilter === 'unpaid') {
          whereClauses.push(`
            EXISTS (
              SELECT 1
              FROM ExpenseEntityPayments ep
              WHERE ep.ExpenseID = r.ExpenseID
                AND ep.ExpenseEntityPaymentID IS NULL
            )
          `);
        }

        if (debtFilter === 'paid') {
          whereClauses.push(`
            EXISTS (
              SELECT 1 FROM ExpenseEntityPayments ep
              WHERE ep.ExpenseID = r.ExpenseID
            )
            AND NOT EXISTS (
              SELECT 1 FROM ExpenseEntityPayments ep2
              WHERE ep2.ExpenseID = r.ExpenseID
                AND ep2.ExpenseEntityPaymentID IS NULL
            )
          `);
        }
      }

      if (debtEnabled && repaymentFilter && repaymentFilter !== 'all') {
        if (repaymentFilter === 'none') {
          whereClauses.push(`r.OwedToEntityID IS NULL`);
        }

        if (repaymentFilter === 'unpaid') {
          whereClauses.push(`r.OwedToEntityID IS NOT NULL AND r.Status = 'unpaid'`);
        }

        if (repaymentFilter === 'paid') {
          whereClauses.push(`r.OwedToEntityID IS NOT NULL AND r.Status = 'paid'`);
        }
      }

      const whereSql = whereClauses.length
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      // ============================
      // Lightweight COUNT query
      // ============================

      const countQuery = `
        SELECT COUNT(*)
        FROM Expenses r
        JOIN Entities s ON r.RecipientID = s.EntityID
        LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
        ${whereSql}
      `;

      const countResult = await db.queryOne<{ count: number }>(
        countQuery,
        queryParams
      );

      const totalCount = countResult?.count ?? 0;

      // ============================
      // Main data query (optimized)
      // ============================

      const mainQuery = `
        SELECT
          r.ExpenseID AS ReceiptID,
          r.ExpenseDate AS ReceiptDate,
          r.ExpenseNote AS ReceiptNote,
          r.Discount,
          r.IsNonItemised,
          r.IsTentative,
          r.NonItemisedTotal,
          r.PaymentMethodID,
          r.OwedToEntityID,
          r.Status,
          s.EntityName AS StoreName,
          pm.PaymentMethodName,

          COUNT(DISTINCT ri.ExpenseImageID) AS AttachmentCount,

          CASE
            WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal
            ELSE
              IFNULL(SUM(li.LineQuantity * li.LineUnitPrice), 0)
              - IFNULL(
                  SUM(
                    CASE
                      WHEN li.IsExcludedFromDiscount = 0
                        OR li.IsExcludedFromDiscount IS NULL
                      THEN li.LineQuantity * li.LineUnitPrice
                      ELSE 0
                    END
                  ) * r.Discount / 100,
                  0
                )
          END AS Total

        FROM Expenses r
        JOIN Entities s ON r.RecipientID = s.EntityID
        LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
        LEFT JOIN ExpenseImages ri ON ri.ExpenseID = r.ExpenseID
        LEFT JOIN ExpenseLineItems li ON li.ExpenseID = r.ExpenseID

        ${whereSql}

        GROUP BY r.ExpenseID

        ORDER BY ReceiptDate DESC, ReceiptID DESC
        LIMIT ? OFFSET ?
      `;

      const finalParams = [...queryParams, pageSize, offset];

      const receipts = await db.query<Receipt>(mainQuery, finalParams);

      return { receipts, totalCount };
    },

    // debug mode – intentionally disabled cache
    staleTime: 0,
    gcTime: 0,
  });
};

export const useReceipt = (id: string | undefined) => {
  return useQuery({
    queryKey: ['receipt', id],
    queryFn: () => (id ? getReceipt(id) : null),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });
};

// --- Mutations ---

export const useDeleteReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => deleteReceiptsFromDb(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
      queryClient.invalidateQueries({ queryKey: ['debt'] });
    },
  });
};