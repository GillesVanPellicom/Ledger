import React from 'react';
import { cn } from '../../utils/cn';

interface NanoDataTableProps {
  headers: { label: string; className?: string }[];
  rows: React.ReactNode[];
  className?: string;
}

const NanoDataTable: React.FC<NanoDataTableProps> = ({ headers, rows, className }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 px-2">
        {headers.map((header, index) => (
          <div key={index} className={cn('col-span-1', header.className)}>
            {header.label}
          </div>
        ))}
      </div>

      {/* Data Rows */}
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-12 gap-4 items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
          {row}
        </div>
      ))}
    </div>
  );
};

export default NanoDataTable;
