import React from 'react';
import { cn } from '../../utils/cn';

interface NanoDataTableProps {
  headers: { label: string; className?: string }[];
  rows: React.ReactNode[][];
  className?: string;
}

const NanoDataTable: React.FC<NanoDataTableProps> = ({ headers, rows, className }) => {
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
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NanoDataTable;
