import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertPaymentMethodSql = readFileSync(resolve(__dirname, 'insertPaymentMethod.sql'), 'utf8');

export const insertPaymentMethod = async (name: string, funds: number, isActive: boolean) => {
  return await db.execute(insertPaymentMethodSql, [name, funds, isActive]);
};
