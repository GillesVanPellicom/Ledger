import React, {useState, useEffect, useMemo, useRef} from 'react';
import ReactECharts from 'echarts-for-react';
import {db} from '../utils/db';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalculatorIcon,
  ShoppingBagIcon,
  CurrencyEuroIcon,
  BanknotesIcon,
  UserGroupIcon,
  InformationCircleIcon
} from '@heroicons/react/24/solid';
import {format} from 'date-fns';
import Spinner from '../components/ui/Spinner';
import TopProducts from '../components/analytics/TopProducts';
import {useSettings} from '../context/SettingsContext';
import {cn} from '../utils/cn';
import Tooltip from '../components/ui/Tooltip';
import {MonthlySpending, StoreSpending, Averages, PaymentMethodStats, DebtStats, Debtor} from '../types';
import InfoCard from '../components/ui/InfoCard';
import {calculateDebts} from '../utils/debtCalculator';

const AnalyticsPage: React.FC = () => {
  const monthlyChartRef = useRef<ReactECharts>(null);
  const storeChartRef = useRef<ReactECharts>(null);
  const debtBarChartRef = useRef<ReactECharts>(null);

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([]);
  const [storeSpending, setStoreSpending] = useState<StoreSpending[]>([]);
  const [averages, setAverages] = useState<Averages>({avgPerReceipt: 0, avgItemsPerReceipt: 0, avgPricePerItem: 0});
  const [paymentMethodStats, setPaymentMethodStats] = useState<PaymentMethodStats>({totalCapacity: 0, methods: []});
  const [debtStats, setDebtStats] = useState<DebtStats>({netBalances: [], totalOwedToMe: 0, totalOwedByMe: 0});
  const [hasItemlessReceipts, setHasItemlessReceipts] = useState<boolean>(false);
  const [hasTentativeReceipts, setHasTentativeReceipts] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const {settings} = useSettings();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;

  const isDarkMode = useMemo(() => document.documentElement.classList.contains('dark'), []);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const instances = [
      monthlyChartRef.current?.getEchartsInstance(),
      storeChartRef.current?.getEchartsInstance(),
      debtBarChartRef.current?.getEchartsInstance(),
    ].filter(Boolean);
    return () => instances.forEach(instance => instance?.dispose());
  }, []);

  useEffect(() => {
    const fetchYears = async () => {
      const result = await db.query<{
        year: string
      }[]>("SELECT DISTINCT STRFTIME('%Y', ReceiptDate) as year FROM Receipts ORDER BY year DESC");
      const years = result.map(r => r.year);
      if (years.length > 0) {
        setAvailableYears(years);
        if (!years.includes(selectedYear)) {
          setSelectedYear(years[0]);
        }
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

      const yearFilter = `STRFTIME('%Y', r.ReceiptDate) = ?`;
      const baseWhere = `r.IsTentative = 0`;

      const itemlessCheck = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count
                                                                  FROM Receipts r
                                                                  WHERE r.IsNonItemised = 1
                                                                    AND ${yearFilter}`, [selectedYear]);
      setHasItemlessReceipts(itemlessCheck ? itemlessCheck.count > 0 : false);

      const tentativeCheck = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count
                                                                   FROM Receipts r
                                                                   WHERE r.IsTentative = 1
                                                                     AND ${yearFilter}`, [selectedYear]);
      setHasTentativeReceipts(tentativeCheck ? tentativeCheck.count > 0 : false);

      const totalQueryPart = `SUM(CASE WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal ELSE li.LineQuantity * li.LineUnitPrice END)`;

      const monthlyResult = await db.query<{
        month: string,
        total: number
      }[]>(`SELECT STRFTIME('%m', r.ReceiptDate) as month, ${totalQueryPart} as total
            FROM Receipts r
                     LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID
            WHERE ${yearFilter}
              AND ${baseWhere}
            GROUP BY month
            ORDER BY month ASC`, [selectedYear]);
      const prevYearMonthlyResult = await db.query<{
        month: string,
        total: number
      }[]>(`SELECT STRFTIME('%m', r.ReceiptDate) as month, ${totalQueryPart} as total
            FROM Receipts r
                     LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID
            WHERE STRFTIME('%Y', r.ReceiptDate) = ?
              AND ${baseWhere}
            GROUP BY month`, [(parseInt(selectedYear) - 1).toString()]);
      const prevDecResult = await db.queryOne<{ total: number }>(`SELECT ${totalQueryPart} as total
                                                                  FROM Receipts r
                                                                           LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID
                                                                  WHERE STRFTIME('%Y-%m', r.ReceiptDate) = ?
                                                                    AND ${baseWhere}`, [`${parseInt(selectedYear) - 1}-12`]);
      const prevDecTotal = prevDecResult?.total || 0;

      const formattedMonthly: MonthlySpending[] = Array(12).fill(0).map((_, i) => {
        const monthStr = (i + 1).toString().padStart(2, '0');
        const monthData = monthlyResult.find(m => m.month === monthStr);
        let prevMonthTotal = (i === 0) ? prevDecTotal : (monthlyResult.find(m => m.month === i.toString().padStart(2, '0'))?.total || 0);
        const prevYearMonthData = prevYearMonthlyResult.find(m => m.month === monthStr);
        return {total: monthData?.total || 0, prevMonthTotal, prevYearMonthTotal: prevYearMonthData?.total || 0};
      });
      setMonthlySpending(formattedMonthly);

      const storeResult = await db.query<{
        StoreName: string,
        total: number
      }[]>(`SELECT s.StoreName, ${totalQueryPart} as total
            FROM Receipts r
                     LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID
                     JOIN Stores s ON r.StoreID = s.StoreID
            WHERE ${yearFilter}
              AND ${baseWhere}
            GROUP BY s.StoreName
            ORDER BY total DESC`, [selectedYear]);
      setStoreSpending(storeResult.map(s => ({name: s.StoreName, value: s.total})));

      const averagesResult = await db.queryOne<{
        receiptCount: number,
        totalItems: number,
        totalSpent: number
      }>(`SELECT COUNT(DISTINCT r.ReceiptID)                          as receiptCount,
                 SUM(li.LineQuantity)                                 as totalItems,
                 SUM(CASE
                         WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal
                         ELSE li.LineQuantity * li.LineUnitPrice END) as totalSpent
          FROM Receipts r
                   LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID
          WHERE ${yearFilter}
            AND ${baseWhere}`, [selectedYear]);
      setAverages(averagesResult && averagesResult.receiptCount > 0 ? {
        avgPerReceipt: averagesResult.totalSpent / averagesResult.receiptCount,
        avgItemsPerReceipt: averagesResult.totalItems / averagesResult.receiptCount,
        avgPricePerItem: averagesResult.totalSpent / averagesResult.totalItems
      } : {avgPerReceipt: 0, avgItemsPerReceipt: 0, avgPricePerItem: 0});

      if (paymentMethodsEnabled) {
        const methods = await db.query<{
          PaymentMethodID: number,
          PaymentMethodName: string,
          PaymentMethodFunds: number
        }[]>('SELECT * FROM PaymentMethods');
        let totalCapacity = 0;
        const methodDetails = await Promise.all(methods.map(async (method) => {
          const expensesResult = await db.queryOne<{ total: number }>(`SELECT SUM(CASE
                                                                                      WHEN r.IsNonItemised = 1
                                                                                          THEN r.NonItemisedTotal
                                                                                      ELSE li.LineQuantity * li.LineUnitPrice END) as total
                                                                       FROM Receipts r
                                                                                LEFT JOIN LineItems li ON r.ReceiptID = li.ReceiptID
                                                                       WHERE r.PaymentMethodID = ?
                                                                         AND ${baseWhere}`, [method.PaymentMethodID]);
          const topupsResult = await db.queryOne<{
            total: number
          }>('SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?', [method.PaymentMethodID]);
          const balance = (method.PaymentMethodFunds || 0) + (topupsResult?.total || 0) - (expensesResult?.total || 0);
          totalCapacity += balance;
          return {name: method.PaymentMethodName, balance};
        }));
        setPaymentMethodStats({totalCapacity, methods: methodDetails});
      }

      if (debtEnabled) {
        const debtors = await db.query<Debtor[]>('SELECT * FROM Debtors WHERE DebtorIsActive = 1');
        let totalOwedToMe = 0;
        let totalOwedByMe = 0;
        const netBalances: { name: string, value: number }[] = [];

        for (const debtor of debtors) {
          const {debtToMe, debtToEntity} = await calculateDebts(debtor.DebtorID);
          if (debtToMe - debtToEntity !== 0) {
            netBalances.push({name: debtor.DebtorName, value: debtToMe - debtToEntity});
          }
          totalOwedToMe += debtToMe;
          totalOwedByMe += debtToEntity;
        }

        setDebtStats({
          netBalances: netBalances.sort((a, b) => b.value - a.value),
          totalOwedToMe,
          totalOwedByMe,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedYear, paymentMethodsEnabled, debtEnabled]);

  const monthlyChartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number | string) => typeof value === 'number' ? `€${value.toFixed(2)}` : value
    },
    xAxis: {
      type: 'category',
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    yAxis: {type: 'value', axisLabel: {formatter: '€{value}'}},
    series: [{data: monthlySpending.map(m => m.total.toFixed(2)), type: 'bar'}],
    grid: {left: '3%', right: '4%', bottom: '3%', containLabel: true}
  }), [monthlySpending]);
  const storeChartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {trigger: 'item', formatter: '{b}: €{c} ({d}%)'},
    legend: {orient: 'vertical', left: 'left', type: 'scroll'},
    series: [{
      name: 'Store Spending',
      type: 'pie',
      radius: '50%',
      data: storeSpending,
      emphasis: {itemStyle: {shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)'}}
    }]
  }), [storeSpending]);

  const debtBarChartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {type: 'shadow'},
      formatter: (params: any) => `${params[0].name}: €${params[0].value.toFixed(2)}`
    },
    grid: {left: '3%', right: '4%', bottom: '3%', containLabel: true},
    xAxis: {type: 'category', data: debtStats.netBalances.map(d => d.name)},
    yAxis: {type: 'value', axisLabel: {formatter: '€{value}'}},
    series: [{
      name: 'Net Balance',
      type: 'bar',
      label: {show: true, position: 'top', formatter: (params: any) => `€${params.value.toFixed(2)}`},
      data: debtStats.netBalances.map(d => ({
        value: d.value,
        itemStyle: {color: d.value >= 0 ? '#91cc75' : '#ee6666'}
      })),
    }]
  }), [debtStats.netBalances]);

  const TrendIndicator = ({current, previous}: { current: number, previous: number }) => {
    if (previous === 0 || current === 0) return <span className="text-gray-300 dark:text-gray-600">-</span>;
    const change = ((current - previous) / previous) * 100;
    const diff = current - previous;
    const isUp = change > 0;
    const colorClass = isUp ? 'text-red-500' : 'text-green-500';
    return (<div className="flex flex-col items-center">
      <span className={`flex items-center text-xs font-medium ${colorClass}`}>{isUp ?
        <ArrowUpIcon className="h-3 w-3 mr-0.5"/> :
        <ArrowDownIcon className="h-3 w-3 mr-0.5"/>}{Math.abs(change).toFixed(0)}%</span><span className={`text-[10px] ${colorClass}`}>{diff > 0 ? '+' : ''}€{diff.toFixed(0)}</span>
    </div>);
  };

  const CardHeader = ({title, tooltipText}: { title: string, tooltipText: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <Tooltip content={tooltipText}><InformationCircleIcon className="h-5 w-5 text-gray-400"/></Tooltip>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {paymentMethodsEnabled && (
        <div className="pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 p-6 flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50">
              <div className="p-4 bg-white/50 dark:bg-white/10 rounded-full mb-4">
                <BanknotesIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-300"/></div>
              <p className="text-lg text-gray-600 dark:text-gray-300">Net Worth</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mt-1">€{paymentMethodStats.totalCapacity.toFixed(2)}</p>
            </Card>
            <Card className="lg:col-span-2 p-6">
              <CardHeader title="Payment Method Balances" tooltipText="Current balance of each payment method."/>
              <div className="space-y-4">
                {paymentMethodStats.methods.map((method, index) => (
                  <div key={index}
                       className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{method.name}</span>
                    <span className={cn("font-semibold", method.balance >= 0 ? 'text-gray-800 dark:text-gray-200' : 'text-red-500')}>€{method.balance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <hr className="my-8 border-gray-200 dark:border-gray-800"/>
        </div>
      )}

      {debtEnabled && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Debt Analytics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 text-center bg-green-50 dark:bg-green-900/20">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Owed to You</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">€{debtStats.totalOwedToMe.toFixed(2)}</p>
            </Card>
            <Card className="p-4 text-center bg-red-50 dark:bg-red-900/20">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total You Owe</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">€{debtStats.totalOwedByMe.toFixed(2)}</p>
            </Card>
            <Card className={cn("p-4 text-center", (debtStats.totalOwedToMe - debtStats.totalOwedByMe) >= 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-purple-50 dark:bg-purple-900/20")}>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Debt Balance</p>
              <p className={cn("text-2xl font-bold", (debtStats.totalOwedToMe - debtStats.totalOwedByMe) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400")}>
                €{(debtStats.totalOwedToMe - debtStats.totalOwedByMe).toFixed(2)}
              </p>
            </Card>
          </div>
          <Card>
            <div className="p-6">
              <CardHeader title="Net Balance per Entity"
                          tooltipText="Shows the net financial position with each entity. Positive values (green) mean they owe you, negative (red) mean you owe them."/>
              {loading ? <Spinner/> : <ReactECharts ref={debtBarChartRef}
                                                    option={debtBarChartOption}
                                                    theme={theme}
                                                    style={{height: '400px'}}
                                                    notMerge={true}/>}
            </div>
          </Card>
          <hr className="my-8 border-gray-200 dark:border-gray-800"/>
        </div>
      )}

      <div className="flex items-center justify-end">
        <div className="w-48"><Select value={selectedYear}
                                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedYear(e.target.value)}
                                      options={availableYears.map(y => ({value: y, label: y}))}/></div>
      </div>

      <Card>
        <div className="p-6">
          <CardHeader title="Monthly Spending" tooltipText={`Total spending for each month in ${selectedYear}.`}/>
          {loading ? <Spinner/> : <ReactECharts ref={monthlyChartRef}
                                                option={monthlyChartOption}
                                                theme={theme}
                                                style={{height: '300px'}}
                                                notMerge={true}/>}
        </div>
      </Card>
      <Card>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
            <tr>
              <th className="p-2 text-left text-gray-500 font-medium w-24"></th>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                <th key={m} className="p-2 font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">{m}</th>))}
            </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
            <tr>
              <td className="p-2 text-left font-medium text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">vs
                                                         Prev <Tooltip content="Compares spending to the previous month."><InformationCircleIcon
                    className="h-4 w-4 text-gray-400"/></Tooltip></div>
              </td>
              {monthlySpending.map((month, i) => (
                <td key={i} className="p-2"><TrendIndicator current={month.total} previous={month.prevMonthTotal}/>
                </td>))}
            </tr>
            <tr>
              <td className="p-2 text-left font-medium text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">vs
                                                         Year <Tooltip content="Compares spending to the same month in the previous year."><InformationCircleIcon
                    className="h-4 w-4 text-gray-400"/></Tooltip></div>
              </td>
              {monthlySpending.map((month, i) => (
                <td key={i} className="p-2"><TrendIndicator current={month.total} previous={month.prevYearMonthTotal}/>
                </td>))}
            </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <CardHeader title="Spending by Store"
                        tooltipText={`Breakdown of total spending per store for ${selectedYear}.`}/>
            {loading ? <Spinner/> : <ReactECharts ref={storeChartRef}
                                                  option={storeChartOption}
                                                  theme={theme}
                                                  style={{height: '300px'}}
                                                  notMerge={true}/>}
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <CardHeader title="Receipt Averages"
                        tooltipText={`Average values calculated from all receipts in ${selectedYear}.`}/>
            <div className="space-y-6 mt-2">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <CurrencyEuroIcon className="h-6 w-6"/></div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Avg. Receipt Total</span></div>
                <span className="text-xl font-bold">€{averages.avgPerReceipt.toFixed(2)}</span></div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                    <ShoppingBagIcon className="h-6 w-6"/></div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Avg. Items / Receipt</span></div>
                <span className="text-xl font-bold">{averages.avgItemsPerReceipt.toFixed(1)}</span></div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                    <CalculatorIcon className="h-6 w-6"/></div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Avg. Price / Item</span></div>
                <span className="text-xl font-bold">€{averages.avgPricePerItem.toFixed(2)}</span></div>
            </div>
          </div>
        </Card>
        <div className="col-span-1 lg:col-span-2 border-t border-gray-200 dark:border-gray-800 pt-6">
          {hasItemlessReceipts && (
            <div className="mb-6">
              <InfoCard
                variant="warning"
                title="Data Accuracy"
                message="The following analytics may not be entirely accurate as there are one or more item-less receipts."
              />
            </div>
          )}
          <TopProducts/>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
