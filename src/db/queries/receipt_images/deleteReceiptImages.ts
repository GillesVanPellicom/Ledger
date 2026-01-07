import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const deleteReceiptImagesSql = readFileSync(resolve(__dirname, 'deleteReceiptImages.sql'), 'utf8');

export const deleteReceiptImages = async (receiptId: number, imagePaths: string[]) => {
  const placeholders = imagePaths.map(() => '?').join(',');
  const sql = deleteReceiptImagesSql.replace('?', placeholders);
  return await db.execute(sql, [receiptId, ...imagePaths]);
};
