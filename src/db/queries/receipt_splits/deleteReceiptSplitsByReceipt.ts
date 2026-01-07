import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const deleteReceiptSplitsByReceiptSql = readFileSync(resolve(__dirname, 'deleteReceiptSplitsByReceipt.sql'), 'utf8');

export const deleteReceiptSplitsByReceipt = async (receiptId: number) => {
  return await db.execute(deleteReceiptSplitsByReceiptSql, [receiptId]);
};
