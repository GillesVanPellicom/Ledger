import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getTopUpsByPaymentMethodSql = readFileSync(resolve(__dirname, 'getTopUpsByPaymentMethod.sql'), 'utf8');

export const getTopUpsByPaymentMethod = async (paymentMethodId: number) => {
  return await db.queryOne(getTopUpsByPaymentMethodSql, [paymentMethodId]);
};
