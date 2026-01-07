import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getReceiptsByDebtorSql = readFileSync(resolve(__dirname, 'getReceiptsByDebtor.sql'), 'utf8');

export const getReceiptsByDebtor = async (debtorId: number) => {
  return await db.query(getReceiptsByDebtorSql, [debtorId]);
};
