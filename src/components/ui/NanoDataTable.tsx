import React from 'react';
import { cn } from '../../utils/cn';
import { FileSearch } from 'lucide-react';

interface NanoDataTableProps {
  headers: { label: string; className?: string }[];
  rows: React.ReactNode[][];
  className?: string;
  emptyStateIcon?: React.ReactNode;
  emptyStateText?: string;
}

const NanoDataTable: React.FC<NanoDataTableProps> = ({ 
  headers, 
  rows, 
  className,
  emptyStateIcon = <FileSearch className="h-10 w-10 opacity-50" />,
  emptyStateText = "No results found."
}) => {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className={cn("p-2", header.className)}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="p-4 py-8 text-center text-gray-500">
                <div className="flex flex-col items-center gap-2 justify-center">
                  {emptyStateIcon}
                  <span>{emptyStateText}</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="p-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default NanoDataTable;