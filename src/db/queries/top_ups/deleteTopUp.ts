import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const deleteTopUpSql = readFileSync(resolve(__dirname, 'deleteTopUp.sql'), 'utf8');

export const deleteTopUp = async (id: number) => {
  return await db.execute(deleteTopUpSql, [id]);
};
