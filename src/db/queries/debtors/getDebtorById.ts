import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getDebtorByIdSql = readFileSync(resolve(__dirname, 'getDebtorById.sql'), 'utf8');

export const getDebtorById = async (id: number) => {
  return await db.queryOne(getDebtorByIdSql, [id]);
};
