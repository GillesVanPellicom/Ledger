import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, label, error, ...props }, ref) => {
  const id = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="checkbox-wrapper-13 flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className={cn(
            error && "border-danger",
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
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
