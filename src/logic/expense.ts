import {db} from '../utils/db';
import {LineItem, Receipt, ReceiptImage, ReceiptSplit, ReceiptDebtorPayment} from '../types';

// --- Calculations ---

/**
 * Calculates the subtotal of a list of line items.
 */
export function calculateSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
}

/**
 * Calculates the total number of unique items.
 */
export function calculateTotalItems(items: LineItem[]): number {
  return items.length;
}

/**
 * Calculates the total quantity of all items.
 */
export function calculateTotalQuantity(items: LineItem[]): number {
  return items.reduce((total, item) => total + item.LineQuantity, 0);
}

/**
 * Calculates the total discount for a given set of line items and a discount percentage.
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
 */
export function calculateTotalWithDiscount(items: LineItem[], discountPercentage: number): number {
  const subtotal = calculateSubtotal(items);
  if (!discountPercentage) return subtotal;
  const discountAmount = calculateDiscount(items, discountPercentage);
  return subtotal - discountAmount;
}

/**
 * Calculates the total amount for a single line item, taking into account discounts.
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
 * Optimized to fetch related data only when needed or in batch.
 */
export async function getReceipt(id: string, options: { includeImages?: boolean } = {}): Promise<{
  receipt: Receipt;
  lineItems: (LineItem & { CategoryName: string; CategoryID: number })[];
  images: ReceiptImage[];
  splits: ReceiptSplit[];
  payments: ReceiptDebtorPayment[];
} | null> {
  const receiptData = await db.queryOne<Receipt>(`
      SELECT r.ExpenseID      as ReceiptID,
             r.ExpenseDate    as ReceiptDate,
             r.ExpenseNote    as ReceiptNote,
             r.Discount,
             r.IsNonItemised,
             r.IsTentative,
             r.NonItemisedTotal,
             r.PaymentMethodID,
             r.Status,
             r.SplitType,
             r.OwnShares,
             r.TotalShares,
             r.OwedToEntityID as OwedToDebtorID,
             r.CreationTimestamp,
             r.UpdatedAt,
             r.RecipientID    as StoreID,
             s.EntityName     as StoreName,
             pm.PaymentMethodName,
             d.EntityName     as OwedToDebtorName
      FROM Expenses r
               JOIN Entities s ON r.RecipientID = s.EntityID
               LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
               LEFT JOIN Entities d ON r.OwedToEntityID = d.EntityID
      WHERE r.ExpenseID = ?
  `, [id]);

  if (!receiptData) return null;

  // Fetch related data in parallel
  const [lineItems, images, splits, payments] = await Promise.all([
    receiptData.IsNonItemised
      ? Promise.resolve([])
      : db.query<(LineItem & { CategoryName: string; CategoryID: number })>(`
                SELECT li.ExpenseLineItemID as LineItemID,
                       li.ExpenseID as ReceiptID,
                       li.ProductID,
                       li.LineQuantity,
                       li.LineUnitPrice,
                       li.EntityID as DebtorID,
                       li.IsExcludedFromDiscount,
                       li.CreationTimestamp,
                       li.UpdatedAt,
                       p.ProductName,
                       p.ProductBrand,
                       p.ProductSize,
                       pu.ProductUnitType,
                       d.EntityName         as DebtorName,
                       d.EntityID           as DebtorID,
                       c.CategoryName       as CategoryName,
                       c.CategoryID         as CategoryID
                FROM ExpenseLineItems li
                         JOIN Products p ON li.ProductID = p.ProductID
                         LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
                         LEFT JOIN Entities d ON li.EntityID = d.EntityID
                         LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
                WHERE li.ExpenseID = ?
      `, [id]),

    options.includeImages
      ? db.query<ReceiptImage>('SELECT ExpenseImageID as ImageID, ExpenseID as ReceiptID, ImagePath, CreationTimestamp, UpdatedAt FROM ExpenseImages WHERE ExpenseID = ?', [id])
      : Promise.resolve([]),

    receiptData.SplitType === 'total_split'
      ? db.query<ReceiptSplit>(`
                SELECT rs.ExpenseSplitID as SplitID,
                       rs.ExpenseID as ReceiptID,
                       rs.EntityID as DebtorID,
                       rs.SplitPart,
                       rs.CreationTimestamp,
                       rs.UpdatedAt,
                       d.EntityName      as DebtorName
                FROM ExpenseSplits rs
                         JOIN Entities d ON rs.EntityID = d.EntityID
                WHERE rs.ExpenseID = ?
      `, [id])
      : Promise.resolve([]),

    db.query<ReceiptDebtorPayment>('SELECT ExpenseEntityPaymentID as PaymentID, ExpenseID as ReceiptID, EntityID as DebtorID, PaidDate, IncomeID as TopUpID, CreationTimestamp, UpdatedAt FROM ExpenseEntityPayments WHERE ExpenseID = ?', [id])
  ]);

  return {receipt: receiptData, lineItems, images, splits, payments};
}

/**
 * Deletes one or more receipts from the database.
 */
export async function deleteReceipts(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.execute(`DELETE
                    FROM Expenses
                    WHERE ExpenseID IN (${placeholders})`, ids);
}
