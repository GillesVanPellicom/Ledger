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
import Modal, {ConfirmModal} from '../components/ui/Modal';
import {Header} from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import {useErrorStore} from '../store/useErrorStore';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import StepperInput from '../components/ui/StepperInput';
import Input from '../components/ui/Input';
import Combobox from '../components/ui/Combobox';
import Divider from '../components/ui/Divider';
import IncomeCategoryModal from '../components/categories/IncomeCategoryModal';
import IncomeSourceModal from '../components/income/IncomeSourceModal';

const IncomeViewPage: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {showError} = useErrorStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [isIncomeCategoryModalOpen, setIsIncomeCategoryModalOpen] = useState(false);
  const [isIncomeSourceModalOpen, setIsIncomeSourceModalOpen] = useState(false);

  const [editData, setEditData] = useState({
    SourceName: '',
    Category: '',
    PaymentMethodID: '',
    Amount: '0',
    Date: '',
    Note: ''
  });

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

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (transaction?.type === 'repayment') {
        // For repayments, we update the TopUp and potentially the PaidDate in ReceiptDebtorPayments
        await db.execute(
          'UPDATE TopUps SET TopUpAmount = ?, TopUpDate = ?, TopUpNote = ?, PaymentMethodID = ? WHERE TopUpID = ?',
          [data.Amount, data.Date, data.Note, data.PaymentMethodID, transaction.topUpId]
        );
        await db.execute(
          'UPDATE ReceiptDebtorPayments SET PaidDate = ? WHERE PaymentID = ?',
          [data.Date, transaction.id]
        );
      } else {
        // For regular income
        const sourceId = (await db.queryOne<any>('SELECT IncomeSourceID FROM IncomeSources WHERE IncomeSourceName = ?', [data.SourceName]))?.IncomeSourceID;
        const categoryId = (await db.queryOne<any>('SELECT IncomeCategoryID FROM IncomeCategories WHERE IncomeCategoryName = ?', [data.Category]))?.IncomeCategoryID;
        
        await db.execute(
          'UPDATE TopUps SET TopUpAmount = ?, TopUpDate = ?, TopUpNote = ?, PaymentMethodID = ?, IncomeSourceID = ?, IncomeCategoryID = ? WHERE TopUpID = ?',
          [data.Amount, data.Date, data.Note, data.PaymentMethodID, sourceId || null, categoryId || null, transaction?.id]
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsEditModalOpen(false);
    },
    onError: (err) => showError(err)
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

  const openEditModal = async () => {
    if (!transaction) return;

    // Load reference data
    const [pmRows, catRows, srcRows] = await Promise.all([
      db.query("SELECT * FROM PaymentMethods"),
      db.query("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName"),
      db.query("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName")
    ]);

    setPaymentMethods(pmRows.map((r: any) => ({ value: String(r.PaymentMethodID), label: r.PaymentMethodName })));
    setIncomeCategories(catRows.map((r: any) => ({ value: r.IncomeCategoryName, label: r.IncomeCategoryName })));
    setIncomeSources(srcRows.map((r: any) => ({ value: r.IncomeSourceName, label: r.IncomeSourceName })));

    setEditData({
      SourceName: transaction.description,
      Category: transaction.category || '',
      PaymentMethodID: String(transaction.paymentMethodId),
      Amount: String(transaction.amount),
      Date: transaction.date,
      Note: transaction.note || ''
    });
    setIsEditModalOpen(true);
  };

  const handleStepperChange = (increment: boolean, step: number) => {
    setEditData((prev: any) => {
      const currentValue = Number.parseFloat(prev.Amount) || 0;
      const newValue = increment ? currentValue + step : currentValue - step;
      return {...prev, Amount: String(newValue)};
    });
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
            <Tooltip content="Edit">
              <Button variant="ghost" size="icon" onClick={openEditModal}>
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
              <Card>
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

                    {/* Debtor (Repayment only) */}
                    {transaction.type === 'repayment' && (
                      <Tooltip content="The person who made this repayment">
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
      />

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={transaction.type === 'repayment' ? "Edit Repayment" : "Edit Income"}
        onEnter={() => updateMutation.mutate(editData)}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate(editData)}
              loading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {transaction.type === 'income' && (
            <>
              <div className="flex items-end gap-2">
                <Combobox
                  label="Source Name"
                  options={incomeSources}
                  value={editData.SourceName}
                  onChange={val => setEditData(prev => ({...prev, SourceName: val}))}
                  className="flex-1"
                />
                <Tooltip content="Add Source">
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsIncomeSourceModalOpen(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </Tooltip>
              </div>
              <div className="flex items-end gap-2">
                <Combobox
                  label="Category (Optional)"
                  options={incomeCategories}
                  value={editData.Category}
                  onChange={val => setEditData(prev => ({...prev, Category: val}))}
                  className="flex-1"
                />
                <Tooltip content="Add Category">
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsIncomeCategoryModalOpen(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </Tooltip>
              </div>
              <Divider className="my-2"/>
            </>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <StepperInput
              label="Amount"
              step={1}
              min={0}
              value={editData.Amount}
              onChange={e => setEditData(prev => ({...prev, Amount: e.target.value}))}
              onIncrement={() => handleStepperChange(true, 1)}
              onDecrement={() => handleStepperChange(false, 1)}
            />
            <Combobox
              label="Method"
              options={paymentMethods}
              value={editData.PaymentMethodID}
              onChange={val => setEditData(prev => ({...prev, PaymentMethodID: val}))}
            />
          </div>
          <Divider className="my-2"/>
          <Input
            label="Date"
            type="date"
            value={editData.Date}
            onChange={e => setEditData(prev => ({...prev, Date: e.target.value}))}
          />
          <Input
            type="text"
            label="Note"
            value={editData.Note}
            onChange={e => setEditData(prev => ({...prev, Note: e.target.value}))}
          />
        </div>
      </Modal>

      <IncomeCategoryModal
        isOpen={isIncomeCategoryModalOpen}
        onClose={() => setIsIncomeCategoryModalOpen(false)}
        onSave={() => {
          db.query("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName").then(rows => {
            setIncomeCategories(rows.map((r: any) => ({ value: r.IncomeCategoryName, label: r.IncomeCategoryName })));
          });
        }}
        categoryToEdit={null}
      />

      <IncomeSourceModal
        isOpen={isIncomeSourceModalOpen}
        onClose={() => setIsIncomeSourceModalOpen(false)}
        onSave={() => {
          db.query("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName").then(rows => {
            setIncomeSources(rows.map((r: any) => ({ value: r.IncomeSourceName, label: r.IncomeSourceName })));
          });
        }}
        sourceToEdit={null}
      />
    </div>
  );
};

export default IncomeViewPage;
