import React, { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options?: Option[];
  placeholder?: string;
  variant?: 'default' | 'add';
  onAdd?: () => void;
  addTooltip?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ 
  className, 
  error, 
  label, 
  options = [], 
  placeholder, 
  variant = 'default',
  onAdd,
  addTooltip = "Add new",
  ...props 
}, ref) => {
  const value = props.value === null ? '' : props.value;

  const selectElement = (
    <div className="relative flex-1">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none border border-border bg-field px-3 py-2 pr-8 text-sm text-font-1 placeholder:text-font-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:bg-field-disabled hover:bg-field-hover transition-all",
          variant === 'default' ? "rounded-lg" : "rounded-l-lg border-r-0",
          error && "border-danger focus:ring-danger",
          className
        )}
        {...props}
        value={value}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-font-2 pointer-events-none" />
    </div>
  );

  return (
    <div className="w-full relative">
      {label && (
        <label className="block text-sm font-medium text-font-1 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-stretch">
        {selectElement}
        {variant === 'add' && (
          <button
            type="button"
            onClick={onAdd}
            title={addTooltip}
            className="flex items-center justify-center w-10 h-10 border border-border border-l bg-field hover:bg-field-hover text-font-2 hover:text-font-1 rounded-r-lg transition-all shrink-0"
          >
            <LucideIcons.Plus className="h-5 w-5" />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

// Import LucideIcons inside the component to avoid circular dependency or missing imports
import * as LucideIcons from 'lucide-react';

Select.displayName = "Select";

export default Select;
