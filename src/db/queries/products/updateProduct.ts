import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const updateProductSql = readFileSync(resolve(__dirname, 'updateProduct.sql'), 'utf8');

export const updateProduct = async (id: number, name: string, brand: string, size: string, unitId: number) => {
  return await db.execute(updateProductSql, [name, brand, size, unitId, id]);
};
