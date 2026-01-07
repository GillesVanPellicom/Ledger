import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const updateTopUpSql = readFileSync(resolve(__dirname, 'updateTopUp.sql'), 'utf8');

export const updateTopUp = async (id: number, amount: number, date: string, note: string) => {
  return await db.execute(updateTopUpSql, [amount, date, note, id]);
};
