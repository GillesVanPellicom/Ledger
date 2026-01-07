import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const deleteReceiptsSql = readFileSync(resolve(__dirname, 'deleteReceipts.sql'), 'utf8');

export const deleteReceipts = async (ids: number[]) => {
  const placeholders = ids.map(() => '?').join(',');
  const sql = deleteReceiptsSql.replace('?', placeholders);
  return await db.execute(sql, ids);
};
