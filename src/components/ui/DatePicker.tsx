import React from 'react';
import ReactDatePicker from 'react-datepicker';
import type { ReactDatePickerProps as BaseDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from '../../utils/cn';
import { Calendar } from 'lucide-react';

// BaseDatePickerProps comes from react-datepicker and already includes props
// like className, selected, startDate, endDate, selectsRange, etc.
export interface DatePickerProps extends BaseDatePickerProps {
  label?: string;
  error?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ className, label, error, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-font-1 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <ReactDatePicker
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-field px-3 py-2 pl-10 text-sm text-font-1 placeholder:text-font-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            error && "border-danger focus:ring-danger",
            className
          )}
          dateFormat="dd/MM/yyyy"
          popperClassName="z-[9999]"
          portalId="modal-root"
          {...props}
        />
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-font-2 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
};

export default DatePicker;
