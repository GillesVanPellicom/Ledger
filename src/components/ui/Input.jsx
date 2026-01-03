import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(({ className, error, label, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          error && "border-danger focus:ring-danger",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
