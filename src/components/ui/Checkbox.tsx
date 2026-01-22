import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Check } from 'lucide-react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, label, error, ...props }, ref) => {
  const id = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              "peer h-6 w-6 cursor-pointer appearance-none rounded border border-border bg-field transition-all checked:border-accent checked:bg-accent hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50", // Changed h-5 w-5 to h-6 w-6
              error && "border-danger",
              className
            )}
            {...props}
          />
          <Check 
            className="pointer-events-none absolute h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100" // Changed h-3.5 w-3.5 to h-4 w-4
            strokeWidth={3}
          />
        </div>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-font-1 cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

export default Checkbox;
