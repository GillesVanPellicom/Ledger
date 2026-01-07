import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getPaymentMethodByIdSql = readFileSync(resolve(__dirname, 'getPaymentMethodById.sql'), 'utf8');

export const getPaymentMethodById = async (id: number) => {
  return await db.queryOne(getPaymentMethodByIdSql, [id]);
};
