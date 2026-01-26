import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import TransferModal from '../components/payment/TransferModal';
import { Pencil, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import ReactECharts from 'echarts-for-react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import Input from '../components/ui/Input';
import { PaymentMethod, TopUp } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { useQueryClient } from '@tanstack/react-query';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import { usePaymentMethodBalance } from '../hooks/usePaymentMethods';
import TransactionDataTable from '../components/receipts/TransactionDataTable';
import { useTransactions } from '../hooks/useTransactions';
import NotFoundState from '../components/ui/NotFoundState';

const PaymentMethodDetailsPage: React.FC = () => {
  const chartRef = useRef<ReactECharts>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [methodName, setMethodName] = useState('');
  const [transferToEdit, setTransferToEdit] = useState<TopUp | null>(null);

  const isDarkMode = useMemo(() => document.documentElement.classList.contains('dark'), []);
  const theme = isDarkMode ? 'dark' : 'light';

  const { data: balanceData, isLoading: isBalanceLoading } = usePaymentMethodBalance(
    parseInt(id!, 10), 
    method?.PaymentMethodFunds || 0
  );

  // Fetch all transactions for the chart using the hook
  // We use a large pageSize to get enough data for the chart
  const { data: transactionsData } = useTransactions({
    page: 1,
    pageSize: 1000,
    methodFilter: id,
    typeFilter: 'all'
  });

  const allTransactions = transactionsData?.transactions || [];

  const fetchMethod = useCallback(async () => {
    setLoading(true);
    try {
      const methodData = await db.queryOne<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodID = ?', [id]);
      if (methodData) {
        setMethod(methodData);
        setMethodName(methodData.PaymentMethodName || '');
      }
    } catch (error) {
      console.error("Failed to fetch payment method:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMethod();
  }, [fetchMethod]);

  const handleRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance', parseInt(id!, 10)] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleUpdateMethodName = async () => {
    if (!methodName.trim()) return;
    try {
      await db.execute('UPDATE PaymentMethods SET PaymentMethodName = ? WHERE PaymentMethodID = ?', [methodName.trim(), id]);
      fetchMethod();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update payment method name:", error);
      throw error;
    }
  };

  const balanceChartOption = useMemo(() => {
    const sortedTransactions = [...allTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
  }, [allTransactions, method]);

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner className="h-8 w-8 text-accent animate-spin" /></div>;
  if (!method) return <NotFoundState title="Payment Method Not Found" message="The payment method you're looking for might have been deleted or moved." />;

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
          </>
        }
        variant="centered-box"
        centeredContent={
          <div className="text-center flex items-center justify-center gap-2">
            <div>
              <div className="flex items-center justify-center gap-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</p>
                <Tooltip content="This is the net balance of this method, calculated by summing all deposits, transfers, and expenses.">
                  <Info className="h-3 w-3 text-gray-400" />
                </Tooltip>
              </div>
              {isBalanceLoading || balanceData === undefined ? (
                <div className="flex justify-center items-center h-10">
                  <Spinner className="h-6 w-6 text-font-2" />
                </div>
              ) : (
                <MoneyDisplay
                  amount={balanceData.balance}
                  showSign={true}
                  useSignum={true}
                  className="text-3xl font-bold"
                />
              )}
            </div>
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

          <TransactionDataTable 
            instanceId={`payment-method-${id}`}
            fixedFilters={{ method: id }} 
            hideColumns={['method']}
            onRefetch={handleRefetch}
          />

          <TransferModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            onSave={handleRefetch}
            topUpToEdit={transferToEdit}
            paymentMethodId={id!}
            currentBalance={balanceData?.balance || 0}
          />

          <Modal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            title="Edit Method" 
            onEnter={handleUpdateMethodName}
            isDatabaseTransaction
            successToastMessage="Method updated successfully"
            errorToastMessage="Failed to update method"
            loadingMessage="Updating method..."
            footer={
              <div className="flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateMethodName}>Save</Button>
              </div>
            }
          >
            <div className="space-y-4">
              <Input
                label="Method Name"
                value={methodName}
                onChange={(e) => setMethodName(e.target.value)}
                placeholder="Enter new method name"
              />
            </div>
          </Modal>
        </div>
      </PageWrapper>
    </div>
  );
};

export default PaymentMethodDetailsPage;
