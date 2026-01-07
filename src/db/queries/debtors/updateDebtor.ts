import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const updateDebtorSql = readFileSync(resolve(__dirname, 'updateDebtor.sql'), 'utf8');

export const updateDebtor = async (id: number, name: string, isActive: boolean) => {
  return await db.execute(updateDebtorSql, [name, isActive, id]);
};
