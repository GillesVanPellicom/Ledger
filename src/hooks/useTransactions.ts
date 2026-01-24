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
  // Expense specific filters
  debtFilter?: string;
  expenseTypeFilter?: string;
  tentativeFilter?: string;
  attachmentFilter?: string;
  // Income specific filters
  incomeSourceFilter?: string;
  incomeCategoryFilter?: string;
  incomeEntityFilter?: string;
  // Repayment specific filters
  debtorFilter?: string;
  // Transfer specific filters
  fromMethodFilter?: string;
  toMethodFilter?: string;
  // Global method filter
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
    typeFilter,
    debtEnabled,
    debtFilter,
    expenseTypeFilter,
    tentativeFilter,
    attachmentFilter,
    incomeSourceFilter,
    incomeCategoryFilter,
    incomeEntityFilter,
    debtorFilter,
    fromMethodFilter,
    toMethodFilter,
    methodFilter
  } = params;

  return useQuery<FetchTransactionsResult>({
    queryKey: ['transactions', { 
      page, pageSize, searchTerm, startDate, endDate, typeFilter, debtEnabled, 
      debtFilter, expenseTypeFilter, tentativeFilter, attachmentFilter,
      incomeSourceFilter, incomeCategoryFilter, incomeEntityFilter, debtorFilter, fromMethodFilter, toMethodFilter, methodFilter
    }],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const queryParams: any[] = [];
      
      // 1. Expenses (Receipts)
      let expenseQuery = `
        SELECT 
          'expense-' || r.ReceiptID as id,
          r.ReceiptID as originalId,
          r.ReceiptDate as date,
          r.ReceiptNote as note,
          CASE 
            WHEN r.IsNonItemised = 1 THEN -r.NonItemisedTotal
            ELSE -(
              (SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM LineItems li WHERE li.ReceiptID = r.ReceiptID) -
              IFNULL((SELECT SUM(li_d.LineQuantity * li_d.LineUnitPrice) FROM LineItems li_d WHERE li_d.ReceiptID = r.ReceiptID AND (li_d.IsExcludedFromDiscount = 0 OR li_d.IsExcludedFromDiscount IS NULL)), 0) * r.Discount / 100
            )
          END as amount,
          pm.PaymentMethodName as methodName,
          r.PaymentMethodID as methodId,
          'expense' as type,
          r.CreationTimestamp as creationTimestamp,
          s.StoreName as storeName,
          NULL as debtorName,
          r.IsNonItemised as isNonItemised,
          r.IsTentative as isTentative,
          (SELECT COUNT(*) FROM ReceiptImages ri WHERE ri.ReceiptID = r.ReceiptID) as attachmentCount,
          r.Status as status,
          (SELECT COUNT(DISTINCT rs.DebtorID) FROM ReceiptSplits rs WHERE rs.ReceiptID = r.ReceiptID) + (SELECT COUNT(DISTINCT li.DebtorID) FROM LineItems li WHERE li.ReceiptID = r.ReceiptID AND li.DebtorID IS NOT NULL) as totalDebtorCount,
          (SELECT COUNT(DISTINCT d.DebtorID) FROM Debtors d LEFT JOIN ReceiptDebtorPayments rdp ON d.DebtorID = rdp.DebtorID AND rdp.ReceiptID = r.ReceiptID WHERE rdp.PaymentID IS NULL AND ((r.SplitType = 'line_item' AND d.DebtorID IN (SELECT li.DebtorID FROM LineItems li WHERE li.ReceiptID = r.ReceiptID AND li.DebtorID IS NOT NULL)) OR (r.SplitType = 'total_split' AND d.DebtorID IN (SELECT rs.DebtorID FROM ReceiptSplits rs WHERE rs.ReceiptID = r.ReceiptID)))) as unpaidDebtorCount,
          NULL as debtorId,
          NULL as receiptId,
          NULL as fromMethodId,
          NULL as toMethodId
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
        LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
      `;

      // 2. Incomes (TopUps that are not transfers and not repayments)
      let incomeQuery = `
        SELECT 
          'income-' || tu.TopUpID as id,
          tu.TopUpID as originalId,
          tu.TopUpDate as date,
          tu.TopUpNote as note,
          tu.TopUpAmount as amount,
          pm.PaymentMethodName as methodName,
          tu.PaymentMethodID as methodId,
          'income' as type,
          tu.CreationTimestamp as creationTimestamp,
          NULL as storeName,
          src.IncomeSourceName as debtorName, -- Use debtorName field for SourceName
          NULL as isNonItemised,
          NULL as isTentative,
          NULL as attachmentCount,
          NULL as status,
          NULL as totalDebtorCount,
          NULL as unpaidDebtorCount,
          tu.DebtorID as debtorId,
          NULL as receiptId,
          NULL as fromMethodId,
          NULL as toMethodId
        FROM TopUps tu
        LEFT JOIN PaymentMethods pm ON tu.PaymentMethodID = pm.PaymentMethodID
        LEFT JOIN IncomeSources src ON tu.IncomeSourceID = src.IncomeSourceID
        WHERE tu.TransferID IS NULL 
        AND NOT EXISTS (SELECT 1 FROM ReceiptDebtorPayments rdp WHERE rdp.TopUpID = tu.TopUpID)
      `;

      // 3. Transfers
      let transferQuery = `
        SELECT 
          'transfer-' || t.TransferID as id,
          t.TransferID as originalId,
          t.TransferDate as date,
          t.Note as note,
          t.Amount as amount,
          pm_from.PaymentMethodName || ' → ' || pm_to.PaymentMethodName as methodName,
          t.FromPaymentMethodID as methodId,
          'transfer' as type,
          t.CreationTimestamp as creationTimestamp,
          NULL as storeName,
          NULL as debtorName,
          NULL as isNonItemised,
          NULL as isTentative,
          NULL as attachmentCount,
          NULL as status,
          NULL as totalDebtorCount,
          NULL as unpaidDebtorCount,
          NULL as debtorId,
          NULL as receiptId,
          t.FromPaymentMethodID as fromMethodId,
          t.ToPaymentMethodID as toMethodId
        FROM Transfers t
        JOIN PaymentMethods pm_from ON t.FromPaymentMethodID = pm_from.PaymentMethodID
        JOIN PaymentMethods pm_to ON t.ToPaymentMethodID = pm_to.PaymentMethodID
      `;

      // 4. Repayments
      let repaymentQuery = `
        SELECT 
          'repayment-' || rdp.PaymentID as id,
          rdp.PaymentID as originalId,
          rdp.PaidDate as date,
          CASE WHEN tu.TopUpNote LIKE 'Repayment from %' THEN '' ELSE tu.TopUpNote END as note,
          tu.TopUpAmount as amount,
          pm.PaymentMethodName as methodName,
          tu.PaymentMethodID as methodId,
          'repayment' as type,
          rdp.CreationTimestamp as creationTimestamp,
          NULL as storeName,
          d.DebtorName as debtorName,
          NULL as isNonItemised,
          NULL as isTentative,
          NULL as attachmentCount,
          NULL as status,
          NULL as totalDebtorCount,
          NULL as unpaidDebtorCount,
          rdp.DebtorID as debtorId,
          rdp.ReceiptID as receiptId,
          NULL as fromMethodId,
          NULL as toMethodId
        FROM ReceiptDebtorPayments rdp
        JOIN TopUps tu ON rdp.TopUpID = tu.TopUpID
        JOIN Debtors d ON rdp.DebtorID = d.DebtorID
        LEFT JOIN PaymentMethods pm ON tu.PaymentMethodID = pm.PaymentMethodID
      `;

      let queries = [];
      if (typeFilter === 'all') {
        queries = [expenseQuery, incomeQuery, transferQuery, repaymentQuery];
      } else if (typeFilter === 'expense') {
        queries = [expenseQuery];
      } else if (typeFilter === 'paid_expense') {
        queries = [expenseQuery + " WHERE r.Status = 'paid'"];
      } else if (typeFilter === 'unpaid_expense') {
        queries = [expenseQuery + " WHERE r.Status = 'unpaid'"];
      } else if (typeFilter === 'income') {
        queries = [incomeQuery];
      } else if (typeFilter === 'transfer') {
        queries = [transferQuery];
      } else if (typeFilter === 'repayment') {
        queries = [repaymentQuery];
      }

      let unionQuery = queries.join(' UNION ALL ');
      let finalQuery = `SELECT * FROM (${unionQuery}) as all_transactions`;
      let whereClauses = [];

      if (searchTerm) {
        const keywords = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
        keywords.forEach(keyword => {
          whereClauses.push(`(
            LOWER(note) LIKE ? OR 
            LOWER(storeName) LIKE ? OR 
            LOWER(debtorName) LIKE ? OR
            LOWER(methodName) LIKE ?
          )`);
          queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
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

      // Global method filter
      if (methodFilter && methodFilter !== 'all') {
        whereClauses.push(`(methodId = ? OR fromMethodId = ? OR toMethodId = ?)`);
        queryParams.push(methodFilter, methodFilter, methodFilter);
      }

      // Apply type-specific filters
      if (typeFilter === 'expense' || typeFilter === 'paid_expense' || typeFilter === 'unpaid_expense') {
        if (expenseTypeFilter && expenseTypeFilter !== 'all') {
          whereClauses.push(`isNonItemised = ?`);
          queryParams.push(expenseTypeFilter === 'total-only' ? 1 : 0);
        }
        if (tentativeFilter && tentativeFilter !== 'all') {
          whereClauses.push(`isTentative = ?`);
          queryParams.push(tentativeFilter === 'tentative' ? 1 : 0);
        }
        if (attachmentFilter && attachmentFilter !== 'all') {
          whereClauses.push(`attachmentCount ${attachmentFilter === 'yes' ? '> 0' : '= 0'}`);
        }
        if (debtEnabled && debtFilter && debtFilter !== 'all') {
          switch (debtFilter) {
            case 'none':
              whereClauses.push("totalDebtorCount = 0");
              break;
            case 'unpaid':
              whereClauses.push("unpaidDebtorCount > 0");
              break;
            case 'own_debt':
              whereClauses.push("status = 'unpaid'");
              break;
            case 'paid':
              whereClauses.push("(totalDebtorCount > 0 AND unpaidDebtorCount = 0)");
              break;
          }
        }
      } else if (typeFilter === 'income') {
        if (incomeSourceFilter && incomeSourceFilter !== 'all') {
          // Match by IncomeSourceID
          whereClauses.push("originalId IN (SELECT TopUpID FROM TopUps WHERE IncomeSourceID = ?)");
          queryParams.push(incomeSourceFilter);
        }
        if (incomeCategoryFilter && incomeCategoryFilter !== 'all') {
          // Match by IncomeCategoryID
          whereClauses.push("originalId IN (SELECT TopUpID FROM TopUps WHERE IncomeCategoryID = ?)");
          queryParams.push(incomeCategoryFilter);
        }
        if (incomeEntityFilter && incomeEntityFilter !== 'all') {
          // Match by DebtorID
          whereClauses.push("debtorId = ?");
          queryParams.push(incomeEntityFilter);
        }
      } else if (typeFilter === 'repayment') {
        if (debtorFilter && debtorFilter !== 'all') {
          whereClauses.push("debtorId = ?");
          queryParams.push(debtorFilter);
        }
      } else if (typeFilter === 'transfer') {
        if (fromMethodFilter && fromMethodFilter !== 'all') {
          whereClauses.push("fromMethodId = ?");
          queryParams.push(fromMethodFilter);
        }
        if (toMethodFilter && toMethodFilter !== 'all') {
          whereClauses.push("toMethodId = ?");
          queryParams.push(toMethodFilter);
        }
      }

      if (whereClauses.length > 0) {
        finalQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const countQuery = `SELECT COUNT(*) as count FROM (${finalQuery})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, queryParams);
      const totalCount = countResult ? countResult.count : 0;

      finalQuery += ` ORDER BY date DESC, creationTimestamp DESC LIMIT ? OFFSET ?`;
      queryParams.push(pageSize, offset);

      const transactions = await db.query<Transaction>(finalQuery, queryParams);
      return { transactions, totalCount };
    },
  });
};
