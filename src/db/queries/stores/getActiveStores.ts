import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getActiveStoresSql = readFileSync(resolve(__dirname, 'getActiveStores.sql'), 'utf8');

export const getActiveStores = async () => {
  return await db.query(getActiveStoresSql);
};
