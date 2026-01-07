import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertReceiptSql = readFileSync(resolve(__dirname, 'insertReceipt.sql'), 'utf8');

export const insertReceipt = async (date: string, storeId: number, note: string, paymentMethodId: number, splitType: string, ownShares: number, totalShares: number, status: string) => {
  return await db.execute(insertReceiptSql, [date, storeId, note, paymentMethodId, splitType, ownShares, totalShares, status]);
};
