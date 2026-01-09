import React, { useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, DocumentMagnifyingGlassIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import Tooltip from './Tooltip';
import Spinner from './Spinner';

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
  children?: ReactNode;
  selectable?: boolean;
  onSelectionChange?: (selected: any[]) => void;
  selectedIds?: any[];
  itemKey?: string;
  minWidth?: string;
  disabled?: boolean;
  topRowLeft?: ReactNode;
  topRowRight?: ReactNode;
  middleRowLeft?: ReactNode;
  middleRowRight?: ReactNode;
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
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [selectedRows, setSelectedRows] = useState(new Set());
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const inputRef = useRef<HTMLInputElement>(null);

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
    setPageInput(String(currentPage));
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
    const currentIds = data.map(row => row[itemKey]);
    
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
    return data.every(row => selectedRows.has(row[itemKey]));
  }, [data, selectedRows, itemKey]);

  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  
  const totalPagesDigits = (totalPages || 1).toString().length;
  const inputWidth = `${1.5 + (totalPagesDigits * 0.6)}rem`;

  return (
    <div className={cn("flex flex-col gap-4 bg-card text-card-foreground rounded-lg", className, disabled && "opacity-50 cursor-not-allowed")}>
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
      <div className="flex justify-between items-center">
        <div className="flex-1">
          {searchable && (
            <div className="relative w-90">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" disabled={disabled} />
            </div>
          )}
        </div>
        <div className="flex-1 flex justify-end items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center shadow-sm rounded-lg">
              <button
                type="button"
                onClick={() => onPageChange && onPageChange(1)}
                disabled={currentPage === 1 || loading || disabled}
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 rounded-l-lg text-sm px-3 focus:outline-none h-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronDoubleLeftIcon className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange && onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading || disabled}
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 text-sm px-3 focus:outline-none h-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l-0"
              >
                <ChevronLeftIcon className="h-3 w-3" />
              </button>
              <div className="relative h-10 flex items-center bg-white dark:bg-gray-900 border-y border-gray-300 dark:border-gray-700">
                <input
                  ref={inputRef}
                  type="text"
                  value={pageInput}
                  onChange={handleInputChange}
                  onBlur={handlePageJump}
                  onKeyDown={handleKeyDown}
                  className="border-0 h-full text-center bg-transparent py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0 px-1"
                  style={{ width: inputWidth, minWidth: '2rem' }}
                  placeholder="1"
                  required
                  disabled={disabled}
                />
                <div className="flex items-center pr-3 pointer-events-none whitespace-nowrap">
                  <span className="text-gray-500 text-sm">/ {totalPages || 1}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPageChange && onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading || totalCount === 0 || disabled}
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 text-sm px-3 focus:outline-none h-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l-0"
              >
                <ChevronRightIcon className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange && onPageChange(totalPages)}
                disabled={currentPage === totalPages || loading || totalCount === 0 || disabled}
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 rounded-r-lg text-sm px-3 focus:outline-none h-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l-0"
              >
                <ChevronDoubleRightIcon className="h-3 w-3" />
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
              className="h-10 w-20 text-center"
              disabled={disabled}
            />
          </Tooltip>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm relative">
        <div className={cn("overflow-x-auto", (loading || disabled) && "blur-sm pointer-events-none")}>
          <table className="w-full text-left text-sm" style={{ minWidth }}>
            <colgroup>
              {selectable && <col style={{ width: '40px' }} />}
              {columns.map((col, idx) => <col key={idx} style={{ width: col.width }} />)}
            </colgroup>
            <thead className="bg-receipt-detail-total border-b border-gray-200 dark:border-gray-800">
              <tr>
                {selectable && (
                  <th className="px-4 py-3 align-middle">
                    <div className="checkbox-wrapper-13 flex items-center justify-center">
                      <input id="select-all-checkbox" type="checkbox" checked={isAllOnPageSelected} onChange={handleSelectAll} disabled={disabled} />
                      <label htmlFor="select-all-checkbox"></label>
                    </div>
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th key={idx} className={cn("px-4 py-3 font-medium text-gray-500 dark:text-gray-400 truncate", col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <DocumentMagnifyingGlassIcon className="h-10 w-10 opacity-50" />
                      <span>No results found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr key={row[itemKey] || rowIdx} onClick={(e) => onRowClick && !disabled && onRowClick(row, e)} className={cn("transition-colors", { "bg-blue-50 dark:bg-blue-900/20": selectedRows.has(row[itemKey]) }, onRowClick && !disabled && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50")}>
                    {selectable && (
                      <td className="px-4 py-3 align-middle">
                        <div className="checkbox-wrapper-13 flex items-center justify-center">
                          <input 
                            id={`checkbox-${row[itemKey]}`} 
                            type="checkbox" 
                            checked={selectedRows.has(row[itemKey])} 
                            onChange={(e) => handleSelectRow(e, row[itemKey])} 
                            onClick={(e) => e.stopPropagation()} 
                            disabled={disabled}
                          />
                          <label htmlFor={`checkbox-${row[itemKey]}`}></label>
                        </div>
                      </td>
                    )}
                    {columns.map((col, colIdx) => {
                      const content = col.render ? col.render(row) : (col.accessor ? row[col.accessor] : null);
                      let displayContent = content;
                      if (content === null || content === undefined || (typeof content === 'string' && content.trim() === '')) {
                        displayContent = <span className="text-gray-300 dark:text-gray-600">-</span>;
                      }
                      return (
                        <td key={colIdx} className={cn("px-4 py-3 text-gray-900 dark:text-gray-100 break-words", col.className)}>
                          {displayContent}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-gray-900/30 z-10">
            <Spinner className="h-8 w-8 text-accent" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2 py-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
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
