import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getAllProductUnitsSql = readFileSync(resolve(__dirname, 'getAllProductUnits.sql'), 'utf8');

export const getAllProductUnits = async () => {
  return await db.query(getAllProductUnitsSql);
};
