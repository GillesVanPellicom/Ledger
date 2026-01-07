import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getActiveDebtorsSql = readFileSync(resolve(__dirname, 'getActiveDebtors.sql'), 'utf8');

export const getActiveDebtors = async () => {
  return await db.query(getActiveDebtorsSql);
};
