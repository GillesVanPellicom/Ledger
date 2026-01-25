import { db } from '../utils/db';
import { calculateTotalWithDiscount } from './expense/discountLogic';
import { LineItem } from '../types';

/**
 * Calculates the current balance for a payment method by summing all transactions.
 * This logic is shared between the PaymentMethodsPage and PaymentMethodDetailsPage.
 * 
 * @param methodId - The ID of the payment method.
 * @param initialFunds - The starting funds for the payment method.
 * @returns The calculated current balance.
 */
export async function calculatePaymentMethodBalance(methodId: number, initialFunds: number): Promise<number> {
  // 1. Fetch all receipts (expenses) for this method
  const receiptsData = await db.query<any>(`
    SELECT r.ExpenseID as id, r.Discount, r.IsNonItemised, r.NonItemisedTotal
    FROM Expenses r
    WHERE r.PaymentMethodID = ? AND r.IsTentative = 0
  `, [methodId]);

  const receiptIds = receiptsData.map(r => r.id);
  
  // 2. Fetch line items for these receipts to calculate totals with discounts
  const allLineItems = receiptIds.length > 0
    ? await db.query<LineItem>(`
        SELECT ExpenseID as ReceiptID, LineQuantity, LineUnitPrice, IsExcludedFromDiscount 
        FROM ExpenseLineItems 
        WHERE ExpenseID IN (${receiptIds.map(() => '?').join(',')})
      `, receiptIds)
    : [];

  // 3. Calculate total expenses
  const totalExpenses = receiptsData.reduce((acc, r) => {
    if (r.IsNonItemised) {
      return acc + (r.NonItemisedTotal || 0);
    }
    const items = allLineItems.filter(li => li.ReceiptID === r.id);
    return acc + calculateTotalWithDiscount(items, r.Discount || 0);
  }, 0);

  // 4. Fetch all income (deposits, transfers, repayments)
  const incomeResult = await db.queryOne<{ total: number }>(`
    SELECT SUM(IncomeAmount) as total 
    FROM Income 
    WHERE PaymentMethodID = ?
  `, [methodId]);

  const totalIncome = incomeResult?.total || 0;

  // 5. Final balance = Initial + Income - Expenses
  return initialFunds + totalIncome - totalExpenses;
}
