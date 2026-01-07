import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertLineItemSql = readFileSync(resolve(__dirname, 'insertLineItem.sql'), 'utf8');

export const insertLineItem = async (receiptId: number, productId: number, quantity: number, unitPrice: number, debtorId: number) => {
  return await db.execute(insertLineItemSql, [receiptId, productId, quantity, unitPrice, debtorId]);
};
