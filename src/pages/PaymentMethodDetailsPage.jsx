import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import TopUpModal from '../components/payment/TopUpModal';
import { BanknotesIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
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

const PaymentMethodDetailsPage = () => {
  const chartRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [method, setMethod] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [methodName, setMethodName] = useState('');
  const [topUpToEdit, setTopUpToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
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
      const methodData = await db.queryOne('SELECT * FROM PaymentMethods WHERE PaymentMethodID = ?', [id]);
      setMethod(methodData);
      setMethodName(methodData?.PaymentMethodName || '');

      const receiptsData = await db.query(`
        SELECT r.ReceiptID as id, r.ReceiptDate as date, s.StoreName as name, r.ReceiptNote as note,
               (SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM LineItems li WHERE li.ReceiptID = r.ReceiptID) as amount, 
               'receipt' as type
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
        WHERE r.PaymentMethodID = ?
      `, [id]);

      const topupsData = await db.query(`
        SELECT TopUpID as id, TopUpDate as date, '-' as name, TopUpNote as note, TopUpAmount as amount, 'topup' as type
        FROM TopUps 
        WHERE PaymentMethodID = ?
      `, [id]);

      const allTransactions = [
        ...receiptsData.map(r => ({...r, amount: -r.amount})), 
        ...topupsData
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setTransactions(allTransactions);

      const expenses = receiptsData.reduce((sum, r) => sum + r.amount, 0);
      const topups = topupsData.reduce((sum, t) => sum + t.amount, 0);
      setBalance((methodData.PaymentMethodFunds || 0) + topups - expenses);

    } catch (error) {
      console.error("Failed to fetch payment method details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleTopUpSave = () => {
    fetchDetails();
    setTopUpToEdit(null);
  };

  const openTopUpModal = (topup = null) => {
    setTopUpToEdit(topup);
    setIsTopUpModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'receipt') {
        await db.execute('DELETE FROM Receipts WHERE ReceiptID = ?', [itemToDelete.id]);
      } else if (itemToDelete.type === 'topup') {
        await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [itemToDelete.id]);
      }
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

  const handleRowClick = (row) => {
    if (row.type === 'receipt') {
      navigate(`/receipts/view/${row.id}`);
    } else if (row.type === 'topup') {
      const fullTopUp = transactions.find(t => t.id === row.id && t.type === 'topup');
      openTopUpModal({
        TopUpID: fullTopUp.id,
        TopUpAmount: fullTopUp.amount,
        TopUpDate: fullTopUp.date,
        TopUpNote: fullTopUp.note,
      });
    }
  };
  
  const filteredTransactions = useMemo(() => {
    const keywords = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
    const [startDate, endDate] = dateRange;

    return transactions.filter(t => {
      const typeMatch = filter === 'all' || (filter === 'receipt' && t.amount < 0) || (filter === 'topup' && t.amount > 0);
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
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = method?.PaymentMethodFunds || 0;
    const data = [];
    
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
      tooltip: { trigger: 'axis', valueFormatter: (value) => `€${value}` },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', axisLabel: { formatter: '€{value}' } },
      series: [{ data, type: 'line', showSymbol: false, smooth: true }],
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    };
  }, [transactions, method]);

  const columns = [
    { header: 'Date', render: (row) => format(new Date(row.date), 'dd/MM/yyyy') },
    { header: 'Name', accessor: 'name' },
    { header: 'Note', render: (row) => row.note || '-' },
    { 
      header: 'Amount',
      render: (row) => (
        <span className={cn(row.amount > 0 ? 'text-green-600' : 'text-red-600')}>
          {row.amount > 0 ? '+' : ''} €{Math.abs(row.amount).toFixed(2)}
        </span>
      )
    },
    {
      header: '',
      render: (row) => (
        <div className="flex justify-end">
          <Tooltip content={`Delete ${row.type}`} align="end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); openDeleteModal(row); }}
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="grid grid-cols-3 gap-4 items-start">
        <div className="col-span-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{method.PaymentMethodName}</h1>
        </div>
        <div className="col-span-1">
          <Card className={cn("p-4 text-center", balance < 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20')}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</p>
            <p className={cn("text-3xl font-bold", balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
              €{balance.toFixed(2)}
            </p>
          </Card>
        </div>
        <div className="col-span-1 flex justify-end space-x-2">
          <Button onClick={() => openTopUpModal()}>
            <BanknotesIcon className="h-5 w-5 mr-2" />
            Top-Up
          </Button>
          <Button onClick={() => setIsEditModalOpen(true)}>
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </Button>
        </div>
      </div>
      
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
        itemKey={(row) => `${row.type}-${row.id}`}
        totalCount={filteredTransactions.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onSearch={setSearchTerm}
        searchable={true}
      >
        <div className="w-64">
          <DatePicker
            selectsRange
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            onChange={(update) => { setDateRange(update); setCurrentPage(1); }}
            isClearable={true}
            placeholderText="Filter by date range"
          />
        </div>
        <div className="w-48">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Transactions' },
              { value: 'receipt', label: 'Receipts' },
              { value: 'topup', label: 'Top-Ups' },
            ]}
          />
        </div>
      </DataTable>

      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        onSave={handleTopUpSave}
        topUpToEdit={topUpToEdit}
        paymentMethodId={id}
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
  );
};

export default PaymentMethodDetailsPage;
