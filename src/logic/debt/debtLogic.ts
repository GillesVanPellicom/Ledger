import { db } from '../../utils/db';
import {Debtor, LineItem, Receipt, ReceiptDebtorPayment, ReceiptSplit} from '../../types';
import { calculateLineItemTotalWithDiscount, calculateTotalWithDiscount } from '../expense';

interface DebtReceipt extends Receipt {
  StoreName: string;
  type: 'to_entity' | 'to_me';
}

export interface ProcessedReceipt extends DebtReceipt {
  amount: number;
  isSettled: boolean;
  splitPart?: number;
  totalShares?: number;
}

export interface DebtorSummary {
  name: string;
  amount: number;
  debtorId: number;
  isPaid: boolean;
  shares?: number;
  totalShares?: number;
  itemCount?: number;
  totalItems?: number;
}

export interface DebtSummary {
  debtors: DebtorSummary[];
  ownShare: {
    amount: number;
    shares: number;
    totalShares: number;
  } | null;
}

export interface FormDebtSummary {
  debtors: {
    name: string;
    amount: number;
    debtorId?: number;
  }[];
  self: number | null;
}

/**
 * Calculates the total shares for a receipt based on own shares and debtor splits.
 * @param ownShares - The number of shares belonging to the user.
 * @param splits - An array of receipt splits with each debtor's share part.
 * @returns The total number of shares.
 */
export function calculateTotalShares(ownShares: number, splits: { SplitPart: number }[]): number {
  const debtorShares = splits.reduce((acc, curr) => acc + Number(curr.SplitPart || 0), 0);
  return debtorShares + (Number(ownShares) || 0);
}

/**
 * Calculates the debt summary for the receipt form.
 * This is a synchronous version for UI calculations.
 */
export function calculateDebtSummaryForForm(
  totalAmount: number,
  splitType: 'none' | 'total_split' | 'line_item',
  ownShares: number,
  receiptSplits: (ReceiptSplit & { DebtorName: string })[],
  lineItems: (LineItem & { DebtorName?: string })[],
  discount: number,
  debtors: Debtor[],
  totalShares?: number,
): FormDebtSummary {
  const summary: Record<string, any> = {};
  let selfAmount: number | null = null;

  if (splitType === 'total_split') {
    const totalSharesValue = totalShares ?? calculateTotalShares(ownShares, receiptSplits);
    if (totalSharesValue > 0) {
      receiptSplits.forEach(split => {
        const amount = (totalAmount * Number(split.SplitPart || 0)) / totalSharesValue;
        summary[split.DebtorName] = {
          name: split.DebtorName,
          amount: (summary[split.DebtorName]?.amount || 0) + amount,
          debtorId: split.DebtorID,
        };
      });
      if (ownShares > 0) {
        selfAmount = (totalAmount * Number(ownShares)) / totalSharesValue;
      }
    }
  } else if (splitType === 'line_item') {
    lineItems.forEach(item => {
      if (item.DebtorID) {
        const debtor = debtors.find(d => d.DebtorID === item.DebtorID);
        const debtorName = (item as any).DebtorName || debtor?.DebtorName;

        if (debtorName) {
          const itemAmount = calculateLineItemTotalWithDiscount(item, discount);
          summary[debtorName] = {
            name: debtorName,
            amount: (summary[debtorName]?.amount || 0) + itemAmount,
            debtorId: item.DebtorID
          };
        }
      }
    });
  }

  return {
    debtors: Object.values(summary),
    self: selfAmount
  };
}

/**
 * Calculates the debts for a given entity.
 * This function fetches all receipts related to the entity, calculates the amount owed by or to the entity for each receipt,
 * and then aggregates these amounts to determine the total debt to the entity, the total debt to the current user, and the net balance.
 *
 * @param entityId - The ID of the entity for whom to calculate debts.
 * @returns An object containing the list of processed receipts, the total debt to the entity, the total debt to the current user, and the net balance.
 */
