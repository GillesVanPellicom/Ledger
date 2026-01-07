import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getAllDebtorsSql = readFileSync(resolve(__dirname, 'getAllDebtors.sql'), 'utf8');

export const getAllDebtors = async () => {
  return await db.query(getAllDebtorsSql);
};
