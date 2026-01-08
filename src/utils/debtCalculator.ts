
import { db } from './db';
import { Receipt, LineItem, ReceiptSplit } from '../types';

async function calculateDebts(entityId: string | number) {
  const entityData = await db.queryOne<any>('SELECT * FROM Debtors WHERE DebtorID = ?', [entityId]);

  const allReceiptsForEntity = await db.query<any[]>(`
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
    db.query<any[]>(`SELECT * FROM ReceiptDebtorPayments WHERE ReceiptID IN (${placeholders})`, receiptIds),
  ]);

  const processedReceipts = allReceiptsForEntity.map(r => {
    let totalAmount = 0;
    if (r.IsNonItemised) {
      totalAmount = r.NonItemisedTotal;
    } else {
      const items = allLineItems.filter(li => li.ReceiptID === r.ReceiptID);
      const subtotal = items.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
      const discountableAmount = items
        .filter(item => !item.IsExcludedFromDiscount)
        .reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
      const discountAmount = (discountableAmount * (r.Discount || 0)) / 100;
      totalAmount = subtotal - discountAmount;
    }

    let amount = 0;
    let isSettled = false;

    if (r.type === 'to_entity') {
      amount = totalAmount;
      isSettled = r.Status === 'paid';
    } else { // to_me
      if (r.SplitType === 'total_split') {
        const splits = allSplits.filter(rs => rs.ReceiptID === r.ReceiptID);
        const debtorSplit = splits.find(rs => rs.DebtorID === Number(entityId));
        if (debtorSplit) {
          const totalShares = r.TotalShares > 0 ? r.TotalShares : (splits.reduce((sum, s) => sum + s.SplitPart, 0) + (r.OwnShares || 0));
          if (totalShares > 0) {
            amount = (totalAmount * debtorSplit.SplitPart) / totalShares;
          }
        }
      } else if (r.SplitType === 'line_item') {
        const debtorItems = allLineItems.filter(li => li.ReceiptID === r.ReceiptID && li.DebtorID === Number(entityId));
        amount = debtorItems.reduce((sum, item) => {
          const itemTotal = item.LineQuantity * item.LineUnitPrice;
          const itemDiscount = !item.IsExcludedFromDiscount ? (itemTotal * (r.Discount || 0)) / 100 : 0;
          return sum + (itemTotal - itemDiscount);
        }, 0);
      }
      isSettled = allPayments.some(p => p.ReceiptID === r.ReceiptID && p.DebtorID === Number(entityId));
    }
    return { ...r, amount, isSettled };
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

export { calculateDebts };
