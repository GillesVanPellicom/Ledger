import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import Tooltip from './Tooltip';
import Spinner from './Spinner';

const DataTable = ({
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
  searchPlaceholder = "Search...",
  children,
  selectable = false,
  onSelectionChange,
  selectedIds, // Removed default value to prevent infinite loop
  itemKey = "id"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageInput, setPageInput] = useState(currentPage);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const totalPages = Math.ceil(totalCount / pageSize);
  const inputRef = useRef(null);

  // Sync internal state with prop changes, ONLY if selectable is true and selectedIds is provided
  useEffect(() => {
    if (selectable && selectedIds) {
      setSelectedRows(new Set(selectedIds));
    }
  }, [selectable, selectedIds]);

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
        return;
      }
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        onPageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onPageChange]);

  useEffect(() => {
    setPageInput(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handlePageJump = () => {
    let newPage = parseInt(pageInput, 10);
    if (!isNaN(newPage)) {
      newPage = Math.max(1, Math.min(newPage, totalPages || 1));
      onPageChange(newPage);
    } else if (pageInput === '') {
        // Do nothing if empty, let user type
    } else {
        // Reset to current page if invalid
        setPageInput(currentPage);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePageJump();
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // Allow only numbers
    if (value === '' || /^[0-9]+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handleSelectAll = (e) => {
    const newSelectedRows = new Set();
    if (e.target.checked) {
      data.forEach(row => newSelectedRows.add(row[itemKey]));
    }
    // Optimistic update
    setSelectedRows(newSelectedRows);
    if (onSelectionChange) onSelectionChange(Array.from(newSelectedRows));
  };

  const handleSelectRow = (e, id) => {
    const newSelectedRows = new Set(selectedRows);
    if (e.target.checked) {
      newSelectedRows.add(id);
    } else {
      newSelectedRows.delete(id);
    }
    // Optimistic update
    setSelectedRows(newSelectedRows);
    if (onSelectionChange) onSelectionChange(Array.from(newSelectedRows));
  };

  const isAllSelected = useMemo(() => data.length > 0 && data.every(row => selectedRows.has(row[itemKey])), [data, selectedRows, itemKey]);

  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  
  // Calculate dynamic width based on total pages digits + extra space for " / "
  const totalPagesDigits = (totalPages || 1).toString().length;
  // Base width (approx 2rem) + digits width (approx 0.6rem per digit) + padding
  const inputWidth = `${1.5 + (totalPagesDigits * 0.6)}rem`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-96">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          {children}
        </div>
        <Tooltip content="Items per page" align="end">
          <Select 
            value={pageSize} 
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }} 
            options={[
              { value: 5, label: '5' }, 
              { value: 10, label: '10' }, 
              { value: 15, label: '15' }, 
              { value: 20, label: '20' }, 
              { value: 25, label: '25' }, 
              { value: 30, label: '30' }, 
              { value: 35, label: '35' }, 
              { value: 40, label: '40' }, 
              { value: 45, label: '45' }, 
              { value: 50, label: '50' },
              { value: 75, label: '75' },
              { value: 100, label: '100' }
            ]} 
            className="h-9 w-20 text-center" 
          />
        </Tooltip>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm relative">
        <div className={cn("overflow-x-auto", loading && "blur-sm pointer-events-none")}>
          <table className="w-full text-left text-sm table-fixed">
            <colgroup>
              {selectable && <col style={{ width: '40px' }} />}
              {columns.map((col, idx) => <col key={idx} style={{ width: col.width }} />)}
            </colgroup>
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                {selectable && (
                  <th className="px-4 py-3 align-middle">
                    <div className="checkbox-wrapper-13 flex items-center justify-center">
                      <input id="select-all-checkbox" type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />
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
                <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">No results found.</td></tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr key={row[itemKey] || rowIdx} onClick={() => onRowClick && onRowClick(row)} className={cn("transition-colors", { "bg-blue-50 dark:bg-blue-900/20": selectedRows.has(row[itemKey]) }, onRowClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50")}>
                    {selectable && (
                      <td className="px-4 py-3 align-middle">
                        <div className="checkbox-wrapper-13 flex items-center justify-center">
                          <input 
                            id={`checkbox-${row[itemKey]}`} 
                            type="checkbox" 
                            checked={selectedRows.has(row[itemKey])} 
                            onChange={(e) => handleSelectRow(e, row[itemKey])} 
                            onClick={(e) => e.stopPropagation()} 
                          />
                          <label htmlFor={`checkbox-${row[itemKey]}`}></label>
                        </div>
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={cn("px-4 py-3 text-gray-900 dark:text-gray-100 break-words", col.className)}>
                        {col.render ? col.render(row) : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-gray-900/30">
            <Spinner className="h-6 w-6 text-accent" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2 py-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Showing {startItem}-{endItem} of {totalCount}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center shadow-sm rounded-lg">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 rounded-l-lg text-sm px-3 focus:outline-none h-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"/></svg>
            </button>
            <div className="relative h-10 flex items-center bg-white dark:bg-gray-900 border-y border-gray-300 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                value={pageInput}
                onChange={handleInputChange}
                onBlur={handlePageJump}
                onKeyDown={handleKeyDown}
                className="border-0 h-full text-center bg-transparent py-2.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0 px-1"
                style={{ width: inputWidth, minWidth: '2rem' }}
                placeholder="1"
                required
              />
              <div className="flex items-center pr-3 pointer-events-none whitespace-nowrap">
                <span className="text-gray-500 text-sm">/ {totalPages || 1}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 rounded-r-lg text-sm px-3 focus:outline-none h-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7V5"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
