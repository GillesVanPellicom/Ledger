import React, { useRef, useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import { useSettingsStore } from '../../store/useSettingsStore';

interface StepperInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
  inputClassName?: string;
  min?: number;
  max?: number;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const StepperInput = React.forwardRef<HTMLInputElement, StepperInputProps>(
  (
    {
      className,
      label,
      error,
      onIncrement,
      onDecrement,
      inputClassName,
      min,
      max,
      value,
      onChange,
      size = 'md',
      ...props
    },
    ref
  ) => {
    const { settings } = useSettingsStore();
    const decimalSeparator = settings.formatting?.decimalSeparator || 'dot';

    const internalRef = useRef<HTMLInputElement>(null);
    const combinedRef =
      (ref as React.MutableRefObject<HTMLInputElement>) || internalRef;

    // Internal string state to preserve partial input
    const [inputValue, setInputValue] = useState<string>(String(value));

    // Sync with external value if it changes (e.g., parent resets)
    useEffect(() => {
      setInputValue(String(value));
    }, [value]);

    // Parse numeric value for stepper buttons
    const numericValue =
      typeof value === 'string'
        ? parseFloat(value.replace(',', '.'))
        : Number(value);

    const buttonBaseClasses =
      'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 focus:z-10 flex items-center justify-center p-0';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;

      // Accept digits + at most one dot/comma
      if (!/^[0-9]*[.,]?[0-9]*$/.test(raw)) return;

      setInputValue(raw);
    };

    const handleBlur = () => {
      // Normalize input to dot internally
      let normalized = inputValue.replace(',', '.');

      // Optional: enforce min/max
      let num = parseFloat(normalized);
      if (!isNaN(num)) {
        if (min !== undefined) num = Math.max(num, min);
        if (max !== undefined) num = Math.min(num, max);
        normalized = String(num);
      }

      setInputValue(
        decimalSeparator === 'comma' ? normalized.replace('.', ',') : normalized
      );

      // Trigger parent's onChange with normalized value (dot)
      const syntheticEvent = {
        target: { value: normalized },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    };

    // Display value mapping for comma/dot
    const displayValue =
      decimalSeparator === 'comma'
        ? inputValue.replace(/\./g, ',')
        : inputValue;

    // Disable scroll wheel changing value
    useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        if (document.activeElement === combinedRef.current) {
          e.preventDefault();
        }
      };

      const el = combinedRef.current;
      if (el) {
        el.addEventListener('wheel', handleWheel, { passive: false });
      }
      return () => {
        if (el) {
          el.removeEventListener('wheel', handleWheel);
        }
      };
    }, [combinedRef]);

    const sizeClasses = {
      sm: 'h-8 text-xs',
      md: 'h-10 text-sm',
      lg: 'h-12 text-base',
      xl: 'h-16 text-xl font-bold',
    };

    const iconSizes = {
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
    };

    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}

        <div className={cn('flex items-stretch', sizeClasses[size])}>
          <Input
            ref={combinedRef}
            type="text"
            inputMode="decimal"
            className={cn('rounded-r-none relative h-full', inputClassName)}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props}
          />

          <div className="flex flex-col h-full aspect-square shrink-0 w-auto">
            <Button
              type="button"
              aria-label="Increase value"
              className={cn(
                buttonBaseClasses,
                'w-full h-1/2 rounded-l-none rounded-br-none border border-gray-300 dark:border-gray-700 border-l-0 border-b-[0.5px]'
              )}
              onClick={() => {
                let num = isNaN(numericValue) ? 0 : numericValue;
                let next = max !== undefined ? Math.min(num + 1, max) : num + 1;
                onChange({
                  target: { value: String(next) },
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              disabled={(max !== undefined && numericValue >= max) || props.disabled}
            >
              <ChevronUp size={iconSizes[size]} className="shrink-0" />
            </Button>

            <Button
              type="button"
              aria-label="Decrease value"
              className={cn(
                buttonBaseClasses,
                'w-full h-1/2 rounded-l-none rounded-tr-none border border-gray-300 dark:border-gray-700 border-l-0 border-t-[0.5px]'
              )}
              onClick={() => {
                let num = isNaN(numericValue) ? 0 : numericValue;
                let next = min !== undefined ? Math.max(num - 1, min) : num - 1;
                onChange({
                  target: { value: String(next) },
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              disabled={(min !== undefined && numericValue <= min) || props.disabled}
            >
              <ChevronDown size={iconSizes[size]} className="shrink-0" />
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