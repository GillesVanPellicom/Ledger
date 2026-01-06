import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../utils/db';
import DataTable from '../components/ui/DataTable';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import DatePicker from '../components/ui/DatePicker';
import Select from '../components/ui/Select';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

const DebtorDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debtor, setDebtor] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, open: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isDarkMode = useMemo(() => document.documentElement.classList.contains('dark'), []);
  const theme = isDarkMode ? 'dark' : 'light';

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const debtorData = await db.queryOne('SELECT * FROM Debtors WHERE DebtorID = ?', [id]);
      setDebtor(debtorData);

      const receiptData = await db.query(`
        SELECT r.ReceiptID, r.ReceiptDate, s.StoreName, r.ReceiptTotal, r.ReceiptIsSettled
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
        WHERE r.DebtorID = ?
        ORDER BY r.ReceiptDate DESC
      `, [id]);
      setReceipts(receiptData);

      const totalDebt = receiptData.reduce((sum, r) => sum + r.ReceiptTotal, 0);
      const paidDebt = receiptData.filter(r => r.ReceiptIsSettled).reduce((sum, r) => sum + r.ReceiptTotal, 0);
      setStats({
        total: totalDebt,
        paid: paidDebt,
        open: totalDebt - paidDebt,
      });

    } catch (error) {
      console.error("Failed to fetch debtor details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleRowClick = (row) => {
    navigate(`/receipts/view/${row.ReceiptID}`);
  };

  const filteredReceipts = useMemo(() => {
    const keywords = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
    const [startDate, endDate] = dateRange;

    return receipts.filter(r => {
      if (filter === 'settled' && !r.ReceiptIsSettled) return false;
      if (filter === 'unsettled' && r.ReceiptIsSettled) return false;

      const date = new Date(r.ReceiptDate);
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;

      if (keywords.length === 0) return true;

      const searchableText = [r.StoreName, format(date, 'dd/MM/yyyy')].join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return keywords.every(kw => searchableText.includes(kw));
    });
  }, [receipts, filter, searchTerm, dateRange]);

  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredReceipts.slice(start, end);
  }, [filteredReceipts, currentPage, pageSize]);

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: {
      top: '5%',
      left: 'center',
      textStyle: {
        color: isDarkMode ? '#fff' : '#333'
      }
    },
    series: [
      {
        name: 'Debt Stats',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: isDarkMode ? '#1f2937' : '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: stats.open, name: 'Open Debt' },
          { value: stats.paid, name: 'Paid Debt' },
        ]
      }
    ]
  };

  const columns = [
    { header: 'Date', render: (row) => format(new Date(row.ReceiptDate), 'dd/MM/yyyy') },
    { header: 'Store', accessor: 'StoreName' },
    { header: 'Total', render: (row) => `€${row.ReceiptTotal.toFixed(2)}` },
    {
      header: 'Status',
      render: (row) => (
        <span className={cn(
          'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
          row.ReceiptIsSettled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        )}>
          {row.ReceiptIsSettled ? 'Settled' : 'Unsettled'}
        </span>
      )
    },
  ];

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner className="h-8 w-8 text-accent animate-spin" /></div>;
  if (!debtor) return <div>Debtor not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{debtor.DebtorName}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Debt (All Time)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">€{stats.total.toFixed(2)}</p>
        </Card>
        <Card className="p-4 text-center bg-red-50 dark:bg-red-900/20">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Debt Still Open</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">€{stats.open.toFixed(2)}</p>
        </Card>
        <Card className="p-4 text-center bg-green-50 dark:bg-green-900/20">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Debt Paid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">€{stats.paid.toFixed(2)}</p>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Debt Overview</h2>
          <ReactECharts option={chartOption} theme={theme} style={{ height: '300px' }} />
        </div>
      </Card>

      <DataTable
        data={paginatedReceipts}
        columns={columns}
        onRowClick={handleRowClick}
        itemKey="ReceiptID"
        totalCount={filteredReceipts.length}
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
              { value: 'all', label: 'All Debt' },
              { value: 'unsettled', label: 'Unsettled Debt' },
              { value: 'settled', label: 'Settled Debt' },
            ]}
          />
        </div>
      </DataTable>
    </div>
  );
};

export default DebtorDetailsPage;
