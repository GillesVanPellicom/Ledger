import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getAllStoresSql = readFileSync(resolve(__dirname, 'getAllStores.sql'), 'utf8');

export const getAllStores = async () => {
  return await db.query(getAllStoresSql);
};
