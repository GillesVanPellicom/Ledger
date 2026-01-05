import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { db } from '../utils/db';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import { ArrowDownIcon, ArrowUpIcon, CalculatorIcon, ShoppingBagIcon, CurrencyEuroIcon, BanknotesIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import Spinner from '../components/ui/Spinner';
import TopProducts from '../components/analytics/TopProducts';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../utils/cn';

const AnalyticsPage = () => {
  const monthlyChartRef = useRef(null);
  const storeChartRef = useRef(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlySpending, setMonthlySpending] = useState([]);
  const [storeSpending, setStoreSpending] = useState([]);
  const [averages, setAverages] = useState({ avgPerReceipt: 0, avgItemsPerReceipt: 0, avgPricePerItem: 0 });
  const [paymentMethodStats, setPaymentMethodStats] = useState({ totalCapacity: 0, methods: [] });
  const [loading, setLoading] = useState(true);

  const { settings } = useSettings();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;

  const isDarkMode = useMemo(() => document.documentElement.classList.contains('dark'), []);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const monthlyChartInstance = monthlyChartRef.current?.getEchartsInstance();
    const storeChartInstance = storeChartRef.current?.getEchartsInstance();
    return () => {
      monthlyChartInstance?.dispose();
      storeChartInstance?.dispose();
    };
  }, []);

  useEffect(() => {
    const fetchYears = async () => {
      const result = await db.query("SELECT DISTINCT STRFTIME('%Y', ReceiptDate) as year FROM Receipts ORDER BY year DESC");
      const years = result.map(r => r.year);
      if (years.length > 0) {
        setAvailableYears(years);
        setSelectedYear(years[0]);
      } else {
        setAvailableYears([new Date().getFullYear().toString()]);
      }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    if (!selectedYear) return;

    const fetchData = async () => {
      setLoading(true);
      
      const monthlyResult = await db.query(`SELECT STRFTIME('%m', r.ReceiptDate) as month, SUM(li.LineQuantity * li.LineUnitPrice) as total FROM Receipts r JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE STRFTIME('%Y', r.ReceiptDate) = ? GROUP BY month ORDER BY month ASC`, [selectedYear.toString()]);
      const prevYearMonthlyResult = await db.query(`SELECT STRFTIME('%m', r.ReceiptDate) as month, SUM(li.LineQuantity * li.LineUnitPrice) as total FROM Receipts r JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE STRFTIME('%Y', r.ReceiptDate) = ? GROUP BY month`, [(selectedYear - 1).toString()]);
      const prevDecResult = await db.query(`SELECT SUM(li.LineQuantity * li.LineUnitPrice) as total FROM Receipts r JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE STRFTIME('%Y-%m', r.ReceiptDate) = ?`, [`${selectedYear - 1}-12`]);
      const prevDecTotal = prevDecResult[0]?.total || 0;

      const formattedMonthly = Array(12).fill(0).map((_, i) => {
        const monthStr = (i + 1).toString().padStart(2, '0');
        const monthData = monthlyResult.find(m => m.month === monthStr);
        let prevMonthTotal = (i === 0) ? prevDecTotal : (monthlyResult.find(m => m.month === i.toString().padStart(2, '0'))?.total || 0);
        const prevYearMonthData = prevYearMonthlyResult.find(m => m.month === monthStr);
        return { total: monthData?.total || 0, prevMonthTotal, prevYearMonthTotal: prevYearMonthData?.total || 0 };
      });
      setMonthlySpending(formattedMonthly);

      const storeResult = await db.query(`SELECT s.StoreName, SUM(li.LineQuantity * li.LineUnitPrice) as total FROM Receipts r JOIN LineItems li ON r.ReceiptID = li.ReceiptID JOIN Stores s ON r.StoreID = s.StoreID WHERE STRFTIME('%Y', r.ReceiptDate) = ? GROUP BY s.StoreName ORDER BY total DESC`, [selectedYear.toString()]);
      setStoreSpending(storeResult.map(s => ({ name: s.StoreName, value: s.total })));

      const averagesResult = await db.queryOne(`SELECT COUNT(DISTINCT r.ReceiptID) as receiptCount, SUM(li.LineQuantity) as totalItems, SUM(li.LineQuantity * li.LineUnitPrice) as totalSpent FROM Receipts r JOIN LineItems li ON r.ReceiptID = li.ReceiptID WHERE STRFTIME('%Y', r.ReceiptDate) = ?`, [selectedYear.toString()]);
      if (averagesResult && averagesResult.receiptCount > 0) {
        setAverages({ avgPerReceipt: averagesResult.totalSpent / averagesResult.receiptCount, avgItemsPerReceipt: averagesResult.totalItems / averagesResult.receiptCount, avgPricePerItem: averagesResult.totalSpent / averagesResult.totalItems });
      } else {
        setAverages({ avgPerReceipt: 0, avgItemsPerReceipt: 0, avgPricePerItem: 0 });
      }

      if (paymentMethodsEnabled) {
        const methods = await db.query('SELECT * FROM PaymentMethods');
        let totalCapacity = 0;
        const methodDetails = await Promise.all(methods.map(async (method) => {
          const expensesResult = await db.queryOne('SELECT SUM(li.LineQuantity * li.LineUnitPrice) as total FROM LineItems li JOIN Receipts r ON li.ReceiptID = r.ReceiptID WHERE r.PaymentMethodID = ?', [method.PaymentMethodID]);
          const topupsResult = await db.queryOne('SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?', [method.PaymentMethodID]);
          const expenses = expensesResult?.total || 0;
          const topups = topupsResult?.total || 0;
          const balance = (method.PaymentMethodFunds || 0) + topups - expenses;
          totalCapacity += balance;
          return { name: method.PaymentMethodName, balance };
        }));
        setPaymentMethodStats({ totalCapacity, methods: methodDetails });
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedYear, paymentMethodsEnabled]);

  const monthlyChartOption = useMemo(() => ({ backgroundColor: 'transparent', tooltip: { trigger: 'axis', valueFormatter: (value) => typeof value === 'number' ? `€${value.toFixed(2)}` : value }, xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }, yAxis: { type: 'value', axisLabel: { formatter: '€{value}' } }, series: [{ data: monthlySpending.map(m => m.total.toFixed(2)), type: 'bar' }], grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true } }), [monthlySpending]);
  const storeChartOption = useMemo(() => ({ backgroundColor: 'transparent', tooltip: { trigger: 'item', formatter: '{b}: €{c} ({d}%)' }, legend: { orient: 'vertical', left: 'left', type: 'scroll' }, series: [{ name: 'Store Spending', type: 'pie', radius: '50%', data: storeSpending, emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } } }] }), [storeSpending]);

  const TrendIndicator = ({ current, previous }) => {
    if (previous === 0 || current === 0) return <span className="text-gray-300 dark:text-gray-600">-</span>;
    const change = ((current - previous) / previous) * 100;
    const diff = current - previous;
    const isUp = change > 0;
    const colorClass = isUp ? 'text-red-500' : 'text-green-500';
    return (<div className="flex flex-col items-center"><span className={`flex items-center text-xs font-medium ${colorClass}`}>{isUp ? <ArrowUpIcon className="h-3 w-3 mr-0.5" /> : <ArrowDownIcon className="h-3 w-3 mr-0.5" />}{Math.abs(change).toFixed(0)}%</span><span className={`text-[10px] ${colorClass}`}>{diff > 0 ? '+' : ''}€{diff.toFixed(0)}</span></div>);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {paymentMethodsEnabled && (
        <div className="pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 p-6 flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50">
              <div className="p-4 bg-white/50 dark:bg-white/10 rounded-full mb-4"><BanknotesIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-300" /></div>
              <p className="text-lg text-gray-600 dark:text-gray-300">Net Worth</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mt-1">€{paymentMethodStats.totalCapacity.toFixed(2)}</p>
            </Card>
            <Card className="lg:col-span-2 p-6">
              <div className="space-y-4">
                {paymentMethodStats.methods.map((method, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{method.name}</span>
                    <span className={cn("font-semibold", method.balance >= 0 ? 'text-gray-800 dark:text-gray-200' : 'text-red-500')}>€{method.balance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <hr className="my-8 border-gray-200 dark:border-gray-800" />
        </div>
      )}

      <div className="flex items-center justify-end">
        <div className="w-48"><Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} options={availableYears.map(y => ({ value: y, label: y }))} /></div>
      </div>

      <Card><div className="p-6"><h2 className="text-lg font-semibold mb-4">Monthly Spending</h2>{loading ? <Spinner /> : <ReactECharts ref={monthlyChartRef} option={monthlyChartOption} theme={theme} style={{ height: '300px' }} notMerge={true} />}</div></Card>
      <Card><div className="p-4 overflow-x-auto"><table className="w-full text-sm text-center"><thead><tr><th className="p-2 text-left text-gray-500 font-medium w-24"></th>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (<th key={m} className="p-2 font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">{m}</th>))}</tr></thead><tbody className="divide-y dark:divide-gray-800"><tr><td className="p-2 text-left font-medium text-gray-600 dark:text-gray-400">vs Prev</td>{monthlySpending.map((month, i) => (<td key={i} className="p-2"><TrendIndicator current={month.total} previous={month.prevMonthTotal} /></td>))}</tr><tr><td className="p-2 text-left font-medium text-gray-600 dark:text-gray-400">vs Year</td>{monthlySpending.map((month, i) => (<td key={i} className="p-2"><TrendIndicator current={month.total} previous={month.prevYearMonthTotal} /></td>))}</tr></tbody></table></div></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><div className="p-6"><h2 className="text-lg font-semibold mb-4">Spending by Store</h2>{loading ? <Spinner /> : <ReactECharts ref={storeChartRef} option={storeChartOption} theme={theme} style={{ height: '300px' }} notMerge={true} />}</div></Card>
        <Card><div className="p-6"><h2 className="text-lg font-semibold mb-6">Receipt Averages</h2><div className="space-y-6"><div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><CurrencyEuroIcon className="h-6 w-6" /></div><span className="font-medium text-gray-600 dark:text-gray-300">Avg. Receipt Total</span></div><span className="text-xl font-bold">€{averages.avgPerReceipt.toFixed(2)}</span></div><div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg"><ShoppingBagIcon className="h-6 w-6" /></div><span className="font-medium text-gray-600 dark:text-gray-300">Avg. Items / Receipt</span></div><span className="text-xl font-bold">{averages.avgItemsPerReceipt.toFixed(1)}</span></div><div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><CalculatorIcon className="h-6 w-6" /></div><span className="font-medium text-gray-600 dark:text-gray-300">Avg. Price / Item</span></div><span className="text-xl font-bold">€{averages.avgPricePerItem.toFixed(2)}</span></div></div></div></Card>
        <div className="col-span-1 lg:col-span-2 border-t border-gray-200 dark:border-gray-800 pt-6"><TopProducts /></div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
