import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const getReceiptDebtorPaymentSql = readFileSync(resolve(__dirname, 'getReceiptDebtorPayment.sql'), 'utf8');

export const getReceiptDebtorPayment = async (receiptId: number) => {
  return await db.queryOne(getReceiptDebtorPaymentSql, [receiptId]);
};
