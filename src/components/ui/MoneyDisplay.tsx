import React from 'react';
import { cn } from '../../utils/cn';

interface MoneyDisplayProps {
  amount: number;
  showSign?: boolean;
  colorPositive?: boolean;
  colorNegative?: boolean;
  className?: string;
  currency?: string;
}

/**
 * Global component for displaying monetary values with consistent formatting and coloring.
 */
const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  showSign = true,
  colorPositive = true,
  colorNegative = true,
  className,
  currency = '€'
}) => {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toFixed(2);

  const sign = isPositive ? '+' : isNegative ? '-' : '';
  const displaySign = showSign ? sign : '';

  const colorClass = cn(
    isPositive && colorPositive && "text-green-600 dark:text-green-400",
    isNegative && colorNegative && "text-red-600 dark:text-red-400"
  );

  return (
    <span className={cn("font-medium tabular-nums", colorClass, className)}>
      {displaySign}{currency}{absAmount}
    </span>
  );
};

export default MoneyDisplay;
