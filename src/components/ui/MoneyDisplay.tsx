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

const currencySymbols: Record<string, string> = {
  'EUR': '€',
  'USD': '$',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥',
  'KRW': '₩',
  'INR': '₹',
  'RUB': '₽',
  'TRY': '₺',
  'BRL': 'R$',
  'CAD': 'C$',
  'AUD': 'A$',
  'CHF': 'CHF',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'CZK': 'Kč',
  'HUF': 'Ft',
  'RON': 'lei',
  'BGN': 'лв',
  'ILS': '₪',
  'ZAR': 'R',
  'MXN': '$',
  'SGD': '$',
  'HKD': '$',
  'NZD': '$',
  'THB': '฿',
  'IDR': 'Rp',
  'MYR': 'RM',
  'PHP': '₱',
  'VND': '₫',
};

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
  currency,
  colored = true,
  useSignum = false
}) => {
  const { settings } = useSettingsStore();
  const decimalSeparator = settings.formatting?.decimalSeparator || 'dot';
  const activeCurrency = currency || settings.formatting?.currency || 'EUR';
  const symbol = currencySymbols[activeCurrency] || activeCurrency;

  const isPositive = amount > 0;
  const isNegative = amount < 0;
  
  let absAmount = Math.abs(amount).toFixed(2);
  if (decimalSeparator === 'comma') {
    absAmount = absAmount.replace('.', ',');
  }

  // If useSignum is true, we always show the sign if it's non-zero.
  // Otherwise, we respect showSign.
  const sign = isPositive ? '+' : isNegative ? '-' : '';
  const displaySign = useSignum ? (isPositive || isNegative ? sign : '') : (showSign ? sign : '');

  const colorClass = (colored || useSignum) ? cn(
    colorNeutral && "text-yellow",
    !colorNeutral && isPositive && colorPositive && "text-green",
    !colorNeutral && isNegative && colorNegative && "text-red"
  ) : "";

  return (
    <span className={cn("font-medium tabular-nums", colorClass, className)}>
      {displaySign}{symbol}{absAmount}
    </span>
  );
};

export default MoneyDisplay;
