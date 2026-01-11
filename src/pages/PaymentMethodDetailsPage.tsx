import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import TransferModal from '../components/payment/TransferModal';
import { BanknotesIcon, PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
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
  type: 'receipt' | 'deposit' | 'transfer';
  // Receipt-specific fields
  Discount?: number | null;
  IsNonItemised?: 0 | 1;
  NonItemisedTotal?: number | null;
}

interface LineItem {
  ReceiptID: number;
  LineQuantity: number;
  LineUnitPrice: number;
  IsExcludedFromDiscount: 0 | 1;
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

  useEffect(() => {
    const chartInstance = chartRef.current?.getEchartsInstance();
    return () => {
      chartInstance?.dispose();
    };
  }, []);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const methodData = await db.queryOne<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodID = ?', [id]);
      setMethod(methodData);
      setMethodName(methodData?.PaymentMethodName || '');

      interface ReceiptQueryResult {
        id: number;
        date: string;
        name: string;
        note: string;
        Discount: number | null;
        IsNonItemised: 0 | 1;
        NonItemisedTotal: number | null;
        type: 'receipt';
      }

      const receiptsData = await db.query<ReceiptQueryResult>(`
        SELECT r.ReceiptID as id, r.ReceiptDate as date, s.StoreName as name, r.ReceiptNote as note, r.Discount,
               r.IsNonItemised, r.NonItemisedTotal,
               'receipt' as type
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
        name: string;
        note: string;
        amount: number;
        TransferID: number | null;
      }

      const topupsData = await db.query<TopUpQueryResult>(`
        SELECT TopUpID as id, TopUpDate as date, '-' as name, TopUpNote as note, TopUpAmount as amount, TransferID
        FROM TopUps
        WHERE PaymentMethodID = ?
      `, [id]);

      const allTransactions: PageTransaction[] = [
        ...receiptsData.map((r): PageTransaction => {
            if (r.IsNonItemised) {
              return {...r, amount: -(r.NonItemisedTotal || 0)};
            }
            const items = allLineItems.filter(li => li.ReceiptID === r.id);
            const total = calculateTotalWithDiscount(items, r.Discount || 0);
            return {...r, amount: -total};
        }),
        ...topupsData.map((t): PageTransaction => ({
          ...t,
          type: t.TransferID ? 'transfer' : 'deposit'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);

      const expenses = allTransactions.filter(t => t.type === 'receipt').reduce((sum, r) => sum - r.amount, 0);
      const depositsAndTransfers = allTransactions.filter(t => t.type === 'deposit' || t.type === 'transfer').reduce((sum, t) => sum + t.amount, 0);
      setBalance((methodData?.PaymentMethodFunds || 0) + depositsAndTransfers - expenses);

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
      } else {
        await window.electronAPI.deleteTransaction({ topUpId: itemToDelete.id });
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
    // Editing transfers/deposits is disabled for now
  };

  const filteredTransactions = useMemo(() => {
    const keywords = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
    const [startDate, endDate] = dateRange;

    return transactions.filter(t => {
      const typeMatch = filter === 'all' || (filter === 'receipt' && t.type === 'receipt') || (filter === 'deposit' && t.type === 'deposit') || (filter === 'transfer' && t.type === 'transfer');
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
          <Tooltip content={`Delete ${row.type}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); openDeleteModal(row); }}
            >
              <TrashIcon className="h-4 w-4" />
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
        backButton={
          <Tooltip content="Go Back">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Tooltip>
        }
        actions={
          <>
            <Tooltip content="Edit">
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)}>
                <PencilIcon className="h-5 w-5" />
              </Button>
            </Tooltip>
            <Tooltip content="New Transaction">
              <Button variant="ghost" size="icon" onClick={() => openTransferModal()}>
                <BanknotesIcon className="h-5 w-5" />
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
                    { value: 'receipt', label: 'Receipts' },
                    { value: 'deposit', label: 'Deposits' },
                    { value: 'transfer', label: 'Transfers' },
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
            title={`Delete ${itemToDelete?.type}`}
            message={`Are you sure you want to permanently delete this ${itemToDelete?.type}? This action cannot be undone.`}
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
