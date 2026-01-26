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
  repaymentFilter?: string;
  expenseTypeFilter?: string;
  tentativeFilter?: string;
  attachmentFilter?: string;
  // Income specific filters
  recipientFilter?: string;
  categoryFilter?: string;
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
    queryKey: ['transactions', { 
      page, pageSize, searchTerm, startDate, endDate, typeFilter, debtEnabled, 
      debtFilter, repaymentFilter, expenseTypeFilter, tentativeFilter, attachmentFilter,
      recipientFilter, categoryFilter, debtorFilter, fromMethodFilter, toMethodFilter, methodFilter
    }],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const queryParams: any[] = [];
      
      // 1. Expenses (Receipts)
      let expenseQuery = `
        SELECT 
          'expense-' || r.ExpenseID as id,
          r.ExpenseID as originalId,
          r.ExpenseDate as date,
          r.ExpenseNote as note,
          CASE 
            WHEN r.IsNonItemised = 1 THEN -r.NonItemisedTotal
            ELSE -(
              (SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM ExpenseLineItems li WHERE li.ExpenseID = r.ExpenseID) -
              IFNULL((SELECT SUM(li_d.LineQuantity * li_d.LineUnitPrice) FROM ExpenseLineItems li_d WHERE li_d.ExpenseID = r.ExpenseID AND (li_d.IsExcludedFromDiscount = 0 OR li_d.IsExcludedFromDiscount IS NULL)), 0) * r.Discount / 100
            )
          END as amount,
          pm.PaymentMethodName as methodName,
          r.PaymentMethodID as methodId,
          'expense' as type,
          r.CreationTimestamp as creationTimestamp,
          s.EntityName as storeName,
          NULL as debtorName,
          r.IsNonItemised as isNonItemised,
          r.IsTentative as isTentative,
          (SELECT COUNT(*) FROM ExpenseImages ri WHERE ri.ExpenseID = r.ExpenseID) as attachmentCount,
          r.Status as status,
          (SELECT COUNT(DISTINCT rs.EntityID) FROM ExpenseSplits rs WHERE rs.ExpenseID = r.ExpenseID) + (SELECT COUNT(DISTINCT li.EntityID) FROM ExpenseLineItems li WHERE li.ExpenseID = r.ExpenseID AND li.EntityID IS NOT NULL) as totalDebtorCount,
          (SELECT COUNT(DISTINCT d.EntityID) FROM Entities d LEFT JOIN ExpenseEntityPayments rdp ON d.EntityID = rdp.EntityID AND rdp.ExpenseID = r.ExpenseID WHERE rdp.ExpenseEntityPaymentID IS NULL AND ((r.SplitType = 'line_item' AND d.EntityID IN (SELECT li.EntityID FROM ExpenseLineItems li WHERE li.ExpenseID = r.ExpenseID AND li.EntityID IS NOT NULL)) OR (r.SplitType = 'total_split' AND d.EntityID IN (SELECT rs.EntityID FROM ExpenseSplits rs WHERE rs.ExpenseID = r.ExpenseID)))) as unpaidDebtorCount,
          NULL as debtorId,
          NULL as receiptId,
          NULL as fromMethodId,
          NULL as toMethodId,
          r.RecipientID as recipientId,
          NULL as categoryId,
          r.OwedToEntityID as owedToEntityId
        FROM Expenses r
        JOIN Entities s ON r.RecipientID = s.EntityID
        LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
      `;

      // 2. Incomes (TopUps that are not transfers and not repayments)
      let incomeQuery = `
        SELECT 
          'income-' || tu.IncomeID as id,
          tu.IncomeID as originalId,
          tu.IncomeDate as date,
          tu.IncomeNote as note,
          tu.IncomeAmount as amount,
          pm.PaymentMethodName as methodName,
          tu.PaymentMethodID as methodId,
          'income' as type,
          tu.CreationTimestamp as creationTimestamp,
          NULL as storeName,
          src.EntityName as debtorName,
          NULL as isNonItemised,
          NULL as isTentative,
          NULL as attachmentCount,
          NULL as status,
          NULL as totalDebtorCount,
          NULL as unpaidDebtorCount,
          NULL as debtorId,
          NULL as receiptId,
          NULL as fromMethodId,
          NULL as toMethodId,
          tu.RecipientID as recipientId,
          tu.CategoryID as categoryId,
          NULL as owedToEntityId
        FROM Income tu
        LEFT JOIN PaymentMethods pm ON tu.PaymentMethodID = pm.PaymentMethodID
        LEFT JOIN Entities src ON tu.RecipientID = src.EntityID
        WHERE tu.TransferID IS NULL 
        AND NOT EXISTS (SELECT 1 FROM ExpenseEntityPayments rdp WHERE rdp.IncomeID = tu.IncomeID)
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
          t.ToPaymentMethodID as toMethodId,
          NULL as recipientId,
          NULL as categoryId,
          NULL as owedToEntityId
        FROM Transfers t
        JOIN PaymentMethods pm_from ON t.FromPaymentMethodID = pm_from.PaymentMethodID
        JOIN PaymentMethods pm_to ON t.ToPaymentMethodID = pm_to.PaymentMethodID
      `;

      // 4. Repayments
      let repaymentQuery = `
        SELECT 
          'repayment-' || rdp.ExpenseEntityPaymentID as id,
          rdp.ExpenseEntityPaymentID as originalId,
          rdp.PaidDate as date,
          CASE WHEN tu.IncomeNote LIKE 'Repayment from %' THEN '' ELSE tu.IncomeNote END as note,
          tu.IncomeAmount as amount,
          pm.PaymentMethodName as methodName,
          tu.PaymentMethodID as methodId,
          'repayment' as type,
          rdp.CreationTimestamp as creationTimestamp,
          NULL as storeName,
          d.EntityName as debtorName,
          NULL as isNonItemised,
          NULL as isTentative,
          NULL as attachmentCount,
          NULL as status,
          NULL as totalDebtorCount,
          NULL as unpaidDebtorCount,
          rdp.EntityID as debtorId,
          rdp.ExpenseID as receiptId,
          NULL as fromMethodId,
          NULL as toMethodId,
          NULL as recipientId,
          NULL as categoryId,
          NULL as owedToEntityId
        FROM ExpenseEntityPayments rdp
        JOIN Income tu ON rdp.IncomeID = tu.IncomeID
        JOIN Entities d ON rdp.EntityID = d.EntityID
        LEFT JOIN PaymentMethods pm ON tu.PaymentMethodID = pm.PaymentMethodID
      `;

      let queries = [];
      if (typeFilter === 'all') {
        queries = [expenseQuery, incomeQuery, transferQuery, repaymentQuery];
      } else if (typeFilter === 'expense' || typeFilter === 'paid_expense') {
        queries = [expenseQuery];
        // If method is filtered, include transfers as potential expenses (outgoing)
        if (methodFilter && methodFilter !== 'all') {
          queries.push(transferQuery);
        }
      } else if (typeFilter === 'income') {
        queries = [incomeQuery, repaymentQuery];
        // If method is filtered, include transfers as potential income (incoming)
        if (methodFilter && methodFilter !== 'all') {
          queries.push(transferQuery);
        }
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
      if (typeFilter === 'expense' || typeFilter === 'paid_expense') {
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
        if (recipientFilter && recipientFilter !== 'all') {
          whereClauses.push("recipientId = ?");
          queryParams.push(recipientFilter);
        }
        // If method is filtered, in the expense tab we only show money going OUT
        if (methodFilter && methodFilter !== 'all') {
          whereClauses.push("(type != 'transfer' OR fromMethodId = ?)");
          queryParams.push(methodFilter);
        }
      } else if (typeFilter === 'income') {
        if (recipientFilter && recipientFilter !== 'all') {
          whereClauses.push("recipientId = ?");
          queryParams.push(recipientFilter);
        }
        if (categoryFilter && categoryFilter !== 'all') {
          whereClauses.push("categoryId = ?");
          queryParams.push(categoryFilter);
        }
        // If method is filtered, in the income tab we only show money coming IN
        if (methodFilter && methodFilter !== 'all') {
          whereClauses.push("(type != 'transfer' OR toMethodId = ?)");
          queryParams.push(methodFilter);
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

      // Debt filters (applied to the union result)
      if (debtEnabled && debtFilter && debtFilter !== 'all') {
        switch (debtFilter) {
          case 'none':
            whereClauses.push("totalDebtorCount = 0");
            break;
          case 'unpaid':
            whereClauses.push("unpaidDebtorCount > 0");
            break;
          case 'paid':
            whereClauses.push("(totalDebtorCount > 0 AND unpaidDebtorCount = 0)");
            break;
        }
      }

      if (debtEnabled && repaymentFilter && repaymentFilter !== 'all') {
        switch (repaymentFilter) {
          case 'none':
            whereClauses.push("owedToEntityId IS NULL");
            break;
          case 'unpaid':
            whereClauses.push("owedToEntityId IS NOT NULL AND status = 'unpaid'");
            break;
          case 'paid':
            whereClauses.push("owedToEntityId IS NOT NULL AND status = 'paid'");
            break;
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
      
      // Adjust transfer amounts based on method filter
      const adjustedTransactions = transactions.map(t => {
        if (t.type === 'transfer' && methodFilter && methodFilter !== 'all') {
          if (String(t.fromMethodId) === String(methodFilter)) {
            return { ...t, amount: -Math.abs(t.amount) };
          } else if (String(t.toMethodId) === String(methodFilter)) {
            return { ...t, amount: Math.abs(t.amount) };
          }
        }
        return t;
      });

      return { transactions: adjustedTransactions, totalCount };
    },
  });
};