async function calculateDebts(entityId: string | number) {
  const allReceiptsForEntity = await db.query<DebtReceipt[]>(`
    SELECT r.*, s.StoreName,
      CASE WHEN r.OwedToDebtorID = ? THEN 'to_entity' ELSE 'to_me' END as type
    FROM Receipts r
    JOIN Stores s ON r.StoreID = s.StoreID
    WHERE (r.OwedToDebtorID = ? OR
          (r.SplitType = 'line_item' AND r.ReceiptID IN (SELECT li.ReceiptID FROM LineItems li WHERE li.DebtorID = ?)) OR
          (r.SplitType = 'total_split' AND r.ReceiptID IN (SELECT rs.ReceiptID FROM ReceiptSplits rs WHERE rs.DebtorID = ?)))
          AND r.IsTentative = 0
  `, [entityId, entityId, entityId, entityId]);

  if (allReceiptsForEntity.length === 0) {
    return {
      receipts: [],
      debtToEntity: 0,
      debtToMe: 0,
      netBalance: 0,
    };
  }

  const receiptIds = allReceiptsForEntity.map(r => r.ReceiptID);
  const placeholders = receiptIds.map(() => '?').join(',');

  const [allLineItems, allSplits, allPayments] = await Promise.all([
    db.query<LineItem[]>(`SELECT * FROM LineItems WHERE ReceiptID IN (${placeholders})`, receiptIds),
    db.query<ReceiptSplit[]>(`SELECT * FROM ReceiptSplits WHERE ReceiptID IN (${placeholders})`, receiptIds),
    db.query<ReceiptDebtorPayment[]>(`SELECT * FROM ReceiptDebtorPayments WHERE ReceiptID IN (${placeholders})`, receiptIds),
  ]);

  const processedReceipts: ProcessedReceipt[] = allReceiptsForEntity.map(r => {
    let totalAmount = 0;
    if (r.IsNonItemised) {
      totalAmount = r.NonItemisedTotal;
    } else {
      const items = allLineItems.filter(li => li.ReceiptID === r.ReceiptID);
      totalAmount = calculateTotalWithDiscount(items, r.Discount || 0);
    }

    let amount = 0;
    let isSettled = false;
    let splitPart: number | undefined;
    let totalShares: number | undefined;

    if (r.type === 'to_entity') {
      amount = totalAmount;
      isSettled = r.Status === 'paid';
    } else { // to_me
      if (r.SplitType === 'total_split') {
        const splits = allSplits.filter(rs => rs.ReceiptID === r.ReceiptID);
        const debtorSplit = splits.find(rs => rs.DebtorID === Number(entityId));
        if (debtorSplit) {
          totalShares = r.TotalShares > 0 ? r.TotalShares : calculateTotalShares(r.OwnShares || 0, splits);
          splitPart = debtorSplit.SplitPart;
          if (totalShares > 0) {
            amount = (totalAmount * debtorSplit.SplitPart) / totalShares;
          }
        }
      } else if (r.SplitType === 'line_item') {
        const debtorItems = allLineItems.filter(li => li.ReceiptID === r.ReceiptID && li.DebtorID === Number(entityId));
        amount = debtorItems.reduce((sum, item) => {
          return sum + calculateLineItemTotalWithDiscount(item, r.Discount || 0);
        }, 0);
      }
      isSettled = allPayments.some(p => p.ReceiptID === r.ReceiptID && p.DebtorID === Number(entityId));
    }
    return { ...r, amount, isSettled, splitPart, totalShares };
  });

  const debtToEntity = processedReceipts
    .filter(r => r.type === 'to_entity' && !r.isSettled)
    .reduce((sum, r) => sum + r.amount, 0);

  const debtToMe = processedReceipts
    .filter(r => r.type === 'to_me' && !r.isSettled)
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    receipts: processedReceipts.sort((a, b) => new Date(b.ReceiptDate).getTime() - new Date(a.ReceiptDate).getTime()),
    debtToEntity,
    debtToMe,
    netBalance: debtToMe - debtToEntity,
  };
}

export async function calculateDebtsForReceipt(receiptId: string | number, receipt: Receipt, lineItems: LineItem[], receiptSplits: ReceiptSplit[], payments: ReceiptDebtorPayment[]): Promise<DebtSummary> {
  if (!receipt) {
    return { debtors: [], ownShare: null };
  }

  const totalAmount = receipt.IsNonItemised
    ? receipt.NonItemisedTotal
    : calculateTotalWithDiscount(lineItems, receipt.Discount || 0);

  const summary: Record<string, any> = {};
  let ownShare: any = null;

  if (receipt.SplitType === 'total_split' && (receiptSplits.length > 0 || (receipt.OwnShares && receipt.OwnShares > 0))) {
    const totalShares = receipt.TotalShares > 0
      ? receipt.TotalShares
      : calculateTotalShares(receipt.OwnShares || 0, receiptSplits);

    receiptSplits.forEach(split => {
      const amount = (totalAmount * split.SplitPart) / totalShares;
      summary[split.DebtorID] = {
        name: split.DebtorName,
        amount: (summary[split.DebtorID]?.amount || 0) + amount,
        debtorId: split.DebtorID,
        shares: split.SplitPart,
        totalShares: totalShares,
      };
    });

    if (receipt.OwnShares && receipt.OwnShares > 0) {
      const ownAmount = (totalAmount * receipt.OwnShares) / totalShares;
      ownShare = {
        amount: ownAmount,
        shares: receipt.OwnShares,
        totalShares: totalShares,
      };
    }
  } else if (receipt.SplitType === 'line_item' && !receipt.IsNonItemised) {
    const debtorItems: Record<string, { count: number, total: number }> = {};

    lineItems.forEach(item => {
      if (item.DebtorID) {
        const itemAmount = calculateLineItemTotalWithDiscount(item, receipt.Discount || 0);

        if (!debtorItems[String(item.DebtorID)]) {
          debtorItems[String(item.DebtorID)] = { count: 0, total: 0 };
        }
        debtorItems[String(item.DebtorID)].count += 1;
        debtorItems[String(item.DebtorID)].total += itemAmount;

        summary[String(item.DebtorID)] = {
          name: item.DebtorName,
          amount: debtorItems[String(item.DebtorID)].total,
          debtorId: item.DebtorID,
          itemCount: debtorItems[String(item.DebtorID)].count,
          totalItems: lineItems.length,
        };
      }
    });
  }

  const debtors = Object.values(summary).map(d => ({
    ...d,
    isPaid: payments.some(p => p.DebtorID === d.debtorId)
  }));

  return { debtors, ownShare };
}

export { calculateDebts };
