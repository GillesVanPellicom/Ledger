import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from '../../utils/cn';
import { CalendarIcon } from '@heroicons/react/24/outline';

const DatePicker = ({ className, label, error, ...props }) => {
  return (
    <div className="w-full relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <ReactDatePicker
          className={cn(
            "flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 pl-10 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            error && "border-danger focus:ring-danger",
            className
          )}
          dateFormat="dd/MM/yyyy"
          popperClassName="z-[9999]"
          portalId="root-portal"
          {...props}
        />
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
};

export default DatePicker;
