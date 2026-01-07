import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const updateStoreSql = readFileSync(resolve(__dirname, 'updateStore.sql'), 'utf8');

export const updateStore = async (id: number, name: string, isActive: boolean) => {
  return await db.execute(updateStoreSql, [name, isActive, id]);
};
