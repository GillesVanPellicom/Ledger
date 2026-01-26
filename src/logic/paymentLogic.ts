import { db } from '../utils/db';
import { calculateTotalWithDiscount } from './expense/discountLogic';
import { LineItem } from '../types';

export interface PaymentMethodBalance {
  initialFunds: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

/**
 * Calculates the current balance for a payment method by summing all transactions.
 * Optimized to reduce JS-side computation and database round-trips.
 * 
 * @param methodId - The ID of the payment method.
 * @param initialFunds - The starting funds for the payment method.
 * @param options - Optional date filters for point-in-time snapshots.
 * @returns A structured object containing balance details.
 */
export async function calculatePaymentMethodBalance(
  methodId: number, 
  initialFunds: number,
  options: { startDate?: string; endDate?: string } = {}
): Promise<PaymentMethodBalance> {
  try {
    const safeInitialFunds = Number(initialFunds || 0);
    const queryParams: any[] = [methodId];
    let dateFilter = '';

    if (options.startDate) {
      dateFilter += ' AND ExpenseDate >= ?';
      queryParams.push(options.startDate);
    }
    if (options.endDate) {
      dateFilter += ' AND ExpenseDate <= ?';
      queryParams.push(options.endDate);
    }

    // 1. Fetch all receipts (expenses) for this method
    // We fetch necessary fields to calculate totals, including itemised and non-itemised.
    const receiptsData = await db.query<any>(`
      SELECT r.ExpenseID as ReceiptID, r.Discount, r.IsNonItemised, r.NonItemisedTotal
      FROM Expenses r
      WHERE r.PaymentMethodID = ? AND r.IsTentative = 0 ${dateFilter}
    `, queryParams);

    const receiptIds = receiptsData.map(r => r.ReceiptID);
    
    // 2. Fetch line items for these receipts in a single JOIN query to avoid large IN-clauses
    // and pre-group them in JS for O(n+m) performance.
    const lineItemsMap = new Map<number, LineItem[]>();
    if (receiptIds.length > 0) {
      const allLineItems = await db.query<LineItem>(`
        SELECT li.ExpenseID as ReceiptID, li.LineQuantity, li.LineUnitPrice, li.IsExcludedFromDiscount 
        FROM ExpenseLineItems li
        JOIN Expenses e ON li.ExpenseID = e.ExpenseID
        WHERE e.PaymentMethodID = ? AND e.IsTentative = 0 ${dateFilter.replace(/ExpenseDate/g, 'e.ExpenseDate')}
      `, queryParams);

      for (const li of allLineItems) {
        if (!lineItemsMap.has(li.ReceiptID)) {
          lineItemsMap.set(li.ReceiptID, []);
        }
        lineItemsMap.get(li.ReceiptID)!.push(li);
      }
    }

    // 3. Calculate total expenses
    const totalExpenses = receiptsData.reduce((acc, r) => {
      if (r.IsNonItemised) {
        return acc + Number(r.NonItemisedTotal || 0);
      }
      const items = lineItemsMap.get(r.ReceiptID) || [];
      return acc + calculateTotalWithDiscount(items, Number(r.Discount || 0));
    }, 0);

    // 4. Fetch all income (deposits, transfers, repayments)
    const incomeParams: any[] = [methodId];
    let incomeDateFilter = '';
    if (options.startDate) {
      incomeDateFilter += ' AND IncomeDate >= ?';
      incomeParams.push(options.startDate);
    }
    if (options.endDate) {
      incomeDateFilter += ' AND IncomeDate <= ?';
      incomeParams.push(options.endDate);
    }

    const incomeResult = await db.queryOne<{ total: number }>(`
      SELECT SUM(IncomeAmount) as total 
      FROM Income 
      WHERE PaymentMethodID = ? ${incomeDateFilter}
    `, incomeParams);

    const totalIncome = Number(incomeResult?.total || 0);

    // 5. Final balance = Initial + Income - Expenses
    const balance = safeInitialFunds + totalIncome - totalExpenses;

    return {
      initialFunds: safeInitialFunds,
      totalIncome,
      totalExpenses,
      balance
    };
  } catch (error) {
    console.error(`Failed to calculate balance for method ${methodId}:`, error);
    return {
      initialFunds: Number(initialFunds || 0),
      totalIncome: 0,
      totalExpenses: 0,
      balance: Number(initialFunds || 0)
    };
  }
}
