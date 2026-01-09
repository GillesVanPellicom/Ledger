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
import { DocumentArrowDownIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, PencilIcon } from '@heroicons/react/24/solid';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import { generateReceiptsPdf } from '../utils/pdfGenerator';
import ProgressModal from '../components/ui/ProgressModal';
import { useError } from '../context/ErrorContext';
import { useSettings } from '../context/SettingsContext';
import DebtSettlementModal from '../components/debt/DebtSettlementModal';
import DebtPdfOptionsModal from '../components/debt/DebtPdfOptionsModal';
import EntityModal from '../components/debt/EntityModal';
import { Entity, Receipt } from '../types';
import { useDebtCalculation } from '../hooks/useDebtCalculation';

interface MarkAsPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethodId: string) => void;
  paymentMethods: { value: number; label: string }[];
  entityName: string;
  receipt: Receipt | null;
  paymentMethodsEnabled: boolean;
}

const MarkAsPaidModal: React.FC<MarkAsPaidModalProps> = ({ isOpen, onClose, onConfirm, paymentMethods, entityName, receipt, paymentMethodsEnabled }) => {
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.value.toString() || '1');

  useEffect(() => {
    if (isOpen) {
      if (paymentMethodsEnabled && paymentMethods.length > 0) {
        setPaymentMethodId(paymentMethods[0].value.toString());
      } else {
        setPaymentMethodId('1'); // Default to 'Cash'
      }
    }
  }, [isOpen, paymentMethods, paymentMethodsEnabled]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark as Paid"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(paymentMethodId)} disabled={paymentMethodsEnabled && !paymentMethodId}>Confirm Payment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p>You are about to mark your debt of <span className="font-bold">€{receipt?.amount?.toFixed(2)}</span> to <span className="font-bold">{entityName}</span> as paid.</p>
        {paymentMethodsEnabled && (
          <Select
            label="Payment Method"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            options={paymentMethods}
          />
        )}
      </div>
    </Modal>
  );
};

const EntityDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isPdfOptionsModalOpen, setIsPdfOptionsModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [selectedDebtForSettlement, setSelectedDebtForSettlement] = useState<any>(null);
  const [unsettleConfirmation, setUnsettleConfirmation] = useState<{ isOpen: boolean, receiptId: number | null, type: 'to_me' | 'to_entity' | null }>({ isOpen: false, receiptId: null, type: null });
  const [isMarkAsPaidModalOpen, setIsMarkAsPaidModalOpen] = useState<boolean>(false);
  const [receiptToMarkAsPaid, setReceiptToMarkAsPaid] = useState<Receipt | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{ value: number; label: string }[]>([]);
  const [isEditEntityModalOpen, setIsEditEntityModalOpen] = useState<boolean>(false);

  const { showError } = useError();
  const { settings } = useSettings();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const { receipts, stats, loading: debtLoading, calculate: calculateDebt } = useDebtCalculation();

  const isDarkMode = useMemo(() => document.documentElement.classList.contains('dark'), []);
  const theme = isDarkMode ? 'dark' : 'light';

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const entityData = await db.queryOne<Entity>('SELECT * FROM Debtors WHERE DebtorID = ?', [id]);
      setEntity(entityData);

      if (paymentMethodsEnabled) {
        const pmData = await db.query<{ PaymentMethodID: number, PaymentMethodName: string }[]>('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods ORDER BY PaymentMethodName');
        setPaymentMethods(pmData.map(pm => ({ value: pm.PaymentMethodID, label: pm.PaymentMethodName })));
      }

      if (id) {
        await calculateDebt(id);
      }

    } catch (error) {
      showError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [id, showError, paymentMethodsEnabled, calculateDebt]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleGeneratePdf = async (direction: 'all' | 'to_me' | 'to_entity', status: 'all' | 'settled' | 'unsettled') => {
    setIsPdfOptionsModalOpen(false);
    setIsGeneratingPdf(true);
    setPdfProgress(0);

    try {
      let receiptsToProcess = filteredReceipts;

      if (direction !== 'all') {
        receiptsToProcess = receiptsToProcess.filter(r => r.type === direction);
      }
      if (status !== 'all') {
        receiptsToProcess = receiptsToProcess.filter(r => (status === 'settled' ? r.isSettled : !r.isSettled));
      }

      if (receiptsToProcess.length === 0) {
        showError(new Error("No receipts match the selected criteria."));
        return;
      }

      const fullReceiptsData: any[] = [];
      for (let i = 0; i < receiptsToProcess.length; i++) {
        const r = receiptsToProcess[i];
        const receiptDetails = await db.queryOne<any>(`
          SELECT r.*, s.StoreName, pm.PaymentMethodName
          FROM Receipts r
          JOIN Stores s ON r.StoreID = s.StoreID
          LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
          WHERE r.ReceiptID = ?
        `, [r.ReceiptID]);

        const lineItems = await db.query<any[]>(`
          SELECT li.*, p.ProductName, p.ProductBrand
          FROM LineItems li
          JOIN Products p ON li.ProductID = p.ProductID
          WHERE li.ReceiptID = ?
        `, [r.ReceiptID]);
        
        const images = await db.query<any[]>('SELECT * FROM ReceiptImages WHERE ReceiptID = ?', [r.ReceiptID]);

        let totalAmount = r.amount;
        if (r.type === 'to_me') {
          if (r.IsNonItemised) {
            totalAmount = r.NonItemisedTotal;
          } else {
            const subtotal = lineItems.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
            const discountableAmount = lineItems
              .filter(item => !item.IsExcludedFromDiscount)
              .reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
            const discountAmount = (discountableAmount * (receiptDetails.Discount || 0)) / 100;
            totalAmount = Math.max(0, subtotal - discountAmount);
          }
        }

        fullReceiptsData.push({
          ...receiptDetails,
          lineItems,
          images,
          totalAmount,
          debtInfo: {
            entityName: entity!.DebtorName,
            direction: r.type === 'to_me' ? `Owed to ${settings.userName || 'you'}` : `Owed to ${entity!.DebtorName}`,
          }
        });
        
        setPdfProgress(Math.round(((i + 1) / receiptsToProcess.length) * 50));
      }

      await generateReceiptsPdf(fullReceiptsData, settings.pdf, (progress: number) => setPdfProgress(50 + progress / 2));

    } catch (error) {
      showError(error as Error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRowClick = (row: Receipt, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    // Check if the click was on a button or link within the row
    if (target.closest('button, a')) {
      return;
    }
    navigate(`/receipts/view/${row.ReceiptID}`);
  };

  const handleSettleClick = (receipt: Receipt) => {
    if (receipt.type === 'to_me') {
      if (receipt.isSettled) {
        setUnsettleConfirmation({ isOpen: true, receiptId: receipt.ReceiptID, type: 'to_me' });
      } else {
        setSelectedDebtForSettlement({
          receiptId: receipt.ReceiptID,
          debtorId: id,
          debtorName: entity!.DebtorName,
          amount: receipt.amount,
          receiptDate: receipt.ReceiptDate,
          receiptPaymentMethodId: receipt.PaymentMethodID
        });
        setIsSettlementModalOpen(true);
      }
    } else { // type === 'to_entity'
      if (receipt.isSettled) {
        setUnsettleConfirmation({ isOpen: true, receiptId: receipt.ReceiptID, type: 'to_entity' });
      } else {
        setReceiptToMarkAsPaid(receipt);
        setIsMarkAsPaidModalOpen(true);
      }
    }
  };

  const handleMarkAsPaid = async (paymentMethodId: string) => {
    if (!receiptToMarkAsPaid) return;
    try {
      await db.execute(
        'UPDATE Receipts SET Status = ?, PaymentMethodID = ? WHERE ReceiptID = ?',
        ['paid', paymentMethodId, receiptToMarkAsPaid.ReceiptID]
      );
      await fetchDetails();
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsMarkAsPaidModalOpen(false);
      setReceiptToMarkAsPaid(null);
    }
  };

  const handleUnsettle = async () => {
    const { receiptId, type } = unsettleConfirmation;
    if (!receiptId) return;
    try {
      if (type === 'to_me') {
        const payment = await db.queryOne<{ TopUpID: number }>('SELECT TopUpID FROM ReceiptDebtorPayments WHERE ReceiptID = ? AND DebtorID = ?', [receiptId, id]);
        await db.execute('DELETE FROM ReceiptDebtorPayments WHERE ReceiptID = ? AND DebtorID = ?', [receiptId, id]);
        if (payment && payment.TopUpID) {
          await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [payment.TopUpID]);
        }
      } else { // type === 'to_entity'
        await db.execute('UPDATE Receipts SET Status = ?, PaymentMethodID = NULL WHERE ReceiptID = ?', ['unpaid', receiptId]);
      }
      await fetchDetails();
    } catch (error) {
      showError(error as Error);
    } finally {
      setUnsettleConfirmation({ isOpen: false, receiptId: null, type: null });
    }
  };

  const filteredReceipts = useMemo(() => {
    const keywords = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
    const [startDate, endDate] = dateRange;

    return receipts.filter(r => {
      if (filter === 'to_me' && r.type !== 'to_me') return false;
      if (filter === 'to_entity' && r.type !== 'to_entity') return false;

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
    legend: { top: '5%', left: 'center', textStyle: { color: isDarkMode ? '#fff' : '#333' } },
    series: [{
      name: 'Debt Balance',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
      labelLine: { show: false },
      data: [
        { value: stats.debtToMe, name: 'Owes You', itemStyle: { color: '#91cc75' } },
        { value: stats.debtToEntity, name: 'You Owe', itemStyle: { color: '#ee6666' } }
      ]
    }]
  };

  const columns = [
    { header: 'Date', render: (row: Receipt) => format(new Date(row.ReceiptDate), 'dd/MM/yyyy') },
    { header: 'Store', accessor: 'StoreName' },
    { header: 'Amount', render: (row: Receipt) => `€${(row.amount || 0).toFixed(2)}` },
    {
      header: 'Direction',
      render: (row: Receipt) => (
        <div className="flex items-center">
          {row.type === 'to_me' ? 
            <ArrowUpCircleIcon className="h-5 w-5 text-green-500 mr-2" /> : 
            <ArrowDownCircleIcon className="h-5 w-5 text-red-500 mr-2" />}
          {row.type === 'to_me' ? 'Owes You' : 'You Owe'}
        </div>
      )
    },
    {
      header: 'Status',
      render: (row: Receipt) => (
        <div 
          className="flex flex-col items-end cursor-pointer"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleSettleClick(row); }}
        >
          <span 
            className={cn(
              'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
              row.isSettled 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
            )}
          >
            {row.isSettled ? 'Settled' : 'Unsettled'}
          </span>
          {row.splitPart && row.TotalShares ? (
            <span className="text-xs text-gray-500 mt-1">
              {row.splitPart}/{row.TotalShares} shares
            </span>
          ) : null}
        </div>
      )
    },
  ];

  if (loading || debtLoading) return <div className="flex justify-center items-center h-full"><Spinner className="h-8 w-8 text-accent animate-spin" /></div>;
  if (!entity) return <div>Entity not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{entity.DebtorName}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsPdfOptionsModalOpen(true)}>
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Save as PDF
          </Button>
          <Button onClick={() => setIsEditEntityModalOpen(true)}>
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center bg-green-50 dark:bg-green-900/20">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Owes You</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">€{stats.debtToMe.toFixed(2)}</p>
        </Card>
        <Card className="p-4 text-center bg-red-50 dark:bg-red-900/20">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">You Owe</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">€{stats.debtToEntity.toFixed(2)}</p>
        </Card>
        <Card className={cn("p-4 text-center", stats.netBalance >= 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-purple-50 dark:bg-purple-900/20")}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Balance</p>
          <p className={cn("text-2xl font-bold", stats.netBalance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400")}>
            {stats.netBalance >= 0 ? `${entity.DebtorName} owes you €${stats.netBalance.toFixed(2)}` : `You owe ${entity.DebtorName} €${Math.abs(stats.netBalance).toFixed(2)}`}
          </p>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Debt Balance</h2>
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
            onChange={(update: any) => { setDateRange(update); setCurrentPage(1); }}
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
              { value: 'to_me', label: 'Owes You' },
              { value: 'to_entity', label: 'You Owe' },
            ]}
          />
        </div>
      </DataTable>

      <DebtSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSave={fetchDetails}
        debtInfo={selectedDebtForSettlement}
      />

      <ConfirmModal
        isOpen={unsettleConfirmation.isOpen}
        onClose={() => setUnsettleConfirmation({ isOpen: false, receiptId: null, type: null })}
        onConfirm={handleUnsettle}
        title="Unsettle Debt"
        message={`Are you sure you want to mark this debt as unpaid?`}
      />

      <MarkAsPaidModal
        isOpen={isMarkAsPaidModalOpen}
        onClose={() => setIsMarkAsPaidModalOpen(false)}
        onConfirm={handleMarkAsPaid}
        paymentMethods={paymentMethods}
        entityName={entity.DebtorName}
        receipt={receiptToMarkAsPaid}
        paymentMethodsEnabled={paymentMethodsEnabled}
      />

      <DebtPdfOptionsModal
        isOpen={isPdfOptionsModalOpen}
        onClose={() => setIsPdfOptionsModalOpen(false)}
        onConfirm={handleGeneratePdf}
      />

      <ProgressModal
        isOpen={isGeneratingPdf}
        progress={pdfProgress}
        title="Generating PDF Report..."
      />

      {entity && (
        <EntityModal
          isOpen={isEditEntityModalOpen}
          onClose={() => setIsEditEntityModalOpen(false)}
          entityToEdit={entity}
          onSave={() => {
            setIsEditEntityModalOpen(false);
            fetchDetails();
          }}
        />
      )}
    </div>
  );
};

export default EntityDetailsPage;
