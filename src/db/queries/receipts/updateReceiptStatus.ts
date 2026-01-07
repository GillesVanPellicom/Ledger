import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const updateReceiptStatusSql = readFileSync(resolve(__dirname, 'updateReceiptStatus.sql'), 'utf8');

export const updateReceiptStatus = async (id: number, status: string, paymentMethodId: number) => {
  return await db.execute(updateReceiptStatusSql, [status, paymentMethodId, id]);
};
