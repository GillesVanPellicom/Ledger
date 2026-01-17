import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import TransferModal from '../components/payment/TransferModal';
import { Landmark, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '../utils/cn';
import Select from '../components/ui/Select';
import ReactECharts from 'echarts-for-react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import DatePicker from '../components/ui/DatePicker';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import Input from '../components/ui/Input';
import { PaymentMethod, TopUp } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { calculateTotalWithDiscount } from '../utils/discountCalculator';
import { useQueryClient } from '@tanstack/react-query';

const tryParseJson = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

// A more specific type for transactions on this page
interface PageTransaction {
  id: number;
  date: string;
  name: string;
  note: string;
  amount: number;
  type: 'receipt' | 'deposit' | 'transfer_in' | 'transfer_out' | 'debt_repayment';
  creationTimestamp: string;
  // Receipt-specific fields
  Discount?: number | null;
  IsNonItemised?: 0 | 1;
  NonItemisedTotal?: number | null;
  // Transfer-specific fields
  transferInfo?: {
    fromMethodId: number;
    toMethodId: number;
    fromMethodName: string;
    toMethodName: string;
  };
  // Debt repayment fields
  debtorName?: string;
}

interface LineItem {
  ReceiptID: number;
  LineQuantity: number;
  LineUnitPrice: number;
  IsExcludedFromDiscount: 0 | 1;
}

interface IncomingTransferQueryResult {
  id: number;
  date: string;
  note: string;
  amount: number;
  creationTimestamp: string;
  fromMethodId: number;
  toMethodId: number;
  fromMethodName: string;
}

interface OutgoingTransferQueryResult {
  id: number;
  date: string;
  note: string;
  amount: number;
  creationTimestamp: string;
  fromMethodId: number;
  toMethodId: number;
  toMethodName: string;
}

interface DebtRepaymentQueryResult {
  id: number;
  date: string;
  note: string;
  amount: number;
  creationTimestamp: string;
  debtorName: string;
}

const PaymentMethodDetailsPage: React.FC = () => {
  const chartRef = useRef<ReactECharts>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [transactions, setTransactions] = useState<PageTransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [methodName, setMethodName] = useState('');
  const [transferToEdit, setTransferToEdit] = useState<TopUp | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PageTransaction | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isDarkMode = useMemo(() => document.documentElement.classList.contains('dark'), []);
  const theme = isDarkMode ? 'dark' : 'light';

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const methodId = parseInt(id!, 10);
      const methodData = await db.queryOne<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodID = ?', [id]);
      
      if (!methodData) {
        setMethod(null);
        setTransactions([]);
        setLoading(false);
        return;
      }

      setMethod(methodData);
      setMethodName(methodData.PaymentMethodName || '');

      interface ReceiptQueryResult {
        id: number;
        date: string;
        name: string;
        note: string;
        Discount: number | null;
        IsNonItemised: 0 | 1;
        NonItemisedTotal: number | null;
        type: 'receipt';
        creationTimestamp: string;
      }

      const receiptsData = await db.query<ReceiptQueryResult>(`
        SELECT r.ReceiptID as id, r.ReceiptDate as date, s.StoreName as name, r.ReceiptNote as note, r.Discount,
               r.IsNonItemised, r.NonItemisedTotal, 'receipt' as type, r.CreationTimestamp as creationTimestamp
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
        WHERE r.PaymentMethodID = ?
      `, [id]);

      const receiptIds = receiptsData.map(r => r.id);
      const allLineItems = receiptIds.length > 0
        ? await db.query<LineItem>(`SELECT * FROM LineItems WHERE ReceiptID IN (${receiptIds.map(() => '?').join(',')})`, receiptIds)
        : [];

      interface TopUpQueryResult {
        id: number;
        date: string;
        note: string;
        amount: number;
        creationTimestamp: string;
      }

      const topupsData = await db.query<TopUpQueryResult>(`
        SELECT
          tu.TopUpID as id,
          tu.TopUpDate as date,
          tu.TopUpNote as note,
          tu.TopUpAmount as amount,
          tu.CreationTimestamp as creationTimestamp
        FROM TopUps tu
        WHERE tu.PaymentMethodID = ? AND tu.TransferID IS NULL AND NOT EXISTS (
          SELECT 1 FROM ReceiptDebtorPayments rdp WHERE rdp.TopUpID = tu.TopUpID
        )
      `, [id]);

      const incomingTransfersData = await db.query<IncomingTransferQueryResult>(`
        SELECT
          t.TransferID as id,
          t.TransferDate as date,
          t.Note as note,
          t.Amount as amount,
          t.CreationTimestamp as creationTimestamp,
          t.FromPaymentMethodID as fromMethodId,
          t.ToPaymentMethodID as toMethodId,
          pm_from.PaymentMethodName as fromMethodName
        FROM Transfers t
        JOIN PaymentMethods pm_from ON t.FromPaymentMethodID = pm_from.PaymentMethodID
        WHERE t.ToPaymentMethodID = ?
      `, [id]);
      
      const outgoingTransfersData = await db.query<OutgoingTransferQueryResult>(`
        SELECT
          t.TransferID as id,
          t.TransferDate as date,
          t.Note as note,
          t.Amount as amount,
          t.CreationTimestamp as creationTimestamp,
          t.FromPaymentMethodID as fromMethodId,
          t.ToPaymentMethodID as toMethodId,
          pm_to.PaymentMethodName as toMethodName
        FROM Transfers t
        JOIN PaymentMethods pm_to ON t.ToPaymentMethodID = pm_to.PaymentMethodID
        WHERE t.FromPaymentMethodID = ?
      `, [id]);

      const debtRepaymentsData = await db.query<DebtRepaymentQueryResult>(`
        SELECT
          rdp.PaymentID as id,
          rdp.PaidDate as date,
          tu.TopUpNote as note,
          tu.TopUpAmount as amount,
          rdp.CreationTimestamp as creationTimestamp,
          d.DebtorName as debtorName
        FROM ReceiptDebtorPayments rdp
        JOIN TopUps tu ON rdp.TopUpID = tu.TopUpID
        JOIN Debtors d ON rdp.DebtorID = d.DebtorID
        WHERE tu.PaymentMethodID = ?
      `, [id]);

      const allTransactions: PageTransaction[] = [
        ...receiptsData.map((r): PageTransaction => {
            if (r.IsNonItemised) {
              return {...r, amount: -(r.NonItemisedTotal || 0)};
            }
            const items = allLineItems.filter(li => li.ReceiptID === r.id);
            const total = calculateTotalWithDiscount(items, r.Discount || 0);
            return {...r, name: r.name, amount: -total};
        }),
        ...topupsData.map((t): PageTransaction => ({
          id: t.id,
          date: t.date,
          name: 'Deposit',
          note: t.note,
          amount: t.amount,
          type: 'deposit',
          creationTimestamp: t.creationTimestamp,
        })),
        ...incomingTransfersData.map((t): PageTransaction => ({
            id: t.id,
            date: t.date,
            name: 'Transfer',
            note: t.note,
            amount: t.amount,
            type: 'transfer_in',
            creationTimestamp: t.creationTimestamp,
            transferInfo: {
                fromMethodId: t.fromMethodId,
                toMethodId: t.toMethodId,
                fromMethodName: t.fromMethodName,
                toMethodName: methodData.PaymentMethodName
            }
        })),
        ...outgoingTransfersData.map((t): PageTransaction => ({
            id: t.id,
            date: t.date,
            name: 'Transfer',
            note: t.note,
            amount: -t.amount,
            type: 'transfer_out',
            creationTimestamp: t.creationTimestamp,
            transferInfo: {
                fromMethodId: t.fromMethodId,
                toMethodId: t.toMethodId,
                fromMethodName: methodData.PaymentMethodName,
                toMethodName: t.toMethodName
            }
        })),
        ...debtRepaymentsData.map((t): PageTransaction => ({
          id: t.id,
          date: t.date,
          name: 'Debt Repayment',
          note: t.note,
          amount: t.amount,
          type: 'debt_repayment',
          creationTimestamp: t.creationTimestamp,
          debtorName: t.debtorName,
        }))
      ].sort((a, b) => {
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        return new Date(b.creationTimestamp).getTime() - new Date(a.creationTimestamp).getTime();
      });

      setTransactions(allTransactions);

      const newBalance = (methodData.PaymentMethodFunds || 0) + allTransactions.reduce((acc, tx) => acc + tx.amount, 0);
      setBalance(newBalance);

    } catch (error) {
      console.error("Failed to fetch payment method details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleTransferSave = () => {
    fetchDetails();
    setTransferToEdit(null);
  };

  const openTransferModal = (topup: TopUp | null = null) => {
    setTransferToEdit(topup);
    setIsTransferModalOpen(true);
  };

  const openDeleteModal = (item: PageTransaction) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'receipt') {
        await db.execute('DELETE FROM Receipts WHERE ReceiptID = ?', [itemToDelete.id]);
      } else if (itemToDelete.type === 'deposit' || itemToDelete.type === 'debt_repayment') {
        await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [itemToDelete.id]);
      } else if (itemToDelete.type === 'transfer_in' || itemToDelete.type === 'transfer_out') {
        await db.execute('DELETE FROM Transfers WHERE TransferID = ?', [itemToDelete.id]);
      }
      
      queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });

      fetchDetails();
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const handleUpdateMethodName = async () => {
    if (!methodName.trim()) return;
    try {
      await db.execute('UPDATE PaymentMethods SET PaymentMethodName = ? WHERE PaymentMethodID = ?', [methodName.trim(), id]);
      fetchDetails();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update payment method name:", error);
    }
  };

  const handleRowClick = (row: PageTransaction) => {
    if (row.type === 'receipt') {
      navigate(`/receipts/view/${row.id}`);
    }
  };

  const filteredTransactions = useMemo(() => {
    const keywords = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
    const [startDate, endDate] = dateRange;

    return transactions.filter(t => {
      const typeMatch = filter === 'all' 
        || (filter === 'receipt' && t.type === 'receipt') 
        || (filter === 'deposit' && t.type === 'deposit') 
        || (filter === 'transfer' && (t.type === 'transfer_in' || t.type === 'transfer_out'))
        || (filter === 'debt_repayment' && t.type === 'debt_repayment');
      if (!typeMatch) return false;

      const date = new Date(t.date);
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;

      if (keywords.length === 0) return true;

      const searchableText = [t.name, t.note, format(date, 'dd/MM/yyyy')].join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return keywords.every(kw => searchableText.includes(kw));
    });
  }, [transactions, filter, searchTerm, dateRange]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, currentPage, pageSize]);

  const balanceChartOption = useMemo(() => {
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = method?.PaymentMethodFunds || 0;
    const data: [string, string][] = [];

    if (sortedTransactions.length > 0) {
        const firstDate = new Date(sortedTransactions[0].date);
        const startDate = startOfMonth(firstDate);
        const endDate = endOfMonth(new Date());
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

        let trxIndex = 0;
        dateRange.forEach(day => {
            while(trxIndex < sortedTransactions.length && new Date(sortedTransactions[trxIndex].date) <= day) {
                runningBalance += sortedTransactions[trxIndex].amount;
                trxIndex++;
            }
            data.push([format(day, 'yyyy-MM-dd'), runningBalance.toFixed(2)]);
        });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', valueFormatter: (value: number) => `€${value}` },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', axisLabel: { formatter: '€{value}' } },
      series: [{ data, type: 'line', showSymbol: false, smooth: true }],
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    };
  }, [transactions, method]);

  const getTransactionTypeDisplayName = (type: PageTransaction['type']) => {
    if (type === 'transfer_in' || type === 'transfer_out') return 'transfer';
    if (type === 'receipt') return 'expense';
    if (type === 'debt_repayment') return 'debt repayment';
    return type;
  }

  const renderDetails = (row: PageTransaction) => {
    const handleLinkClick = (e: React.MouseEvent) => e.stopPropagation();

    if (row.type === 'transfer_in' && row.transferInfo) {
      return (
        <Link to={`/payment-methods/${row.transferInfo.fromMethodId}`} onClick={handleLinkClick} className="text-accent hover:underline">
          From: {row.transferInfo.fromMethodName}
        </Link>
      );
    }
    if (row.type === 'transfer_out' && row.transferInfo) {
      return (
        <Link to={`/payment-methods/${row.transferInfo.toMethodId}`} onClick={handleLinkClick} className="text-accent hover:underline">
          To: {row.transferInfo.toMethodName}
        </Link>
      );
    }
    if (row.type === 'debt_repayment' && row.debtorName) {
      return `From: ${row.debtorName}`;
    }
    return '-';
  };

  const renderNote = (row: PageTransaction) => {
    const parsedNote = tryParseJson(row.note);
    if (parsedNote && parsedNote.type === 'debt_settlement') {
      return (
        <>
          Debt settled by{' '}
          <Link to={`/receipts/view/${parsedNote.receiptId}`} className="text-accent hover:underline">
            {parsedNote.debtorName}
          </Link>
        </>
      );
    }
    return row.note || '-';
  };

  const columns = [
    { header: 'Date', render: (row: PageTransaction) => format(new Date(row.date), 'dd/MM/yyyy') },
    { header: 'Name', accessor: 'name' },
    { header: 'Details', render: (row: PageTransaction) => renderDetails(row) },
    { header: 'Note', render: (row: PageTransaction) => renderNote(row) },
    {
      header: 'Amount',
      render: (row: PageTransaction) => (
        <span className={cn(row.amount > 0 ? 'text-green' : 'text-red')}>
          {row.amount > 0 ? '+' : ''} €{Math.abs(row.amount).toFixed(2)}
        </span>
      )
    },
    {
      header: '',
      render: (row: PageTransaction) => (
        <div className="flex justify-end">
          <Tooltip content={`Delete ${getTransactionTypeDisplayName(row.type)}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); openDeleteModal(row); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner className="h-8 w-8 text-accent animate-spin" /></div>;
  if (!method) return <div>Payment method not found.</div>;

  return (
    <div>
      <Header
        title={method.PaymentMethodName}
        actions={
          <>
            <Tooltip content="Edit">
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)}>
                <Pencil className="h-5 w-5" />
              </Button>
            </Tooltip>
            <Tooltip content="New Transaction">
              <Button variant="ghost" size="icon" onClick={() => openTransferModal()}>
                <Landmark className="h-5 w-5" />
              </Button>
            </Tooltip>
          </>
        }
        variant="centered-box"
        centeredContent={
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</p>
            <p className={cn("text-3xl font-bold", balance < 0 ? 'text-red' : 'text-green')}>
              €{balance.toFixed(2)}
            </p>
          </div>
        }
      />
      <PageWrapper>
        <div className="py-6 space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Balance Over Time</h2>
              <ReactECharts ref={chartRef} option={balanceChartOption} theme={theme} style={{ height: '300px' }} notMerge={true} />
            </div>
          </Card>

          <DataTable
            data={paginatedTransactions}
            columns={columns}
            onRowClick={handleRowClick}
            itemKey={(row: PageTransaction) => `${row.type}-${row.id}`}
            totalCount={filteredTransactions.length}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onSearch={setSearchTerm}
            searchable={true}
            middleRowLeft={
              <div className="w-1/2">
                <DatePicker
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  onChange={(update: [Date | null, Date | null]) => { setDateRange(update); setCurrentPage(1); }}
                  isClearable={true}
                  placeholderText="Filter by date range"
                  selectsRange={true}
                />
              </div>
            }
            middleRowRight={
              <div className="w-48">
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Transactions' },
                    { value: 'receipt', label: 'Expenses' },
                    { value: 'deposit', label: 'Deposits' },
                    { value: 'transfer', label: 'Transfers' },
                    { value: 'debt_repayment', label: 'Debt Repayments' },
                  ]}
                />
              </div>
            }
          />

          <TransferModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            onSave={handleTransferSave}
            topUpToEdit={transferToEdit}
            paymentMethodId={id!}
            currentBalance={balance}
          />

          <ConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDelete}
            title={`Delete ${getTransactionTypeDisplayName(itemToDelete?.type || 'receipt')}`}
            message={`Are you sure you want to permanently delete this ${getTransactionTypeDisplayName(itemToDelete?.type || 'receipt')}? This action cannot be undone.`}
          />

          <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Payment Method">
            <div className="space-y-4">
              <Input
                label="Method Name"
                value={methodName}
                onChange={(e) => setMethodName(e.target.value)}
                placeholder="Enter new method name"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateMethodName}>Save</Button>
              </div>
            </div>
          </Modal>
        </div>
      </PageWrapper>
    </div>
  );
};

export default PaymentMethodDetailsPage;
