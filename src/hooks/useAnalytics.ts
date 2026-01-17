import { useQuery } from '@tanstack/react-query';
import { db } from '../utils/db';
import { MonthlySpending, StoreSpending, CategorySpending, Averages, PaymentMethodStats, DebtStats, Debtor } from '../types';

export const useAvailableYears = () => {
  return useQuery({
    queryKey: ['analytics', 'years'],
    queryFn: async () => {
      const result = await db.query<{ year: string }>("SELECT DISTINCT STRFTIME('%Y', ReceiptDate) as year FROM Receipts ORDER BY year DESC");
      return result.map(r => r.year);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useCategoryAnalytics = (year: string, month: string | null, week: string | null) => {
  return useQuery({
    queryKey: ['analytics', 'category', year, month, week],
    queryFn: async () => {
      let dateFilter = `STRFTIME('%Y', r.ReceiptDate) = ?`;
      const params: any[] = [year];

      if (month && month !== 'all') {
        dateFilter += ` AND STRFTIME('%m', r.ReceiptDate) = ?`;
        params.push(month.padStart(2, '0'));
      }

      if (week && week !== 'all') {
        dateFilter += ` AND STRFTIME('%W', r.ReceiptDate) = ?`;
        params.push(week.padStart(2, '0'));
      }

      const baseWhere = `r.IsTentative = 0`;
      const totalQueryPart = `SUM(CASE WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal ELSE li.LineQuantity * li.LineUnitPrice END)`;

      const categoryResult = await db.query<{ CategoryName: string, total: number, count: number }>(`
        SELECT c.CategoryName, ${totalQueryPart} as total, COUNT(DISTINCT r.ReceiptID) as count
        FROM Receipts r 
        LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID 
        LEFT JOIN Products p ON li.ProductID = p.ProductID
        LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE ${dateFilter} AND ${baseWhere} 
        GROUP BY c.CategoryName 
        ORDER BY total DESC
      `, params);
      
      const categorySpending: (CategorySpending & { count: number, avg: number })[] = categoryResult.map(c => ({ 
        name: c.CategoryName || 'Uncategorized', 
        value: c.total,
        count: c.count,
        avg: c.count > 0 ? c.total / c.count : 0
      }));

      return { categorySpending };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useAnalyticsData = (selectedYear: string, paymentMethodsEnabled: boolean, debtEnabled: boolean) => {
  return useQuery({
    queryKey: ['analytics', 'data', selectedYear, paymentMethodsEnabled, debtEnabled],
    queryFn: async () => {
      const yearFilter = `STRFTIME('%Y', r.ReceiptDate) = ?`;
      const baseWhere = `r.IsTentative = 0`;

      const itemlessCheck = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM Receipts r WHERE r.IsNonItemised = 1 AND ${yearFilter}`, [selectedYear]);
      const hasItemlessReceipts = itemlessCheck ? itemlessCheck.count > 0 : false;

      const tentativeCheck = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM Receipts r WHERE r.IsTentative = 1 AND ${yearFilter}`, [selectedYear]);
      const hasTentativeReceipts = tentativeCheck ? tentativeCheck.count > 0 : false;

      const totalQueryPart = `SUM(CASE WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal ELSE li.LineQuantity * li.LineUnitPrice END)`;

      // Monthly Spending
      const monthlyResult = await db.query<{ month: string, total: number }>(`SELECT STRFTIME('%m', r.ReceiptDate) as month, ${totalQueryPart} as total FROM Receipts r LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE ${yearFilter} AND ${baseWhere} GROUP BY month ORDER BY month ASC`, [selectedYear]);
      const prevYearMonthlyResult = await db.query<{ month: string, total: number }>(`SELECT STRFTIME('%m', r.ReceiptDate) as month, ${totalQueryPart} as total FROM Receipts r LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE STRFTIME('%Y', r.ReceiptDate) = ? AND ${baseWhere} GROUP BY month`, [(parseInt(selectedYear) - 1).toString()]);
      const prevDecResult = await db.queryOne<{ total: number }>(`SELECT ${totalQueryPart} as total FROM Receipts r LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE STRFTIME('%Y-%m', r.ReceiptDate) = ? AND ${baseWhere}`, [`${parseInt(selectedYear) - 1}-12`]);
      const prevDecTotal = prevDecResult?.total || 0;

      const monthlySpending: MonthlySpending[] = Array(12).fill(0).map((_, i) => {
        const monthStr = (i + 1).toString().padStart(2, '0');
        const monthData = monthlyResult.find(m => m.month === monthStr);
        let prevMonthTotal = (i === 0) ? prevDecTotal : (monthlyResult.find(m => m.month === i.toString().padStart(2, '0'))?.total || 0);
        const prevYearMonthData = prevYearMonthlyResult.find(m => m.month === monthStr);
        return { total: monthData?.total || 0, prevMonthTotal, prevYearMonthTotal: prevYearMonthData?.total || 0 };
      });

      // Store Spending
      const storeResult = await db.query<{ StoreName: string, total: number }>(`SELECT s.StoreName, ${totalQueryPart} as total FROM Receipts r LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID JOIN Stores s ON r.StoreID = s.StoreID WHERE ${yearFilter} AND ${baseWhere} GROUP BY s.StoreName ORDER BY total DESC`, [selectedYear]);
      const storeSpending: StoreSpending[] = storeResult.map(s => ({ name: s.StoreName, value: s.total }));

      const uncategorizedCountResult = await db.queryOne<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM Products p
        WHERE p.CategoryID IS NULL
      `);
      const hasUncategorizedProducts = (uncategorizedCountResult?.count || 0) > 0;

      // Averages
      const averagesResult = await db.queryOne<{ receiptCount: number, totalItems: number, totalSpent: number }>(`SELECT COUNT(DISTINCT r.ReceiptID) as receiptCount, SUM(li.LineQuantity) as totalItems, SUM(CASE WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal ELSE li.LineQuantity * li.LineUnitPrice END) as totalSpent FROM Receipts r LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE ${yearFilter} AND ${baseWhere}`, [selectedYear]);
      const averages: Averages = averagesResult && averagesResult.receiptCount > 0 ? {
        avgPerReceipt: averagesResult.totalSpent / averagesResult.receiptCount,
        avgItemsPerReceipt: averagesResult.totalItems / averagesResult.receiptCount,
        avgPricePerItem: averagesResult.totalSpent / averagesResult.totalItems
      } : { avgPerReceipt: 0, avgItemsPerReceipt: 0, avgPricePerItem: 0 };

      // Payment Method Stats
      let paymentMethodStats: PaymentMethodStats = { totalCapacity: 0, methods: [] };
      if (paymentMethodsEnabled) {
        const methods = await db.query<{ PaymentMethodID: number, PaymentMethodName: string, PaymentMethodFunds: number, IsActive: number }>('SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1');
        let totalCapacity = 0;
        const methodDetails = await Promise.all(methods.map(async (method) => {
          const expensesResult = await db.queryOne<{ total: number }>(`SELECT SUM(CASE WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal ELSE li.LineQuantity * li.LineUnitPrice END) as total FROM Receipts r LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE r.PaymentMethodID = ? AND ${baseWhere}`, [method.PaymentMethodID]);
          const topupsResult = await db.queryOne<{ total: number }>('SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?', [method.PaymentMethodID]);
          const balance = (method.PaymentMethodFunds || 0) + (topupsResult?.total || 0) - (expensesResult?.total || 0);
          totalCapacity += balance;
          return { id: method.PaymentMethodID, name: method.PaymentMethodName, balance };
        }));
        paymentMethodStats = { totalCapacity, methods: methodDetails };
      }

      // Debt Stats
      let debtStats: DebtStats = { netBalances: [], totalOwedToMe: 0, totalOwedByMe: 0 };
      if (debtEnabled) {
        const debtors = await db.query<Debtor[]>('SELECT * FROM Debtors WHERE DebtorIsActive = 1');
        let totalOwedToMe = 0;
        let totalOwedByMe = 0;
        const netBalances: { name: string, value: number, id: number }[] = [];

        const { calculateDebts } = await import('../logic/debt/debtLogic');

        for (const debtor of debtors) {
          const { debtToMe, debtToEntity } = await calculateDebts(debtor.DebtorID);
          if (debtToMe - debtToEntity !== 0) {
            netBalances.push({ name: debtor.DebtorName, value: debtToMe - debtToEntity, id: debtor.DebtorID });
          }
          totalOwedToMe += debtToMe;
          totalOwedByMe += debtToEntity;
        }

        debtStats = {
          netBalances: netBalances.sort((a, b) => b.value - a.value),
          totalOwedToMe,
          totalOwedByMe,
        };
      }

      return {
        hasItemlessReceipts,
        hasTentativeReceipts,
        hasUncategorizedProducts,
        monthlySpending,
        storeSpending,
        averages,
        paymentMethodStats,
        debtStats
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
