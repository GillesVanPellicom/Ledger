import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getReceiptsCountSql = readFileSync(resolve(__dirname, 'getReceiptsCount.sql'), 'utf8');

export const getReceiptsCount = async () => {
  return await db.queryOne(getReceiptsCountSql);
};
