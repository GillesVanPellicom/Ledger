import { db } from '../utils/db';
import { LineItem, Receipt, ReceiptImage, ReceiptSplit, ReceiptDebtorPayment } from '../types';

// --- Calculations ---

/**
 * Calculates the subtotal of a list of line items.
 * @param items - The line items.
 * @returns The sum of the line item totals.
 */
export function calculateSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
}

/**
 * Calculates the total number of unique items.
 * @param items - The line items.
 * @returns The number of line items.
 */
export function calculateTotalItems(items: LineItem[]): number {
  return items.length;
}

/**
 * Calculates the total quantity of all items.
 * @param items - The line items.
 * @returns The sum of all line item quantities.
 */
export function calculateTotalQuantity(items: LineItem[]): number {
  return items.reduce((total, item) => total + item.LineQuantity, 0);
}

/**
 * Calculates the total discount for a given set of line items and a discount percentage.
 * @param items - The line items to calculate the discount for.
 * @param discountPercentage - The discount percentage to apply.
 * @returns The total discount amount.
 */
export function calculateDiscount(items: LineItem[], discountPercentage: number): number {
  if (!discountPercentage) {
    return 0;
  }

  const discountableAmount = items
    .filter(item => !item.IsExcludedFromDiscount)
    .reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);

  return (discountableAmount * discountPercentage) / 100;
}

/**
 * Calculates the total amount for a given set of line items, taking into account discounts.
 * @param items - The line items to calculate the total for.
 * @param discountPercentage - The discount percentage to apply.
 * @returns The total amount after discounts.
 */
export function calculateTotalWithDiscount(items: LineItem[], discountPercentage: number): number {
  const subtotal = calculateSubtotal(items);
  const discountAmount = calculateDiscount(items, discountPercentage);
  return subtotal - discountAmount;
}

/**
 * Calculates the total amount for a single line item, taking into account discounts.
 * @param item - The line item to calculate the total for.
 * @param discountPercentage - The discount percentage to apply.
 * @returns The total amount for the line item after discounts.
 */
export function calculateLineItemTotalWithDiscount(item: LineItem, discountPercentage: number): number {
    const itemTotal = item.LineQuantity * item.LineUnitPrice;
    if (!discountPercentage || item.IsExcludedFromDiscount) {
        return itemTotal;
    }
    const itemDiscount = (itemTotal * discountPercentage) / 100;
    return itemTotal - itemDiscount;
}


// --- Database Operations ---

/**
 * Fetches a single receipt and its related data from the database.
 * @param id - The ID of the receipt to fetch.
 * @returns An object containing the receipt and its related data, or null if not found.
 */
export async function getReceipt(id: string): Promise<{
  receipt: Receipt;
  lineItems: (LineItem & { CategoryName: string; CategoryID: number })[];
  images: ReceiptImage[];
  splits: ReceiptSplit[];
  payments: ReceiptDebtorPayment[];
} | null> {
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
    ? await db.query<(LineItem & { CategoryName: string; CategoryID: number })>(`
        SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorName, d.DebtorID, c.CategoryName, c.CategoryID
        FROM LineItems li
                 JOIN Products p ON li.ProductID = p.ProductID
                 LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
                 LEFT JOIN Debtors d ON li.DebtorID = d.DebtorID
                 LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
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
}

/**
 * Deletes one or more receipts from the database.
 * @param ids - An array of receipt IDs to delete.
 */
export async function deleteReceipts(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.execute(`DELETE FROM Receipts WHERE ReceiptID IN (${placeholders})`, ids);
}
