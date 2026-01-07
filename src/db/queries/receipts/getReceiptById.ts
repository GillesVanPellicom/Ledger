import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getReceiptByIdSql = readFileSync(resolve(__dirname, 'getReceiptById.sql'), 'utf8');

export const getReceiptById = async (id: number) => {
  return await db.queryOne(getReceiptByIdSql, [id]);
};
