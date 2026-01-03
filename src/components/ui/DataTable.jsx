import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import Input from './Input';
import Button from './Button';

const DataTable = ({
  data = [],
  columns = [],
  totalCount = 0,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onSearch,
  onRowClick,
  loading = false,
  className,
  searchPlaceholder = "Search..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const totalPages = Math.ceil(totalCount / pageSize);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const PaginationControls = () => (
    <div className="flex items-center justify-between px-2 py-2">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalCount)}</span> to{' '}
        <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
        <span className="font-medium">{totalCount}</span> results
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrev}
          disabled={currentPage === 1 || loading}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages || loading}
          className="h-8 w-8 p-0"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Top Pagination (Optional, but requested in plan) */}
        <div className="hidden sm:block">
           <PaginationControls />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={cn(
                      "px-4 py-3 font-medium text-gray-500 dark:text-gray-400",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    No results found.
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        {col.render ? col.render(row) : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Pagination */}
      <PaginationControls />
    </div>
  );
};

export default DataTable;
