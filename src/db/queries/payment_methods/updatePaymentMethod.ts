import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const updatePaymentMethodSql = readFileSync(resolve(__dirname, 'updatePaymentMethod.sql'), 'utf8');

export const updatePaymentMethod = async (id: number, name: string, isActive: boolean) => {
  return await db.execute(updatePaymentMethodSql, [name, isActive, id]);
};
