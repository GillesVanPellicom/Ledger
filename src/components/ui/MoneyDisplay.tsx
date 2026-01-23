import React from 'react';
import { cn } from '../../utils/cn';
import { useSettingsStore } from '../../store/useSettingsStore';

interface MoneyDisplayProps {
  amount: number;
  showSign?: boolean;
  colorPositive?: boolean;
  colorNegative?: boolean;
  colorNeutral?: boolean;
  className?: string;
  currency?: string;
  colored?: boolean;
  useSignum?: boolean;
}

/**
 * Global component for displaying monetary values with consistent formatting and coloring.
 */
const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  showSign = true,
  colorPositive = true,
  colorNegative = true,
  colorNeutral = false,
  className,
  currency = '€',
  colored = true,
  useSignum = false
}) => {
  const { settings } = useSettingsStore();
  const decimalSeparator = settings.formatting?.decimalSeparator || 'dot';

  const isPositive = amount > 0;
  const isNegative = amount < 0;
  
  let absAmount = Math.abs(amount).toFixed(2);
  if (decimalSeparator === 'comma') {
    absAmount = absAmount.replace('.', ',');
  }

  const sign = isPositive ? '+' : isNegative ? '-' : '';
  const displaySign = (showSign || (useSignum && (isPositive || isNegative))) ? sign : '';

  const colorClass = (colored || useSignum) ? cn(
    colorNeutral && "text-yellow",
    !colorNeutral && isPositive && colorPositive && "text-green",
    !colorNeutral && isNegative && colorNegative && "text-red"
  ) : "";

  return (
    <span className={cn("font-medium tabular-nums", colorClass, className)}>
      {displaySign}{currency}{absAmount}
    </span>
  );
};

export default MoneyDisplay;
