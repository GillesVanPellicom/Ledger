import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertReceiptSplitSql = readFileSync(resolve(__dirname, 'insertReceiptSplit.sql'), 'utf8');

export const insertReceiptSplit = async (receiptId: number, debtorId: number, splitPart: number) => {
  return await db.execute(insertReceiptSplitSql, [receiptId, debtorId, splitPart]);
};
