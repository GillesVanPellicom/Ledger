import React from 'react';
import { cn } from '../../utils/cn';

interface StepperInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

const StepperInput = React.forwardRef<HTMLInputElement, StepperInputProps>(
  ({ className, label, error, onIncrement, onDecrement, ...props }, ref) => {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center shadow-sm rounded-lg">
          <button
            type="button"
            onClick={onDecrement}
            className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 rounded-l-lg text-sm px-3 focus:outline-none h-10 transition-colors"
          >
            <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"/></svg>
          </button>
          <input
            ref={ref}
            type="number"
            className="border-x-0 h-10 text-center w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 py-2.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-700"
            placeholder="0"
            {...props}
          />
          <button
            type="button"
            onClick={onIncrement}
            className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 rounded-r-lg text-sm px-3 focus:outline-none h-10 transition-colors"
          >
            <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7V5"/></svg>
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

StepperInput.displayName = 'StepperInput';

export default StepperInput;
