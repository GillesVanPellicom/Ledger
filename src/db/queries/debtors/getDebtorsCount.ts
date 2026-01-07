import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getDebtorsCountSql = readFileSync(resolve(__dirname, 'getDebtorsCount.sql'), 'utf8');

export const getDebtorsCount = async () => {
  return await db.queryOne(getDebtorsCountSql);
};
