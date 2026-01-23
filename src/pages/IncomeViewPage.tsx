import React, {useState, useMemo} from 'react';
import {useParams, useNavigate, Link} from 'react-router-dom';
import {format, parseISO} from 'date-fns';
import {db} from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  CreditCard,
  User,
  ArrowDownLeft,
  HandCoins,
  Wallet,
  Receipt
} from 'lucide-react';
import {cn} from '../utils/cn';
import Tooltip from '../components/ui/Tooltip';
import {ConfirmModal} from '../components/ui/Modal';
import {Header} from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import {useErrorStore} from '../store/useErrorStore';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import Badge from '../components/ui/Badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const IncomeViewPage: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {showError} = useErrorStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  // Fetch transaction details
  const {data: transaction, isLoading} = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      // First check if it's a repayment (exists in ReceiptDebtorPayments)
      const repayment = await db.queryOne<any>(`
        SELECT rdp.*, 
               tu.TopUpAmount, 
               tu.TopUpDate, 
               tu.TopUpNote, 
               tu.PaymentMethodID,
               pm.PaymentMethodName,
               d.DebtorName,
               s.StoreName as ReceiptStoreName
        FROM ReceiptDebtorPayments rdp
        JOIN TopUps tu ON rdp.TopUpID = tu.TopUpID
        JOIN Debtors d ON rdp.DebtorID = d.DebtorID
        LEFT JOIN PaymentMethods pm ON tu.PaymentMethodID = pm.PaymentMethodID
        LEFT JOIN Receipts r ON rdp.ReceiptID = r.ReceiptID
        LEFT JOIN Stores s ON r.StoreID = s.StoreID
        WHERE rdp.PaymentID = ?
      `, [id]);

      if (repayment) {
        return {
          id: repayment.PaymentID,
          type: 'repayment',
          date: repayment.TopUpDate,
          amount: repayment.TopUpAmount,
          description: `Repayment from ${repayment.DebtorName}`,
          category: null,
          method: repayment.PaymentMethodName,
          paymentMethodId: repayment.PaymentMethodID,
          note: repayment.TopUpNote,
          debtorId: repayment.DebtorID,
          debtorName: repayment.DebtorName,
          topUpId: repayment.TopUpID,
          receiptId: repayment.ReceiptID,
          receiptStoreName: repayment.ReceiptStoreName
        };
      }

      // If not a repayment, try to find it as a regular income (TopUp)
      const topUp = await db.queryOne<any>(`
        SELECT t.*, 
               s.IncomeSourceName, 
               c.IncomeCategoryName,
               pm.PaymentMethodName
        FROM TopUps t
        LEFT JOIN IncomeSources s ON t.IncomeSourceID = s.IncomeSourceID
        LEFT JOIN IncomeCategories c ON t.IncomeCategoryID = c.IncomeCategoryID
        LEFT JOIN PaymentMethods pm ON t.PaymentMethodID = pm.PaymentMethodID
        WHERE t.TopUpID = ?
      `, [id]);

      if (topUp) {
        return {
          id: topUp.TopUpID,
          type: 'income',
          date: topUp.TopUpDate,
          amount: topUp.TopUpAmount,
          description: topUp.IncomeSourceName || 'Income',
          category: topUp.IncomeCategoryName,
          method: topUp.PaymentMethodName,
          paymentMethodId: topUp.PaymentMethodID,
          note: topUp.TopUpNote,
          debtorId: null,
          debtorName: null,
          topUpId: topUp.TopUpID,
          receiptId: null
        };
      }
      
      return null;
    }
  });

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      if (transaction.type === 'repayment') {
        await db.execute('DELETE FROM ReceiptDebtorPayments WHERE PaymentID = ?', [transaction.id]);
        if (transaction.topUpId) {
            await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [transaction.topUpId]);
        }
      } else {
        await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [transaction.id]);
      }
      
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate(-1);
    } catch (error) {
      showError(error as Error);
    } finally {
      setDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner className="h-8 w-8 text-accent"/>
      </div>
    );
  }

  if (!transaction) {
    return <div className="text-center text-font-1">Transaction not found.</div>;
  }

  return (
    <div>
      <Header
        title={transaction.description}
        subtitle={format(parseISO(transaction.date), 'EEEE, MMMM d, yyyy')}
        backButton={
          <Tooltip content="Go Back">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5"/>
            </Button>
          </Tooltip>
        }
        actions={
          <>
            <Tooltip content="Delete">
              <Button variant="ghost" size="icon" onClick={() => setDeleteModalOpen(true)}>
                <Trash2 className="h-5 w-5"/>
              </Button>
            </Tooltip>
          </>
        }
      />
      <PageWrapper>
        <div className="py-6 flex justify-center">
          <div className="w-full max-w-4xl space-y-6">
            {transaction.note && (
              <Card>
                <div className="p-4">
                  <p className="text-base text-font-1 whitespace-pre-wrap break-words">{transaction.note}</p>
                </div>
              </Card>
            )}

            <Card>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Amount */}
                  <div className="sm:col-start-1 sm:row-start-1">
                    <p className="text-sm text-font-2">Amount</p>
                    <MoneyDisplay 
                      amount={transaction.amount} 
                      className="text-2xl font-bold text-font-1" 
                      colorPositive={true}
                    />
                  </div>

                  {/* Badge */}
                  <div className="flex flex-col items-start sm:items-end gap-2 sm:col-start-2 sm:row-start-1">
                    <Badge variant="green">
                      {transaction.type === 'income' ? 'Income' : 'Repayment'}
                    </Badge>
                  </div>

                  {/* Details List */}
                  <div className="flex flex-col gap-4 sm:col-start-1 sm:row-start-2">
                    {/* Date */}
                    <Tooltip content="The date this transaction occurred">
                      <div className="flex items-center gap-3 cursor-help w-fit">
                        <Calendar className="h-5 w-5 text-font-2" />
                        <span className="text-sm text-font-1">{format(parseISO(transaction.date), 'MMM d, yyyy')}</span>
                      </div>
                    </Tooltip>

                    {/* Payment Method */}
                    <Tooltip content="The method used for this transaction">
                      <div className="flex items-center gap-3 cursor-help w-fit">
                        <CreditCard className="h-5 w-5 text-font-2" />
                        {transaction.paymentMethodId ? (
                          <Link to={`/payment-methods/${transaction.paymentMethodId}`} className="text-sm text-font-1 hover:underline flex items-center gap-1">
                            {transaction.method}
                          </Link>
                        ) : (
                          <span className="text-sm text-font-1">N/A</span>
                        )}
                      </div>
                    </Tooltip>

                    {/* Category (Income only) */}
                    {transaction.type === 'income' && transaction.category && (
                      <Tooltip content="The category of this income">
                        <div className="flex items-center gap-3 cursor-help w-fit">
                          <Wallet className="h-5 w-5 text-font-2" />
                          <span className="text-sm text-font-1">{transaction.category}</span>
                        </div>
                      </Tooltip>
                    )}

                    {/* Debtor (Repayment only) */}
                    {transaction.type === 'repayment' && (
                      <Tooltip content="The person who made this repayment">
                        <div className="flex items-center gap-3 cursor-help w-fit">
                          <User className="h-5 w-5 text-font-2" />
                          <Link to={`/entities/${transaction.debtorId}`} className="text-sm text-font-1 hover:underline flex items-center gap-1">
                            {transaction.debtorName}
                          </Link>
                        </div>
                      </Tooltip>
                    )}

                    {/* Receipt Link (Repayment only) */}
                    {transaction.type === 'repayment' && transaction.receiptId && (
                      <Tooltip content="The expense this repayment is associated with">
                        <div className="flex items-center gap-3 cursor-help w-fit">
                          <Receipt className="h-5 w-5 text-font-2" />
                          <Link to={`/receipts/view/${transaction.receiptId}`} className="text-sm text-font-1 hover:underline flex items-center gap-1">
                            {transaction.receiptStoreName || 'View Expense'}
                          </Link>
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </PageWrapper>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction? This action cannot be undone."
      />
    </div>
  );
};

export default IncomeViewPage;
