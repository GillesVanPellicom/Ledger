import React, { useRef, useState, useEffect, useImperativeHandle, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Input from './Input';
import { useSettingsStore } from '../../store/useSettingsStore';

interface StepperInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
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
  precision?: number;
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
      precision = 2,
      ...props
    },
    ref
  ) => {
    const { settings } = useSettingsStore();
    const decimalSeparator = settings.formatting?.decimalSeparator || 'dot';

    const internalRef = useRef<HTMLInputElement>(null);
    const onChangeRef = useRef(onChange);
    
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const [inputValue, setInputValue] = useState<string>('');

    const formatValue = useCallback((val: string | number) => {
      const num = typeof val === 'string' ? Number.parseFloat(val.replace(',', '.')) : Number(val);
      if (Number.isNaN(num)) return '';
      
      let clamped = num;
      if (min !== undefined) clamped = Math.max(clamped, min);
      if (max !== undefined) clamped = Math.min(clamped, max);
      
      const formatted = clamped.toFixed(precision);
      return decimalSeparator === 'comma' ? formatted.replace('.', ',') : formatted;
    }, [precision, min, max, decimalSeparator]);

    // Sync with external value
    useEffect(() => {
      const formatted = formatValue(value);
      setInputValue(formatted);
      
      const normalizedFormatted = formatted.replace(',', '.');
      const normalizedValue = String(value).replace(',', '.');
      
      if (normalizedFormatted !== normalizedValue && normalizedFormatted !== '') {
        onChangeRef.current({
          target: { value: normalizedFormatted },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }, [value, formatValue]);

    const numericValue =
      typeof value === 'string'
        ? Number.parseFloat(value.replace(',', '.'))
        : Number(value);

    const buttonBaseClasses =
      'bg-field hover:bg-field-hover text-font-2 focus:z-10 flex items-center justify-center p-0 disabled:bg-field-disabled';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      if (!/^-?\d*([.,]\d*)?$/.test(raw)) return;
      setInputValue(raw);
    };

    const handleBlur = () => {
      const formatted = formatValue(inputValue);
      setInputValue(formatted);

      const normalized = formatted.replace(',', '.');
      onChangeRef.current({
        target: { value: normalized },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        if (document.activeElement === internalRef.current) {
          e.preventDefault();
        }
      };

      const el = internalRef.current;
      if (el) {
        el.addEventListener('wheel', handleWheel, { passive: false });
      }
      return () => {
        if (el) {
          el.removeEventListener('wheel', handleWheel);
        }
      };
    }, []);

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

    const handleStep = (increment: boolean) => {
      if (increment && onIncrement) {
        onIncrement();
        return;
      }
      if (!increment && onDecrement) {
        onDecrement();
        return;
      }

      let num = Number.isNaN(numericValue) ? 0 : numericValue;
      let step = 1;
      let next = increment ? num + step : num - step;
      
      if (min !== undefined) next = Math.max(next, min);
      if (max !== undefined) next = Math.min(next, max);
      
      const formatted = next.toFixed(precision);
      
      onChangeRef.current({
        target: { value: formatted },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    // Filter out non-DOM attributes before passing to Input
    const { ...domProps } = props;

    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-font-1 mb-1">
            {label}
          </label>
        )}

        <div className={cn('flex items-stretch', sizeClasses[size])}>
          <Input
            ref={internalRef}
            type="text"
            inputMode="decimal"
            className={cn('rounded-r-none relative h-full', inputClassName)}
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            {...domProps}
          />

          <div className="flex flex-col h-full aspect-square shrink-0 w-auto">
            <button
              type="button"
              aria-label="Increase value"
              className={cn(
                buttonBaseClasses,
                'w-full h-1/2 rounded-tr-lg border border-border border-l-0 border-b-0'
              )}
              onClick={() => handleStep(true)}
              disabled={(max !== undefined && numericValue >= max) || props.disabled}
            >
              <ChevronUp size={iconSizes[size]} className="shrink-0" />
            </button>

            <button
              type="button"
              aria-label="Decrease value"
              className={cn(
                buttonBaseClasses,
                'w-full h-1/2 rounded-br-lg border border-border border-l-0 border-t-[1px]'
              )}
              onClick={() => handleStep(false)}
              disabled={(min !== undefined && numericValue <= min) || props.disabled}
            >
              <ChevronDown size={iconSizes[size]} className="shrink-0" />
            </button>
          </div>
        </div>

        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

StepperInput.displayName = 'StepperInput';

export default StepperInput;
