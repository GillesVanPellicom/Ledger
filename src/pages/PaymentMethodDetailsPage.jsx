import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import TopUpModal from '../components/payment/TopUpModal';
import { PlusIcon } from '@heroicons/react/24/solid';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '../utils/cn';
import Select from '../components/ui/Select';
import ReactECharts from 'echarts-for-react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

const PaymentMethodDetailsPage = () => {
  const chartRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [method, setMethod] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpToEdit, setTopUpToEdit] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
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

      const receiptsData = await db.query(`
        SELECT 
          r.ReceiptID as id, 
          r.ReceiptDate as date, 
          s.StoreName as name,
          r.ReceiptNote as note,
          SUM(li.LineQuantity * li.LineUnitPrice) as amount, 
          'receipt' as type
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
        JOIN LineItems li ON r.ReceiptID = li.ReceiptID
        WHERE r.PaymentMethodID = ?
        GROUP BY r.ReceiptID
      `, [id]);

      const topupsData = await db.query(`
        SELECT 
          TopUpID as id, 
          TopUpDate as date, 
          '-' as name,
          TopUpNote as note, 
          TopUpAmount as amount, 
          'topup' as type
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
    const lowercasedFilter = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return transactions.filter(t => {
      const typeMatch = filter === 'all' || (filter === 'receipt' && t.amount < 0) || (filter === 'topup' && t.amount > 0);
      if (!typeMatch) return false;

      const searchMatch = [
        t.name,
        t.note,
        format(new Date(t.date), 'dd/MM/yyyy')
      ].some(field => field?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(lowercasedFilter));
      
      return searchMatch;
    });
  }, [transactions, filter, searchTerm]);

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
      tooltip: { 
        trigger: 'axis', 
        valueFormatter: (value) => `€${value}`
      },
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
  ];

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner className="h-8 w-8 text-accent animate-spin" /></div>;
  if (!method) return <div>Payment method not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{method.PaymentMethodName}</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">Current Balance: €{balance.toFixed(2)}</p>
        </div>
        <Button onClick={() => openTopUpModal()}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Top-Up
        </Button>
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
    </div>
  );
};

export default PaymentMethodDetailsPage;
