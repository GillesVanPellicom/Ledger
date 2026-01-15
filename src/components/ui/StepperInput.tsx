import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Button from './Button';
import Input from './Input';

interface StepperInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
  inputClassName?: string;
  min?: number;
  max?: number;
}

const StepperInput = React.forwardRef<HTMLInputElement, StepperInputProps>(
  ({ className, label, error, onIncrement, onDecrement, inputClassName, min, max, value, ...props }, ref) => {
    const numericValue = Number(value);
    const buttonBaseClasses = "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 focus:z-10";

    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="flex items-center">
          <Input
            ref={ref}
            type="number"
            className={cn(
              "rounded-r-none relative [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              inputClassName
            )}
            value={value}
            {...props}
          />
          <div className="flex flex-col">
            <Button
              type="button"
              aria-label="Increase value"
              className={cn(buttonBaseClasses, "px-2 h-5 rounded-l-none rounded-br-none border border-gray-300 dark:border-gray-700 border-l-0 border-b-[0.5px]")}
              onClick={onIncrement}
              disabled={(max !== undefined && numericValue >= max) || props.disabled}
            >
              <ChevronUp size={15} />
            </Button>
            <Button
              type="button"
              aria-label="Decrease value"
              className={cn(buttonBaseClasses, "px-2 h-5 rounded-l-none rounded-tr-none border border-gray-300 dark:border-gray-700 border-l-0 border-t-[0.5px]")}
              onClick={onDecrement}
              disabled={(min !== undefined && numericValue <= min) || props.disabled}
            >
              <ChevronDown size={15} />
            </Button>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

StepperInput.displayName = 'StepperInput';

export default StepperInput;