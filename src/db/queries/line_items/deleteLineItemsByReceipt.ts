import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const deleteLineItemsByReceiptSql = readFileSync(resolve(__dirname, 'deleteLineItemsByReceipt.sql'), 'utf8');

export const deleteLineItemsByReceipt = async (receiptId: number) => {
  return await db.execute(deleteLineItemsByReceiptSql, [receiptId]);
};
