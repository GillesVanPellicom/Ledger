import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getAllReceiptsSql = readFileSync(resolve(__dirname, 'getAllReceipts.sql'), 'utf8');

export const getAllReceipts = async () => {
  return await db.query(getAllReceiptsSql);
};
