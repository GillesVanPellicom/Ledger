import { db } from '../../db';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const deleteReceiptDebtorPaymentSql = readFileSync(resolve(__dirname, 'deleteReceiptDebtorPayment.sql'), 'utf8');

export const deleteReceiptDebtorPayment = async (receiptId: number, debtorId: number) => {
  return await db.execute(deleteReceiptDebtorPaymentSql, [receiptId, debtorId]);
};
