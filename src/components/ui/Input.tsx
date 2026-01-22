import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, label, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-font-1 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-field px-3 py-2 text-sm text-font-1 placeholder:text-font-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:bg-field-disabled transition-all",
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
