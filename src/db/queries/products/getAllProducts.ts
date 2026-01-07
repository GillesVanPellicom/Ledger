import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getAllProductsSql = readFileSync(resolve(__dirname, 'getAllProducts.sql'), 'utf8');

export const getAllProducts = async () => {
  return await db.query(getAllProductsSql);
};
