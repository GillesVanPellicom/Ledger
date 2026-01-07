import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertStoreSql = readFileSync(resolve(__dirname, 'insertStore.sql'), 'utf8');

export const insertStore = async (name: string, isActive: boolean) => {
  return await db.execute(insertStoreSql, [name, isActive]);
};
