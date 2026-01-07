import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertReceiptImageSql = readFileSync(resolve(__dirname, 'insertReceiptImage.sql'), 'utf8');

export const insertReceiptImage = async (receiptId: number, imagePath: string) => {
  return await db.execute(insertReceiptImageSql, [receiptId, imagePath]);
};
