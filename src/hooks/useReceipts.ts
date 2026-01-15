import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Receipt, LineItem, ReceiptImage, ReceiptSplit, ReceiptDebtorPayment } from '../types';
import { format } from 'date-fns';

// --- Queries ---

interface FetchReceiptsParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  debtEnabled?: boolean;
  debtFilter?: string;
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
    typeFilter,
    tentativeFilter,
    attachmentFilter
  } = params;

  return useQuery<FetchReceiptsResult>({
    queryKey: ['receipts', { page, pageSize, searchTerm, startDate, endDate, debtEnabled, debtFilter, typeFilter, tentativeFilter, attachmentFilter }],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;

      let subQuerySelect = `
        SELECT r.ReceiptID,
               r.ReceiptDate,
               r.ReceiptNote,
               r.Discount,
               r.IsNonItemised,
               r.IsTentative,
               r.NonItemisedTotal,
               s.StoreName,
               pm.PaymentMethodName,
               (SELECT COUNT(*) FROM ReceiptImages ri WHERE ri.ReceiptID = r.ReceiptID) as AttachmentCount,
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
      `;

      if (debtEnabled) {
        subQuerySelect += `,
          r.Status,
          (
            SELECT COUNT(DISTINCT d.DebtorID)
            FROM Debtors d
            WHERE (
              (r.SplitType = 'line_item' AND d.DebtorID IN (SELECT li.DebtorID FROM LineItems li WHERE li.ReceiptID = r.ReceiptID AND li.DebtorID IS NOT NULL)) OR
              (r.SplitType = 'total_split' AND d.DebtorID IN (SELECT rs.DebtorID FROM ReceiptSplits rs WHERE rs.ReceiptID = r.ReceiptID))
            )
          ) as TotalDebtorCount,
          (
            SELECT COUNT(DISTINCT d.DebtorID)
            FROM Debtors d
            LEFT JOIN ReceiptDebtorPayments rdp ON d.DebtorID = rdp.DebtorID AND rdp.ReceiptID = r.ReceiptID
            WHERE rdp.PaymentID IS NULL AND (
              (r.SplitType = 'line_item' AND d.DebtorID IN (SELECT li.DebtorID FROM LineItems li WHERE li.ReceiptID = r.ReceiptID AND li.DebtorID IS NOT NULL)) OR
              (r.SplitType = 'total_split' AND d.DebtorID IN (SELECT rs.DebtorID FROM ReceiptSplits rs WHERE rs.ReceiptID = r.ReceiptID))
            )
          ) as UnpaidDebtorCount
        `;
      }

      let subQueryFrom = `
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
        LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
      `;

      const queryParams: any[] = [];
      const subQueryWhereClauses: string[] = [];

      if (searchTerm) {
        const keywords = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
        keywords.forEach(keyword => {
          subQueryWhereClauses.push(`(
            LOWER(s.StoreName) LIKE ? OR 
            LOWER(r.ReceiptNote) LIKE ?
          )`);
          queryParams.push(`%${keyword}%`, `%${keyword}%`);
        });
      }

      if (startDate) {
        subQueryWhereClauses.push(`r.ReceiptDate >= ?`);
        queryParams.push(format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        subQueryWhereClauses.push(`r.ReceiptDate <= ?`);
        queryParams.push(format(endDate, 'yyyy-MM-dd'));
      }

      if (typeFilter && typeFilter !== 'all') {
        subQueryWhereClauses.push('r.IsNonItemised = ?');
        queryParams.push(typeFilter === 'total-only' ? 1 : 0);
      }

      if (tentativeFilter && tentativeFilter !== 'all') {
        subQueryWhereClauses.push('r.IsTentative = ?');
        queryParams.push(tentativeFilter === 'tentative' ? 1 : 0);
      }

      if (subQueryWhereClauses.length > 0) {
        subQueryFrom += ` WHERE ${subQueryWhereClauses.join(' AND ')}`;
      }

      const subQuery = `${subQuerySelect} ${subQueryFrom}`;

      let outerQuery = `SELECT * FROM (${subQuery}) as receipts_with_counts`;
      const outerWhereClauses: string[] = [];

      if (attachmentFilter && attachmentFilter !== 'all') {
        outerWhereClauses.push(`AttachmentCount ${attachmentFilter === 'yes' ? '> 0' : '= 0'}`);
      }
      
      if (debtEnabled && debtFilter && debtFilter !== 'all') {
        switch (debtFilter) {
          case 'none':
            outerWhereClauses.push('TotalDebtorCount = 0');
            break;
          case 'unpaid':
            outerWhereClauses.push('UnpaidDebtorCount > 0');
            break;
          case 'own_debt':
            outerWhereClauses.push('Status = "unpaid"');
            break;
          case 'paid':
            outerWhereClauses.push('TotalDebtorCount > 0 AND UnpaidDebtorCount = 0');
            break;
        }
      }

      if (outerWhereClauses.length > 0) {
        outerQuery += ` WHERE ${outerWhereClauses.join(' AND ')}`;
      }

      const countQuery = `SELECT COUNT(*) as count FROM (${outerQuery})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;

      const finalQuery = `${outerQuery} ORDER BY ReceiptDate DESC, ReceiptID DESC LIMIT ? OFFSET ?`;
      const finalQueryParams = [...queryParams, pageSize, offset];

      const receipts = await db.query<Receipt>(finalQuery, finalQueryParams);
      return { receipts, totalCount };
    },
    staleTime: 0,
    gcTime: 0,
  });
};

export const useReceipt = (id: string | undefined) => {
  return useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      if (!id) return null;

      const receiptData = await db.queryOne<Receipt>(`
        SELECT r.*, s.StoreName, pm.PaymentMethodName, d.DebtorName as OwedToDebtorName
        FROM Receipts r
                 JOIN Stores s ON r.StoreID = s.StoreID
                 LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
                 LEFT JOIN Debtors d ON r.OwedToDebtorID = d.DebtorID
        WHERE r.ReceiptID = ?
      `, [id]);

      if (!receiptData) return null;

      const lineItems = !receiptData.IsNonItemised
        ? await db.query<LineItem>(`
            SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorName, d.DebtorID
            FROM LineItems li
                     JOIN Products p ON li.ProductID = p.ProductID
                     LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
                     LEFT JOIN Debtors d ON li.DebtorID = d.DebtorID
            WHERE li.ReceiptID = ?
        `, [id])
        : [];
      
      const images = await db.query<ReceiptImage>('SELECT ImagePath FROM ReceiptImages WHERE ReceiptID = ?', [id]);
      
      const splits = receiptData.SplitType === 'total_split'
        ? await db.query<ReceiptSplit>(`
            SELECT rs.*, d.DebtorName
            FROM ReceiptSplits rs
                     JOIN Debtors d ON rs.DebtorID = d.DebtorID
            WHERE rs.ReceiptID = ?
        `, [id])
        : [];

      const payments = await db.query<ReceiptDebtorPayment>('SELECT * FROM ReceiptDebtorPayments WHERE ReceiptID = ?', [id]);

      return { receipt: receiptData, lineItems, images, splits, payments };
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });
};


// --- Mutations ---

export const useDeleteReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const placeholders = ids.map(() => '?').join(',');
      await db.execute(`DELETE FROM Receipts WHERE ReceiptID IN (${placeholders})`, ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
      queryClient.invalidateQueries({ queryKey: ['debt'] });
    },
  });
};
