import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const insertReceiptDebtorPaymentSql = readFileSync(resolve(__dirname, 'insertReceiptDebtorPayment.sql'), 'utf8');

export const insertReceiptDebtorPayment = async (receiptId: number, debtorId: number, paidDate: string, topUpId: number) => {
  return await db.execute(insertReceiptDebtorPaymentSql, [receiptId, debtorId, paidDate, topUpId]);
};
