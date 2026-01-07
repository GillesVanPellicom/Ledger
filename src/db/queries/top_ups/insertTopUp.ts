import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertTopUpSql = readFileSync(resolve(__dirname, 'insertTopUp.sql'), 'utf8');

export const insertTopUp = async (paymentMethodId: number, amount: number, date: string, note: string) => {
  return await db.execute(insertTopUpSql, [paymentMethodId, amount, date, note]);
};
