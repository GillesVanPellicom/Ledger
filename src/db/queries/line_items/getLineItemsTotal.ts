import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getLineItemsTotalSql = readFileSync(resolve(__dirname, 'getLineItemsTotal.sql'), 'utf8');

export const getLineItemsTotal = async () => {
  return await db.queryOne(getLineItemsTotalSql);
};
