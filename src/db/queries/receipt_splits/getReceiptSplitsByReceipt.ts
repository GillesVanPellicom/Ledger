import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getReceiptSplitsByReceiptSql = readFileSync(resolve(__dirname, 'getReceiptSplitsByReceipt.sql'), 'utf8');

export const getReceiptSplitsByReceipt = async (receiptIds: number[]) => {
  const placeholders = receiptIds.map(() => '?').join(',');
  const sql = getReceiptSplitsByReceiptSql.replace('?', placeholders);
  return await db.query(sql, receiptIds);
};
