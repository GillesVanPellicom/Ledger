import React, {useState} from 'react';
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
  Wallet,
  Receipt,
  FileText,
  Link as LinkIcon,
  Pencil
} from 'lucide-react';
import Tooltip from '../components/ui/Tooltip';
import {ConfirmModal} from '../components/ui/Modal';
import {Header} from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import IncomeModal from '../components/payment/IncomeModal';
import NotFoundState from '../components/ui/NotFoundState';

const IncomeViewPage: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Fetch transaction details
  const {data: transaction, isLoading} = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      // First check if it's a repayment (exists in ReceiptDebtorPayments)
      const repayment = await db.queryOne<any>(`
        SELECT rdp.*, 
               tu.IncomeAmount, 
               tu.IncomeDate, 
               tu.IncomeNote, 
               tu.PaymentMethodID,
               pm.PaymentMethodName,
               d.EntityName as DebtorName,
               s.EntityName as ReceiptStoreName
        FROM ExpenseEntityPayments rdp
        JOIN Income tu ON rdp.IncomeID = tu.IncomeID
        JOIN Entities d ON rdp.EntityID = d.EntityID
        LEFT JOIN PaymentMethods pm ON tu.PaymentMethodID = pm.PaymentMethodID
        LEFT JOIN Expenses r ON rdp.ExpenseID = r.ExpenseID
        LEFT JOIN Entities s ON r.RecipientID = s.EntityID
        WHERE rdp.ExpenseEntityPaymentID = ?
      `, [id]);

      if (repayment) {
        return {
          id: repayment.ExpenseEntityPaymentID,
          type: 'repayment',
          date: repayment.IncomeDate,
          amount: repayment.IncomeAmount,
          description: `Repayment from ${repayment.DebtorName}`,
          category: null,
          method: repayment.PaymentMethodName,
          paymentMethodId: repayment.PaymentMethodID,
          note: repayment.IncomeNote,
          debtorId: repayment.EntityID,
          debtorName: repayment.DebtorName,
          topUpId: repayment.IncomeID,
          receiptId: repayment.ExpenseID,
          receiptStoreName: repayment.ReceiptStoreName
        };
      }

      // If not a repayment, try to find it as a regular income (TopUp)
      const topUp = await db.queryOne<any>(`
        SELECT t.*, 
               s.EntityName as RecipientName, 
               c.CategoryName,
               pm.PaymentMethodName,
               d.EntityName as DebtorName
        FROM Income t
        LEFT JOIN Entities s ON t.RecipientID = s.EntityID
        LEFT JOIN Categories c ON t.CategoryID = c.CategoryID
        LEFT JOIN PaymentMethods pm ON t.PaymentMethodID = pm.PaymentMethodID
        LEFT JOIN Entities d ON t.EntityID = d.EntityID
        WHERE t.IncomeID = ?
      `, [id]);

      if (topUp) {
        return {
          id: topUp.IncomeID,
          type: 'income',
          date: topUp.IncomeDate,
          amount: topUp.IncomeAmount,
          description: topUp.RecipientName || 'Income',
          category: topUp.CategoryName,
          method: topUp.PaymentMethodName,
          paymentMethodId: topUp.PaymentMethodID,
          note: topUp.IncomeNote,
          debtorId: topUp.EntityID,
          debtorName: topUp.DebtorName,
          topUpId: topUp.IncomeID,
          receiptId: null,
          recipientId: topUp.RecipientID,
          categoryId: topUp.CategoryID
        };
      }
      
      return null;
    }
  });

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      if (transaction.type === 'repayment') {
        await db.execute('DELETE FROM ExpenseEntityPayments WHERE ExpenseEntityPaymentID = ?', [transaction.id]);
        if (transaction.topUpId) {
            await db.execute('DELETE FROM Income WHERE IncomeID = ?', [transaction.topUpId]);
        }
      } else {
        await db.execute('DELETE FROM Income WHERE IncomeID = ?', [transaction.id]);
      }
      
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate(-1);
    } catch (error) {
      throw error;
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
    return <NotFoundState title="Transaction Not Found" message="The income or repayment you're looking for might have been deleted or moved." />;
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
            <Tooltip content="Edit">
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)}>
                <Pencil className="h-5 w-5"/>
              </Button>
            </Tooltip>
          </>
        }
      />
      <PageWrapper>
        <div className="py-6 flex justify-center">
          <div className="w-full max-w-4xl space-y-6">
            {transaction.note && (
              <Card className="mb-6">
                <div className="p-4 flex items-start gap-3">
                  <Tooltip content="Note about the contents of this page">
                    <FileText className="h-5 w-5 text-font-2 shrink-0 mt-0.5" />
                  </Tooltip>
                  <p className="text-base text-font-1 whitespace-pre-wrap break-words">{transaction.note}</p>
                </div>
              </Card>
            )}

            <Card>
              <div className="p-8">
                <div className="flex flex-col items-center gap-8">
                  {/* Amount */}
                  <div className="text-center">
                    <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Amount</p>
                    <MoneyDisplay 
                      amount={transaction.amount} 
                      className="text-4xl font-bold text-font-1" 
                      colorPositive={true}
                      useSignum={true}
                      showSign={true}
                    />
                  </div>

                  {/* Details List */}
                  <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-8 border-t border-border w-full">
                    {/* Date */}
                    <Tooltip content="The date this transaction occurred">
                      <div className="flex items-center gap-3 cursor-help">
                        <Calendar className="h-5 w-5 text-font-2" />
                        <span className="text-sm text-font-1">{format(parseISO(transaction.date), 'MMM d, yyyy')}</span>
                      </div>
                    </Tooltip>

                    {/* Payment Method */}
                    <Tooltip content="The method used for this transaction">
                      <div className="flex items-center gap-3 cursor-help">
                        <CreditCard className="h-5 w-5 text-font-2" />
                        {transaction.paymentMethodId ? (
                          <Link to={`/payment-methods/${transaction.paymentMethodId}`} className="text-sm text-font-1 hover:underline flex items-center gap-1 group">
                            {transaction.method}
                            <LinkIcon className="h-3.5 w-3.5 text-font-2 group-hover:text-accent" />
                          </Link>
                        ) : (
                          <span className="text-sm text-font-1">N/A</span>
                        )}
                      </div>
                    </Tooltip>

                    {/* Category (Income only) */}
                    {transaction.type === 'income' && transaction.category && (
                      <Tooltip content="The category of this income">
                        <div className="flex items-center gap-3 cursor-help">
                          <Wallet className="h-5 w-5 text-font-2" />
                          <span className="text-sm text-font-1">{transaction.category}</span>
                        </div>
                      </Tooltip>
                    )}

                    {/* Source/Debtor (Repayment or Income with Entity) */}
                    {transaction.debtorId && (
                      <Tooltip content={transaction.type === 'repayment' ? "The person who made this repayment" : "The source associated with this income"}>
                        <div className="flex items-center gap-3 cursor-help">
                          <User className="h-5 w-5 text-font-2" />
                          <Link to={`/entities/${transaction.debtorId}`} className="text-sm text-font-1 hover:underline flex items-center gap-1 group">
                            {transaction.debtorName}
                            <LinkIcon className="h-3.5 w-3.5 text-font-2 group-hover:text-accent" />
                          </Link>
                        </div>
                      </Tooltip>
                    )}

                    {/* Receipt Link (Repayment only) */}
                    {transaction.type === 'repayment' && transaction.receiptId && (
                      <Tooltip content="The expense this repayment is associated with">
                        <div className="flex items-center gap-3 cursor-help">
                          <Receipt className="h-5 w-5 text-font-2" />
                          <Link to={`/receipts/view/${transaction.receiptId}`} className="text-sm text-font-1 hover:underline flex items-center gap-1 group">
                            {transaction.receiptStoreName || 'View Expense'}
                            <LinkIcon className="h-3.5 w-3.5 text-font-2 group-hover:text-accent" />
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
        isDatabaseTransaction
        successToastMessage="Transaction deleted successfully"
        errorToastMessage="Failed to delete transaction"
      />

      <IncomeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['transaction', id] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }}
        topUpToEdit={transaction?.type === 'income' ? {
          IncomeID: transaction.id,
          IncomeDate: transaction.date,
          IncomeAmount: transaction.amount,
          IncomeNote: transaction.note || '',
          RecipientID: transaction.recipientId,
          CategoryID: transaction.categoryId,
          EntityID: transaction.debtorId,
          PaymentMethodID: transaction.paymentMethodId
        } as any : null}
      />
    </div>
  );
};

export default IncomeViewPage;
