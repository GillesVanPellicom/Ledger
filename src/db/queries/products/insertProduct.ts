import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertProductSql = readFileSync(resolve(__dirname, 'insertProduct.sql'), 'utf8');

export const insertProduct = async (name: string, brand: string, size: string, unitId: number) => {
  return await db.execute(insertProductSql, [name, brand, size, unitId]);
};
