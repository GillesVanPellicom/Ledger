import { useQuery } from '@tanstack/react-query';
import { db } from '../utils/db';
import { Transaction } from '../types';
import { format } from 'date-fns';

interface FetchTransactionsParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  typeFilter?: string; // 'all', 'expense', 'income', 'transfer', 'repayment', 'paid_expense', 'unpaid_expense'
  debtEnabled?: boolean;
  debtFilter?: string;
  repaymentFilter?: string;
  expenseTypeFilter?: string;
  tentativeFilter?: string;
  attachmentFilter?: string;
  recipientFilter?: string;
  categoryFilter?: string;
  debtorFilter?: string;
  fromMethodFilter?: string;
  toMethodFilter?: string;
  methodFilter?: string;
}

interface FetchTransactionsResult {
  transactions: Transaction[];
  totalCount: number;
}

export const useTransactions = (params: FetchTransactionsParams) => {
  const {
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    typeFilter = 'all',
    debtEnabled,
    debtFilter,
    repaymentFilter,
    expenseTypeFilter,
    tentativeFilter,
    attachmentFilter,
    recipientFilter,
    categoryFilter,
    debtorFilter,
    fromMethodFilter,
    toMethodFilter,
    methodFilter
  } = params;

  return useQuery<FetchTransactionsResult>({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const queryParams: any[] = [];
      const whereClauses: string[] = [];

      // --- GLOBAL FILTERS ---
      if (searchTerm) {
        const keywords = searchTerm
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(' ')
          .filter(Boolean);
        keywords.forEach(() => {
          whereClauses.push(`(
            LOWER(note) LIKE ? OR 
            LOWER(storeName) LIKE ? OR 
            LOWER(debtorName) LIKE ? OR
            LOWER(methodName) LIKE ?
          )`);
          queryParams.push(...keywords.flatMap(k => [`%${k}%`, `%${k}%`, `%${k}%`, `%${k}%`]));
        });
      }

      if (startDate) {
        whereClauses.push(`date >= ?`);
        queryParams.push(format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        whereClauses.push(`date <= ?`);
        queryParams.push(format(endDate, 'yyyy-MM-dd'));
      }
      if (tentativeFilter && tentativeFilter !== 'all') {
        whereClauses.push(`isTentative = ?`);
        queryParams.push(tentativeFilter === 'tentative' ? 1 : 0);
      }

      if (methodFilter && methodFilter !== 'all') {
        whereClauses.push(`(
          methodId = ? OR fromMethodId = ? OR toMethodId = ?
        )`);
        queryParams.push(methodFilter, methodFilter, methodFilter);
      }

      // --- TYPE-SPECIFIC FILTERS ---
      const typeQueries: string[] = [];

      if (typeFilter === 'all' || typeFilter === 'expense' || typeFilter === 'paid_expense') {
        let expenseQuery = `
          SELECT 
            'expense-' || e.ExpenseID AS id,
            e.ExpenseID AS originalId,
            e.ExpenseDate AS date,
            e.ExpenseNote AS note,
            CASE 
              WHEN e.IsNonItemised = 1 THEN -e.NonItemisedTotal
              ELSE -(
                (SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM ExpenseLineItems li WHERE li.ExpenseID = e.ExpenseID) -
                IFNULL((SELECT SUM(li_d.LineQuantity * li_d.LineUnitPrice) FROM ExpenseLineItems li_d WHERE li_d.ExpenseID = e.ExpenseID AND (li_d.IsExcludedFromDiscount = 0 OR li_d.IsExcludedFromDiscount IS NULL)),0) * e.Discount/100
              )
            END AS amount,
            pm.PaymentMethodName AS methodName,
            e.PaymentMethodID AS methodId,
            'expense' AS type,
            e.CreationTimestamp AS creationTimestamp,
            s.EntityName AS storeName,
            d_repaid.EntityName AS debtorName,
            e.IsNonItemised AS isNonItemised,
            e.IsTentative AS isTentative,
            (SELECT COUNT(*) FROM ExpenseImages ri WHERE ri.ExpenseID = e.ExpenseID) AS attachmentCount,
            e.Status AS status,
            (SELECT COUNT(DISTINCT rs.EntityID) FROM ExpenseSplits rs WHERE rs.ExpenseID = e.ExpenseID)
              + (SELECT COUNT(DISTINCT li.EntityID) FROM ExpenseLineItems li WHERE li.ExpenseID = e.ExpenseID AND li.EntityID IS NOT NULL) AS totalDebtorCount,
            (SELECT COUNT(DISTINCT d.EntityID) FROM Entities d
              LEFT JOIN ExpenseEntityPayments rdp ON d.EntityID = rdp.EntityID AND rdp.ExpenseID = e.ExpenseID
              WHERE rdp.ExpenseEntityPaymentID IS NULL
              AND ((e.SplitType='line_item' AND d.EntityID IN (SELECT li.EntityID FROM ExpenseLineItems li WHERE li.ExpenseID=e.ExpenseID AND li.EntityID IS NOT NULL))
              OR ((e.SplitType='total_split' OR e.SplitType='by_amount') AND d.EntityID IN (SELECT rs.EntityID FROM ExpenseSplits rs WHERE rs.ExpenseID=e.ExpenseID)))
            ) AS unpaidDebtorCount,
            NULL AS debtorId,
            NULL AS receiptId,
            NULL AS fromMethodId,
            NULL AS toMethodId,
            e.RecipientID AS recipientId,
            NULL AS categoryId,
            e.OwedToEntityID AS owedToEntityId
          FROM Expenses e
          JOIN Entities s ON e.RecipientID = s.EntityID
          LEFT JOIN PaymentMethods pm ON e.PaymentMethodID = pm.PaymentMethodID
          LEFT JOIN Entities d_repaid ON e.OwedToEntityID = d_repaid.EntityID
        `;

        if (expenseTypeFilter && expenseTypeFilter !== 'all') {
          whereClauses.push(`isNonItemised = ?`);
          queryParams.push(expenseTypeFilter === 'total-only' ? 1 : 0);
        }
        if (attachmentFilter && attachmentFilter !== 'all') {
          whereClauses.push(`attachmentCount ${attachmentFilter === 'yes' ? '>0' : '=0'}`);
        }
        if (recipientFilter && recipientFilter !== 'all') {
          whereClauses.push(`recipientId = ?`);
          queryParams.push(recipientFilter);
        }

        typeQueries.push(expenseQuery);
      }

      if (typeFilter === 'all' || typeFilter === 'income' || typeFilter === 'repayment') {
        let incomeQuery = `
          SELECT 
            CASE 
              WHEN eep.ExpenseEntityPaymentID IS NOT NULL THEN 'repayment-' || i.IncomeID
              ELSE 'income-' || i.IncomeID 
            END AS id,
            i.IncomeID AS originalId,
            i.IncomeDate AS date,
            CASE 
              WHEN i.IncomeNote LIKE 'Repayment from %' THEN NULL 
              ELSE i.IncomeNote 
            END AS note,
            i.IncomeAmount AS amount,
            pm.PaymentMethodName AS methodName,
            i.PaymentMethodID AS methodId,
            CASE 
              WHEN eep.ExpenseEntityPaymentID IS NOT NULL THEN 'repayment'
              ELSE 'income' 
            END AS type,
            i.CreationTimestamp AS creationTimestamp,
            NULL AS storeName,
            COALESCE(e_repayment.EntityName, e_income.EntityName) AS debtorName,
            0 AS isNonItemised,
            0 AS isTentative,
            NULL AS attachmentCount,
            NULL AS status,
            NULL AS totalDebtorCount,
            NULL AS unpaidDebtorCount,
            COALESCE(eep.EntityID, i.RecipientID) AS debtorId,
            NULL AS receiptId,
            NULL AS fromMethodId,
            NULL AS toMethodId,
            i.RecipientID AS recipientId,
            i.CategoryID AS categoryId,
            NULL AS owedToEntityId
          FROM Income i
          LEFT JOIN PaymentMethods pm ON i.PaymentMethodID = pm.PaymentMethodID
          LEFT JOIN Entities e_income ON i.RecipientID = e_income.EntityID
          LEFT JOIN ExpenseEntityPayments eep ON i.IncomeID = eep.IncomeID
          LEFT JOIN Entities e_repayment ON eep.EntityID = e_repayment.EntityID
          WHERE i.TransferID IS NULL
        `;
        
        if (typeFilter === 'repayment') {
          whereClauses.push("type = 'repayment'");
        } else if (typeFilter === 'income') {
          whereClauses.push("type = 'income'");
        }

        if (recipientFilter && recipientFilter !== 'all') {
          whereClauses.push("recipientId = ?");
          queryParams.push(recipientFilter);
        }
        if (categoryFilter && categoryFilter !== 'all') {
          whereClauses.push("categoryId = ?");
          queryParams.push(categoryFilter);
        }

        typeQueries.push(incomeQuery);
      }

      if (typeFilter === 'all' || typeFilter === 'transfer') {
        let transferQuery = `
          SELECT 
            'transfer-' || t.TransferID AS id,
            t.TransferID AS originalId,
            t.TransferDate AS date,
            t.Note AS note,
            CASE 
              WHEN ? = t.FromPaymentMethodID THEN -t.Amount
              WHEN ? = t.ToPaymentMethodID THEN t.Amount
              ELSE t.Amount
            END AS amount,
            pm_from.PaymentMethodName || ' → ' || pm_to.PaymentMethodName AS methodName,
            t.FromPaymentMethodID AS methodId,
            'transfer' AS type,
            t.CreationTimestamp AS creationTimestamp,
            NULL AS storeName,
            NULL AS debtorName,
            0 AS isNonItemised,
            0 AS isTentative,
            NULL AS attachmentCount,
            NULL AS status,
            NULL AS totalDebtorCount,
            NULL AS unpaidDebtorCount,
            NULL AS debtorId,
            NULL AS receiptId,
            t.FromPaymentMethodID AS fromMethodId,
            t.ToPaymentMethodID AS toMethodId,
            NULL AS recipientId,
            NULL AS categoryId,
            NULL AS owedToEntityId
          FROM Transfers t
          JOIN PaymentMethods pm_from ON t.FromPaymentMethodID = pm_from.PaymentMethodID
          JOIN PaymentMethods pm_to ON t.ToPaymentMethodID = pm_to.PaymentMethodID
        `;
        queryParams.push(methodFilter || null, methodFilter || null);
        typeQueries.push(transferQuery);
      }

      if (typeQueries.length === 0) return { transactions: [], totalCount: 0 };

      let unionQuery = typeQueries.join(' UNION ALL ');
      let finalQuery = `SELECT * FROM (${unionQuery}) as all_transactions`;

      if (whereClauses.length > 0) {
        finalQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const countQuery = `SELECT COUNT(*) as count FROM (${finalQuery}) as count_table`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult?.count ?? 0;

      finalQuery += ` ORDER BY date DESC, creationTimestamp DESC LIMIT ? OFFSET ?`;
      queryParams.push(pageSize, offset);

      const transactions = await db.query<Transaction>(finalQuery, queryParams);
      return { transactions, totalCount };
    },
  });
};