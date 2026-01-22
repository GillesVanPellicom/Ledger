import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { db } from '../../utils/db';
import Card from '../ui/Card';
import Select from '../ui/Select';
import DataTable from '../ui/DataTable';
import Spinner from '../ui/Spinner';
import { FileSearch, Info } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

interface ProductSpending {
  ProductName: string;
  ProductBrand: string;
  ProductSize: string;
  ProductUnitType: string;
  totalQty: number;
  totalSpent: number;
}

const TopProducts: React.FC = () => {
  const chartRef = useRef<ReactECharts>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  
  const [data, setData] = useState<ProductSpending[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const isDarkMode = useMemo(() => document.documentElement.classList.contains('dark'), []);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const chartInstance = chartRef.current?.getEchartsInstance();
    return () => {
      chartInstance?.dispose();
    };
  }, []);

  // Fetch available years
  useEffect(() => {
    const fetchYears = async () => {
      const result = await db.query<{ year: string }>("SELECT DISTINCT STRFTIME('%Y', ReceiptDate) as year FROM Receipts ORDER BY year DESC");
      const years = result.map(r => parseInt(r.year));
      if (years.length > 0) {
        setAvailableYears(years);
        if (!years.includes(selectedYear as number)) setSelectedYear(years[0]);
      } else {
        setAvailableYears([new Date().getFullYear()]);
      }
    };
    fetchYears();
  }, []);

  // Calculate date range based on selectors
  const dateRange = useMemo((): [Date | 'all', Date | 'all'] => {
    let start: Date, end: Date;
    
    if (selectedYear === 'all') {
      return ['all', 'all'];
    }

    const year = selectedYear as number;

    if (selectedMonth === 'all') {
      start = startOfYear(new Date(year, 0, 1));
      end = endOfYear(new Date(year, 0, 1));
    } else {
      const month = parseInt(selectedMonth);
      if (selectedWeek === 'all') {
        start = startOfMonth(new Date(year, month, 1));
        end = endOfMonth(new Date(year, month, 1));
      } else {
        start = new Date(year, month, 1 + (parseInt(selectedWeek) - 1) * 7);
        end = new Date(year, month, 1 + (parseInt(selectedWeek)) * 7 - 1);
        const monthEnd = endOfMonth(new Date(year, month, 1));
        if (end > monthEnd) end = monthEnd;
      }
    }
    return [start, end];
  }, [selectedYear, selectedMonth, selectedWeek]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = `
          SELECT 
            p.ProductName, 
            p.ProductBrand,
            p.ProductSize,
            pu.ProductUnitType,
            SUM(li.LineQuantity) as totalQty,
            SUM(li.LineQuantity * li.LineUnitPrice) as totalSpent
          FROM LineItems li
          JOIN Receipts r ON li.ReceiptID = r.ReceiptID
          JOIN Products p ON li.ProductID = p.ProductID
          LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
        `;
        
        const params: any[] = [];
        
        if (dateRange[0] !== 'all') {
          query += ` WHERE r.ReceiptDate >= ? AND r.ReceiptDate <= ?`;
          params.push(format(dateRange[0] as Date, 'yyyy-MM-dd'), format(dateRange[1] as Date, 'yyyy-MM-dd'));
        }

        query += `
          GROUP BY p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType
          ORDER BY totalSpent DESC
        `;
        
        const result = await db.query<ProductSpending>(query, params);
        
        setData(result);
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to fetch product spending:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const top10 = useMemo(() => data.slice(0, 10), [data]);
  
  const chartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: number | string) => typeof value === 'number' ? `€${value.toFixed(2)}` : value 
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { formatter: '€{value}' } },
    yAxis: { type: 'category', data: top10.map(d => d.ProductName).reverse(), axisLabel: { interval: 0, rotate: 0 } },
    series: [{
      name: 'Total Spent',
      type: 'bar',
      data: top10.map(d => d.totalSpent.toFixed(2)).reverse(),
      label: { show: true, position: 'right', formatter: '€{c}' }
    }]
  }), [top10]);

  const columns = [
    { 
      header: 'Product', 
      width: '70%',
      render: (row: ProductSpending) => (
        <div>
          <p className="font-medium text-font-1">{row.ProductName}{row.ProductSize ? ` - ${row.ProductSize}${row.ProductUnitType || ''}` : ''}</p>
          <p className="text-xs text-font-2">{row.ProductBrand || ''}</p>
        </div>
      )
    },
    { header: 'Qty', accessor: 'totalQty', width: '10%', className: 'text-center' },
    { header: 'Total Spent', width: '20%', className: 'text-right', render: (row: ProductSpending) => `€${row.totalSpent.toFixed(2)}` },
  ];

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

  const monthOptions = [
    { value: 'all', label: 'All Months' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: i.toString(), label: format(new Date(2000, i, 1), 'MMMM') }))
  ];

  const weekOptions = [
    { value: 'all', label: 'All Weeks' },
    { value: '1', label: 'Week 1' },
    { value: '2', label: 'Week 2' },
    { value: '3', label: 'Week 3' },
    { value: '4', label: 'Week 4' },
    { value: '5', label: 'Week 5' },
  ];

  const getDateLabel = () => {
    if (dateRange[0] === 'all') return 'All Time';
    return `${format(dateRange[0] as Date, 'dd/MM/yyyy')} - ${format(dateRange[1] as Date, 'dd/MM/yyyy')}`;
  };

  const CardHeader = ({ title, tooltipText }: { title: string, tooltipText: string }) => (
    <div className="flex items-center gap-2">
      <h2 className="text-lg font-semibold text-font-1">{title}</h2>
      <Tooltip content={tooltipText}><Info className="h-5 w-5 text-font-2" /></Tooltip>
    </div>
  );

  return (
    <Card className="col-span-1 lg:col-span-2">
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardHeader title="Product Spending" tooltipText="Shows the top 10 products by total amount spent in the selected period." />
          <div className="flex flex-wrap gap-2">
            <div className="w-32">
              <Select
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                options={[
                  { value: 'all', label: 'All Years' },
                  ...availableYears.map(y => ({ value: y, label: y.toString() }))
                ]}
              />
            </div>
            <div className="w-40">
              <Select
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setSelectedWeek('all'); }}
                options={monthOptions}
                disabled={selectedYear === 'all'}
              />
            </div>
            <div className="w-32">
              <Select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                options={weekOptions}
                disabled={selectedYear === 'all' || selectedMonth === 'all'}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center w-full"><Spinner /></div>
        ) : data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-font-2 gap-2">
            <FileSearch className="h-12 w-12 opacity-50" />
            <p>No data for this period.</p>
          </div>
        ) : (
          <>
            <div className="h-80">
              <ReactECharts ref={chartRef} option={chartOption} theme={theme} style={{ height: '100%', width: '100%' }} notMerge={true} />
            </div>
            
            <div className="mt-8">
              <DataTable
                data={paginatedData}
                columns={columns}
                totalCount={data.length}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                loading={false}
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default TopProducts;
