import React, { useState, useEffect, useMemo, useRef, ReactNode, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, FileSearch, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import Input from './Input';
import Select from './Select';
import Tooltip from './Tooltip';
import Spinner from './Spinner';
import Checkbox from './Checkbox';

interface Column {
  header: string;
  accessor?: string;
  render?: (row: any) => ReactNode;
  className?: string;
  width?: string;
}

interface DataTableProps {
  data?: any[];
  columns?: Column[];
  totalCount?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (term: string) => void;
  onRowClick?: (row: any, event: React.MouseEvent) => void;
  loading?: boolean;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyStateText?: string;
  emptyStateIcon?: ReactNode;
  children?: ReactNode;
  selectable?: boolean;
  onSelectionChange?: (selected: any[]) => void;
  selectedIds?: any[];
  itemKey?: string | ((row: any) => string | number);
  minWidth?: string;
  disabled?: boolean;
  topRowLeft?: ReactNode;
  topRowRight?: ReactNode;
  middleRowLeft?: ReactNode;
  middleRowRight?: ReactNode;
  actions?: ReactNode;
  showMonthSeparators?: boolean;
  dateAccessor?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  data = [],
  columns = [],
  totalCount = 0,
  pageSize = 10,
  onPageSizeChange,
  currentPage = 1,
  onPageChange,
  onSearch,
  onRowClick,
  loading = false,
  className,
  searchable = false,
  searchPlaceholder = "Search...",
  emptyStateText = "No results found.",
  emptyStateIcon,
  children,
  selectable = false,
  onSelectionChange,
  selectedIds,
  itemKey = "id",
  minWidth = "600px",
  disabled = false,
  topRowLeft,
  topRowRight,
  middleRowLeft,
  middleRowRight,
  actions,
  showMonthSeparators = false,
  dateAccessor = "date",
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [prevTotalCount, setPrevTotalCount] = useState(totalCount);
  const [previousData, setPreviousData] = useState<any[]>([]);

  // Helper to get key for a row
  const getRowKey = (row: any) => {
    if (typeof itemKey === 'function') {
      return itemKey(row);
    }
    return row[itemKey];
  };

  // Only update totalPages/totalPagesDigits when totalCount genuinely changes
  useEffect(() => {
    if (totalCount !== prevTotalCount) {
      setPrevTotalCount(totalCount);
    }
  }, [totalCount, prevTotalCount]);

  // Update previousData when data is not loading
  useEffect(() => {
    if (!loading) {
      if (data.length > 0) {
        setPreviousData(data);
      } else {
        setPreviousData([]); // Clear previous data if current data is empty
      }
    }
  }, [data, loading]);

  const totalPages = useMemo(() => Math.ceil(prevTotalCount / pageSize) || 1, [prevTotalCount, pageSize]);
  const totalPagesDigits = useMemo(() => (totalPages || 1).toString().length, [totalPages]);
  
  // Calculate width to accommodate at least xxxx/yyyy (4 digits each side)
  const paginationDisplayWidth = useMemo(() => {
    const maxDigits = Math.max(4, totalPagesDigits);
    return `${(maxDigits * 2 * 0.6) + 2}rem`;
  }, [totalPagesDigits]);

  const inputRef = useRef<HTMLInputElement>(null);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const hasMeasuredRef = useRef(false);
  const [colWidths, setColWidths] = useState<number[]>([]);

  useLayoutEffect(() => {
    if (data.length > 0 && !loading && !hasMeasuredRef.current && tableContainerRef.current) {
      const table = tableContainerRef.current.querySelector('table');
      if (!table) return;

      table.style.tableLayout = 'auto';
      table.style.width = 'auto';

      const headerCells = table.querySelectorAll('thead th');
      if (headerCells.length === 0) return;

      const widths = Array.from(headerCells).map(cell => cell.getBoundingClientRect().width);
      const totalTableWidth = widths.reduce((sum, w) => sum + w, 0);
      const containerWidth = tableContainerRef.current.offsetWidth;

      if (totalTableWidth < containerWidth) {
        table.style.width = '100%';
        const scaledWidths = Array.from(headerCells).map(cell => cell.getBoundingClientRect().width);
        setColWidths(scaledWidths);
      } else {
        setColWidths(widths);
      }

      hasMeasuredRef.current = true;
    }
  }, [data, loading]);

  useEffect(() => {
    hasMeasuredRef.current = false;
    setColWidths([]);
  }, [searchTerm, pageSize, columns]);

  useEffect(() => {
    if (selectable) {
      setSelectedRows(new Set(selectedIds || []));
    }
  }, [selectable, selectedIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if ((e.target as HTMLElement).tagName.toLowerCase() === 'input' || (e.target as HTMLElement).tagName.toLowerCase() === 'textarea') {
        return;
      }
      if (e.key === 'ArrowLeft' && currentPage > 1 && onPageChange) {
        onPageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages && onPageChange) {
        onPageChange(currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onPageChange, disabled]);

  useEffect(() => {
    if (currentPage !== undefined) {
      setPageInput(String(currentPage));
    }
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handlePageJump = () => {
    if (disabled) return;
    let newPage = parseInt(pageInput, 10);
    if (!isNaN(newPage) && onPageChange) {
      newPage = Math.max(1, Math.min(newPage, totalPages || 1));
      onPageChange(newPage);
    } else if (pageInput === '') {
    } else {
        setPageInput(String(currentPage));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePageJump();
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newSelectedRows = new Set(selectedRows);
    const currentIds = data.map(row => getRowKey(row));

    if (e.target.checked) {
      currentIds.forEach(id => newSelectedRows.add(id));
    } else {
      currentIds.forEach(id => newSelectedRows.delete(id));
    }

    setSelectedRows(newSelectedRows);
    if (onSelectionChange) onSelectionChange(Array.from(newSelectedRows));
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: any) => {
    if (disabled) return;
    const newSelectedRows = new Set(selectedRows);
    if (e.target.checked) {
      newSelectedRows.add(id);
    } else {
      newSelectedRows.delete(id);
    }
    setSelectedRows(newSelectedRows);
    if (onSelectionChange) onSelectionChange(Array.from(newSelectedRows));
  };

  const isAllOnPageSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every(row => selectedRows.has(getRowKey(row)));
  }, [data, selectedRows, itemKey]);

  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Skeleton placeholder component for individual cells
  const SkeletonCell = ({ width = 'w-full' }: { width?: string }) => (
    <div className={cn("h-5 bg-field-disabled rounded-md animate-pulse", width)}></div>
  );

  const tableContent = useMemo(() => {
    // If loading, show previousData with skeleton placeholders on new rows
    if (loading && previousData.length > 0) {
      return previousData.map((row, rowIdx) => {
        const key = getRowKey(row) || rowIdx;
        return (
          <tr key={key} className={cn("transition-colors opacity-50 bg-bg-2", { "bg-accent/10": selectedRows.has(key) }, "cursor-pointer hover:bg-field-hover")}>
            {selectable && (
              <td className="px-4 py-3 align-middle">
                <SkeletonCell width="w-5" />
              </td>
            )}
            {columns.map((col, colIdx) => (
              <td key={colIdx} className={cn("px-4 py-3 align-middle", col.className)}>
                <SkeletonCell />
              </td>
            ))}
          </tr>
        );
      });
    }

    // No data at all (not loading and no previous data)
    if (data.length === 0 && previousData.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8 text-center text-font-2 bg-bg-2">
            <div className="flex flex-col items-center gap-2 h-full justify-center" style={{height: '300px'}}>
              {emptyStateIcon || <FileSearch className="h-10 w-10 opacity-50" />}
              <span>{emptyStateText}</span>
            </div>
          </td>
        </tr>
      );
    }

    // Show current data (either newly loaded or during loading with previousData)
    const displayData = data.length > 0 ? data : previousData;
    const rows: React.ReactNode[] = [];

    displayData.forEach((row, rowIdx) => {
      const key = getRowKey(row) || rowIdx;

      if (showMonthSeparators && rowIdx > 0) {
        const currentDateStr = row[dateAccessor];
        const prevDateStr = displayData[rowIdx - 1][dateAccessor];

        if (currentDateStr && prevDateStr) {
          const currentDate = new Date(currentDateStr);
          const prevDate = new Date(prevDateStr);

          const currentMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
          const prevMonthName = prevDate.toLocaleString('default', { month: 'long', year: 'numeric' });

          if (currentMonthName !== prevMonthName) {
            rows.push(
              <tr key={`month-sep-${rowIdx}`} className="bg-field-disabled/30 select-none pointer-events-none h-8">
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-1">
                  <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-widest text-font-2 opacity-70">
                    <div className="flex items-center gap-1.5">
                      <ArrowUp className="h-3 w-3" />
                      {prevMonthName}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {currentMonthName}
                      <ArrowDown className="h-3 w-3" />
                    </div>
                  </div>
                </td>
              </tr>
            );
          }
        }
      }

      rows.push(
        <tr key={key} onClick={(e) => onRowClick && !disabled && onRowClick(row, e)} className={cn("transition-colors bg-bg-2", { "bg-accent/10": selectedRows.has(key) }, onRowClick && !disabled && "cursor-pointer hover:bg-field-hover")}>
          {selectable && (
            <td className="px-4 py-3 align-middle w-12">
              <div className="flex items-center justify-center">
                <Checkbox
                  id={`checkbox-${key}`}
                  checked={selectedRows.has(key)}
                  onChange={(e) => handleSelectRow(e, key)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={disabled}
                />
              </div>
            </td>
          )}
          {columns.map((col, colIdx) => {
            const content = col.render ? col.render(row) : (col.accessor ? row[col.accessor] : null);
            let displayContent = content;
            if (content === null || content === undefined || (typeof content === 'string' && content.trim() === '')) {
              displayContent = <span className="text-font-2">-</span>;
            }
            return (
              <td key={colIdx} className={cn("px-4 py-3 text-font-1 break-words align-middle", col.className)}>
                {displayContent}
              </td>
            );
          })}
        </tr>
      );
    });

    return rows;
  }, [loading, pageSize, data, previousData, selectable, columns, onRowClick, disabled, itemKey, selectedRows, handleSelectRow, emptyStateIcon, emptyStateText, showMonthSeparators, dateAccessor]);

  return (
    <div className={cn("flex flex-col gap-4", className, disabled && "opacity-50 cursor-not-allowed")}>
      {(topRowLeft || topRowRight) && (
        <div className="flex justify-between items-center">
          <div className="flex-1">{topRowLeft}</div>
          <div className="flex-1 flex justify-end">{topRowRight}</div>
        </div>
      )}
      {(middleRowLeft || middleRowRight) && (
        <div className="flex justify-between items-center">
          <div className="flex-1">{middleRowLeft}</div>
          <div className="flex-1 flex justify-end">{middleRowRight}</div>
        </div>
      )}
      <div className="flex justify-between items-center gap-2">
        <div className="flex-1 flex items-center gap-2">
          {searchable && (
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-font-2" />
              <Input placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-field border-border" disabled={disabled} />
            </div>
          )}
          {actions}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center shadow-sm rounded-lg">
              <button
                type="button"
                onClick={() => onPageChange && onPageChange(1)}
                disabled={currentPage === 1 || loading || disabled}
                className="bg-field text-font-2 border border-border hover:bg-field-hover hover:text-font-1 focus:ring-2 focus:ring-accent focus:z-10 font-medium leading-5 rounded-l-lg text-sm px-3 focus:outline-none h-10 disabled:bg-field-disabled disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange && onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading || disabled}
                className="bg-field text-font-2 border border-border hover:bg-field-hover hover:text-font-1 focus:ring-2 focus:ring-accent focus:z-10 font-medium leading-5 text-sm px-3 focus:outline-none h-10 disabled:bg-field-disabled disabled:cursor-not-allowed transition-colors border-l-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <div 
                className="relative h-10 flex items-center justify-center bg-field border-y border-border px-2"
                style={{ minWidth: paginationDisplayWidth }}
              >
                <div className="flex items-center justify-center gap-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={pageInput}
                    onChange={handleInputChange}
                    onBlur={handlePageJump}
                    onKeyDown={handleKeyDown}
                    className="border-0 h-full text-right bg-transparent py-2 text-font-1 placeholder:text-font-2 focus:ring-0 p-0"
                    style={{ width: `${Math.max(1, pageInput.length) * 0.6}rem` }}
                    placeholder="1"
                    required
                    disabled={disabled}
                  />
                  <span className="text-font-2 text-sm">/ {totalPages || 1}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPageChange && onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading || totalCount === 0 || disabled}
                className="bg-field text-font-2 border border-border hover:bg-field-hover hover:text-font-1 focus:ring-2 focus:ring-accent focus:z-10 font-medium leading-5 text-sm px-3 focus:outline-none h-10 disabled:bg-field-disabled disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange && onPageChange(totalPages)}
                disabled={currentPage === totalPages || loading || totalCount === 0 || disabled}
                className="bg-field text-font-2 border border-border hover:bg-field-hover hover:text-font-1 focus:ring-2 focus:ring-accent focus:z-10 font-medium leading-5 rounded-r-lg text-sm px-3 focus:outline-none h-10 disabled:bg-field-disabled disabled:cursor-not-allowed transition-colors border-l-0"
              >
                <ChevronsRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <Tooltip content="Items per page">
            <Select
              value={pageSize}
              onChange={(e) => {
                if (typeof onPageSizeChange === 'function') {
                  onPageSizeChange(Number(e.target.value));
                }
                if (typeof onPageChange === 'function') {
                  onPageChange(1);
                }
              }}
              options={[
                { value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' },
                { value: 20, label: '20' }, { value: 25, label: '25' }, { value: 30, label: '30' },
                { value: 35, label: '35' }, { value: 40, label: '40' }, { value: 45, label: '45' },
                { value: 50, label: '50' }, { value: 75, label: '75' }, { value: 100, label: '100' }
              ]}
              className="h-10 w-20 text-center bg-field border-border"
              disabled={disabled}
            />
          </Tooltip>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="rounded-lg border border-border overflow-hidden bg-field shadow-sm relative"
      >
        <div className={cn("overflow-x-auto", disabled && "pointer-events-none")}>
          <table
            className="text-left text-sm w-full border-collapse"
            style={{
              tableLayout: colWidths.length > 0 ? 'fixed' : 'auto',
              minWidth: colWidths.length > 0 ? undefined : minWidth,
            }}
          >
            <colgroup>
              {colWidths.length > 0 ? (
                colWidths.map((width, idx) => <col key={idx} style={{ width: `${width}px` }} />)
              ) : (
                <>
                  {selectable && <col style={{ width: '48px' }} />}
                  {columns.map((col, idx) => <col key={idx} style={{ width: col.width }} />)}
                </>
              )}
            </colgroup>
            <thead className="bg-bg-modal border-b border-border">
              <tr>
                {selectable && (
                  <th className="px-4 py-3 align-middle w-12">
                    <div className="flex items-center justify-center">
                      <Checkbox id="select-all-checkbox" checked={isAllOnPageSelected} onChange={handleSelectAll} disabled={disabled} />
                    </div>
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th key={idx} className={cn("px-4 py-3 font-medium text-font-2 truncate align-middle", col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg-2">
              {tableContent}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-field/30 z-10">
            <Spinner className="h-8 w-8 text-accent" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2 py-2">
        <div className="text-xs text-font-2">
          {selectable && selectedRows.size > 0 
            ? `${selectedRows.size} selected. `
            : ''}
          Showing {startItem}-{endItem} of {totalCount}
        </div>
        {children}
      </div>
    </div>
  );
};

export default DataTable;
