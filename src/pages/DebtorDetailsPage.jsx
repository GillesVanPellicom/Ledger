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
import Button from '../components/ui/Button';
import { DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import { generateReceiptsPdf } from '../utils/pdfGenerator';
import ProgressModal from '../components/ui/ProgressModal';
import { useError } from '../context/ErrorContext';
import { useSettings } from '../context/SettingsContext';
import DebtSettlementModal from '../components/debt/DebtSettlementModal';

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

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedDebtForSettlement, setSelectedDebtForSettlement] = useState(null);
  const [unsettleConfirmation, setUnsettleConfirmation] = useState({ isOpen: false, receiptId: null });

  const { showError } = useError();
  const { settings } = useSettings();

  const isDarkMode = useMemo(() => document.documentElement.classList.contains('dark'), []);
  const theme = isDarkMode ? 'dark' : 'light';

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const debtorData = await db.queryOne('SELECT * FROM Debtors WHERE DebtorID = ?', [id]);
      setDebtor(debtorData);

      const receiptData = await db.query(`
        SELECT
          r.ReceiptID,
          r.ReceiptDate,
          r.PaymentMethodID,
          s.StoreName,
          (rdp.PaymentID IS NOT NULL) as ReceiptIsSettled,
          (
            SELECT SUM(li.LineQuantity * li.LineUnitPrice)
            FROM LineItems li
            WHERE li.ReceiptID = r.ReceiptID AND li.DebtorID = ?
          ) as DebtorTotal
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
        LEFT JOIN ReceiptDebtorPayments rdp ON r.ReceiptID = rdp.ReceiptID AND rdp.DebtorID = ?
        WHERE r.ReceiptID IN (
          SELECT DISTINCT li.ReceiptID FROM LineItems li WHERE li.DebtorID = ?
        )
        ORDER BY r.ReceiptDate DESC
      `, [id, id, id]);

      setReceipts(receiptData);

      const totalDebt = receiptData.reduce((sum, r) => sum + (r.DebtorTotal || 0), 0);
      const paidDebt = receiptData.filter(r => r.ReceiptIsSettled).reduce((sum, r) => sum + (r.DebtorTotal || 0), 0);
      setStats({
        total: totalDebt,
        paid: paidDebt,
        open: totalDebt - paidDebt,
      });

    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handlePdfSave = async () => {
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    try {
      let receiptsToProcess = [...receipts];
      if (pdfStatus === 'paid') {
        receiptsToProcess = receipts.filter(r => r.ReceiptIsSettled);
      } else if (pdfStatus === 'unpaid') {
        receiptsToProcess = receipts.filter(r => !r.ReceiptIsSettled);
      }

      const receiptIds = receiptsToProcess.map(r => r.ReceiptID);
      if (receiptIds.length === 0) {
        showError("No receipts to export for the selected status.");
        return;
      }

      const placeholders = receiptIds.map(() => '?').join(',');
      const receiptsData = await db.query(`
        SELECT r.*, s.StoreName, pm.PaymentMethodName
        FROM Receipts r 
        JOIN Stores s ON r.StoreID = s.StoreID
        LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
        WHERE r.ReceiptID IN (${placeholders})
        ORDER BY r.ReceiptDate DESC
      `, receiptIds);

      const lineItemsData = await db.query(`
        SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType
        FROM LineItems li
        JOIN Products p ON li.ProductID = p.ProductID
        JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
        WHERE li.ReceiptID IN (${placeholders}) AND li.DebtorID = ?
      `, [...receiptIds, id]);

      const fullReceipts = receiptsData.map(receipt => {
        const items = lineItemsData.filter(li => li.ReceiptID === receipt.ReceiptID);
        const total = items.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
        return { ...receipt, lineItems: items, totalAmount: total };
      });

      await generateReceiptsPdf(fullReceipts, settings.pdf, (progress) => setPdfProgress(progress), settings.pdf.appendSuperReceipt);
    } catch (error) {
      showError(error);
    } finally {
      setIsGeneratingPdf(false);
      setIsPdfModalOpen(false);
    }
  };

  const handleRowClick = (row) => {
    navigate(`/receipts/view/${row.ReceiptID}`);
  };

  const handleSettleClick = (receipt) => {
    if (receipt.ReceiptIsSettled) {
      setUnsettleConfirmation({ isOpen: true, receiptId: receipt.ReceiptID });
    } else {
      setSelectedDebtForSettlement({
        receiptId: receipt.ReceiptID,
        debtorId: id,
        debtorName: debtor.DebtorName,
        amount: receipt.DebtorTotal,
        receiptDate: receipt.ReceiptDate,
        receiptPaymentMethodId: receipt.PaymentMethodID
      });
      setIsSettlementModalOpen(true);
    }
  };

  const handleUnsettleDebt = async () => {
    const { receiptId } = unsettleConfirmation;
    try {
      const payment = await db.queryOne('SELECT TopUpID FROM ReceiptDebtorPayments WHERE ReceiptID = ? AND DebtorID = ?', [receiptId, id]);
      await db.execute('DELETE FROM ReceiptDebtorPayments WHERE ReceiptID = ? AND DebtorID = ?', [receiptId, id]);
      if (payment && payment.TopUpID) {
        await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [payment.TopUpID]);
      }
      await fetchDetails();
    } catch (error) {
      showError(error);
    } finally {
      setUnsettleConfirmation({ isOpen: false, receiptId: null });
    }
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
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['Total Debt', 'Paid Debt', 'Open Debt'], axisLabel: { color: isDarkMode ? '#fff' : '#333' } },
    yAxis: { type: 'value', axisLabel: { formatter: '€{value}', color: isDarkMode ? '#fff' : '#333' } },
    series: [{
      name: 'Debt Stats',
      type: 'bar',
      data: [
        { value: stats.total, itemStyle: { color: '#5470c6' } },
        { value: stats.paid, itemStyle: { color: '#91cc75' } },
        { value: stats.open, itemStyle: { color: '#ee6666' } }
      ],
      barWidth: '40%'
    }]
  };

  const columns = [
    { header: 'Date', render: (row) => format(new Date(row.ReceiptDate), 'dd/MM/yyyy') },
    { header: 'Store', accessor: 'StoreName' },
    { header: 'Your Total', render: (row) => `€${(row.DebtorTotal || 0).toFixed(2)}` },
    {
      header: 'Status',
      render: (row) => (
        <span 
          className={cn(
            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer',
            row.ReceiptIsSettled 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
          )}
          onClick={(e) => { e.stopPropagation(); handleSettleClick(row); }}
        >
          {row.ReceiptIsSettled ? 'Settled' : 'Unsettled'}
        </span>
      )
    },
  ];

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner className="h-8 w-8 text-accent animate-spin" /></div>;
  if (!debtor) return <div>Debtor not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{debtor.DebtorName}</h1>
        <Button onClick={() => setIsPdfModalOpen(true)}>
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
          Save as PDF
        </Button>
      </div>

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

      <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="Generate PDF Report">
        <div className="space-y-4">
          <Select
            label="Include receipts that are:"
            value={pdfStatus}
            onChange={(e) => setPdfStatus(e.target.value)}
            options={[
              { value: 'all', label: 'Paid and unpaid' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'paid', label: 'Paid' },
            ]}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsPdfModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePdfSave}>Generate</Button>
          </div>
        </div>
      </Modal>

      <DebtSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSave={fetchDetails}
        debtInfo={selectedDebtForSettlement}
      />

      <ConfirmModal
        isOpen={unsettleConfirmation.isOpen}
        onClose={() => setUnsettleConfirmation({ isOpen: false, receiptId: null })}
        onConfirm={handleUnsettleDebt}
        title="Unsettle Debt"
        message={`Are you sure you want to mark this debt as unpaid for ${debtor?.DebtorName}? This will also delete the associated top-up transaction if it exists.`}
      />

      <ProgressModal
        isOpen={isGeneratingPdf}
        progress={pdfProgress}
        title="Generating PDF Report..."
      />
    </div>
  );
};

export default DebtorDetailsPage;
