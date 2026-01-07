import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getReceiptImagesByReceiptSql = readFileSync(resolve(__dirname, 'getReceiptImagesByReceipt.sql'), 'utf8');

export const getReceiptImagesByReceipt = async (receiptId: number) => {
  return await db.query(getReceiptImagesByReceiptSql, [receiptId]);
};
