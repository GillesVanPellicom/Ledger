import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getLineItemsByReceiptSql = readFileSync(resolve(__dirname, 'getLineItemsByReceipt.sql'), 'utf8');

export const getLineItemsByReceipt = async (receiptId: number) => {
  return await db.query(getLineItemsByReceiptSql, [receiptId]);
};
