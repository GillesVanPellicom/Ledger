import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertDebtorSql = readFileSync(resolve(__dirname, 'insertDebtor.sql'), 'utf8');

export const insertDebtor = async (name: string, isActive: boolean) => {
  return await db.execute(insertDebtorSql, [name, isActive]);
};
