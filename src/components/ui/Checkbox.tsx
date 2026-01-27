import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Check } from 'lucide-react';
import { nanoid } from 'nanoid';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, label, error, ...props }, ref) => {
  const id = React.useMemo(() => props.id || `checkbox-${nanoid(9)}`, [props.id]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="relative flex items-center justify-center shrink-0 cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className="sr-only peer"
            {...props}
          />
          
          {/* Visual Box */}
          <div className={cn(
            "h-[20px] w-[20px] rounded border-2 border-border bg-field transition-all",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-hover:border-accent",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            error && "border-danger",
            className
          )} />
          
          {/* Checkmark - Must be sibling of input for peer-checked to work */}
          <Check 
            className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            strokeWidth={4.5}
          />
        </label>

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
