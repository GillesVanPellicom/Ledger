import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getAllPaymentMethodsSql = readFileSync(resolve(__dirname, 'getAllPaymentMethods.sql'), 'utf8');

export const getAllPaymentMethods = async () => {
  return await db.query(getAllPaymentMethodsSql);
};
